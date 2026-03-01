import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectMongo } from '@/lib/mongo';
import { TmsBatchModel, TmsEnrollmentModel, TmsTestModel } from '@/lib/models/tms';
import { Batch } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const hasOwn = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key);

const sanitizeText = (value: unknown, max = 240) =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

const sanitizeId = (value: unknown, max = 120) => {
  if (typeof value === 'string') return value.trim().slice(0, max);
  if (typeof value === 'number' || typeof value === 'bigint') return String(value).slice(0, max);
  if (value && typeof value === 'object' && 'toString' in value) {
    const asString = String((value as { toString: () => string }).toString()).trim();
    if (asString && asString !== '[object Object]') {
      return asString.slice(0, max);
    }
  }
  return '';
};

const sanitizeStringArray = (value: unknown, max = 120) =>
  Array.isArray(value)
    ? value
        .map((item) => sanitizeId(item, max))
        .filter(Boolean)
    : [];

const toDate = (value: unknown, fallback = new Date()): Date => {
  const parsed = new Date(String(value || ''));
  return Number.isFinite(parsed.getTime()) ? parsed : fallback;
};

const toIso = (value: unknown) => {
  if (!value) return new Date().toISOString();
  const parsed = value instanceof Date ? value : new Date(String(value));
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : new Date().toISOString();
};

const toBatch = (raw: any): Batch => ({
  id: String(raw?._id || raw?.id || '').trim(),
  name: sanitizeText(raw?.name, 240),
  startAt: toIso(raw?.startAt),
  endAt: toIso(raw?.endAt),
  studentIds: sanitizeStringArray(raw?.studentIds, 120),
  testIds: sanitizeStringArray(raw?.testIds, 120),
});

function mergeBatchTestIds(batch: Batch, linkedTestIds: string[]): Batch {
  if (linkedTestIds.length === 0) return batch;
  return {
    ...batch,
    testIds: Array.from(new Set([...batch.testIds, ...linkedTestIds])),
  };
}

function buildTestAssignmentsByBatch(testDocs: any[]) {
  const mapping = new Map<string, Set<string>>();

  testDocs.forEach((raw) => {
    const testId = sanitizeId(raw?._id || raw?.id, 120);
    if (!testId) return;
    const batchIds = sanitizeStringArray(raw?.allowedBatchIds, 120);
    batchIds.forEach((batchId) => {
      if (!mapping.has(batchId)) {
        mapping.set(batchId, new Set<string>());
      }
      mapping.get(batchId)?.add(testId);
    });
  });

  return new Map(
    Array.from(mapping.entries()).map(([batchId, testIds]) => [batchId, Array.from(testIds)])
  );
}

async function syncBatchEnrollments(
  batchId: string,
  previousStudentIds: string[],
  nextStudentIds: string[]
) {
  const previous = new Set(previousStudentIds);
  const next = new Set(nextStudentIds);

  const toAssign = nextStudentIds.filter((studentId) => studentId && !previous.has(studentId));
  const toUnassign = previousStudentIds.filter((studentId) => studentId && !next.has(studentId));

  if (toAssign.length > 0) {
    await Promise.all(
      toAssign.map((studentId) =>
        TmsEnrollmentModel.updateOne(
          { studentId: studentId.toLowerCase() },
          {
            $set: { studentId: studentId.toLowerCase(), batchId },
            $setOnInsert: { createdAt: new Date(), status: 'active', courseIds: [] },
          },
          { upsert: true }
        )
      )
    );
  }

  if (toUnassign.length > 0) {
    await TmsEnrollmentModel.updateMany(
      { studentId: { $in: toUnassign.map((id) => id.toLowerCase()) }, batchId },
      { $set: { batchId: null } }
    );
  }
}

export async function GET(request: Request) {
  try {
    await connectMongo();
    const url = new URL(request.url);
    const id = sanitizeText(url.searchParams.get('id'), 120);

    if (id) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return NextResponse.json(null);
      }
      const [batchDoc, testDocs] = await Promise.all([
        TmsBatchModel.findById(id).lean(),
        TmsTestModel.find({ allowedBatchIds: { $exists: true, $ne: [] } })
          .select({ _id: 1, allowedBatchIds: 1 })
          .lean(),
      ]);

      if (!batchDoc) return NextResponse.json(null);

      const byBatch = buildTestAssignmentsByBatch(testDocs);
      const normalized = toBatch(batchDoc);
      return NextResponse.json(
        mergeBatchTestIds(normalized, byBatch.get(normalized.id) || [])
      );
    }

    const [batchDocs, testDocs] = await Promise.all([
      TmsBatchModel.find({}).sort({ startAt: -1 }).lean(),
      TmsTestModel.find({ allowedBatchIds: { $exists: true, $ne: [] } })
        .select({ _id: 1, allowedBatchIds: 1 })
        .lean(),
    ]);

    const byBatch = buildTestAssignmentsByBatch(testDocs);
    return NextResponse.json(
      batchDocs.map((doc) => {
        const normalized = toBatch(doc);
        return mergeBatchTestIds(normalized, byBatch.get(normalized.id) || []);
      })
    );
  } catch (error) {
    console.error('[api/batches] Failed to fetch batches:', error);
    return NextResponse.json({ message: 'Failed to fetch batches' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await connectMongo();
    const body = (await request.json()) as Partial<Batch>;

    const payload = {
      name: sanitizeText(body.name, 240),
      startAt: toDate(body.startAt),
      endAt: toDate(body.endAt),
      studentIds: sanitizeStringArray(body.studentIds, 120),
      testIds: sanitizeStringArray(body.testIds, 120),
    };

    if (!payload.name) {
      return NextResponse.json({ message: 'Batch name is required.' }, { status: 400 });
    }

    const created = await TmsBatchModel.create(payload);
    if (payload.studentIds.length > 0) {
      await syncBatchEnrollments(
        String(created._id),
        [],
        payload.studentIds.map((id) => id.toLowerCase())
      );
    }
    return NextResponse.json(toBatch(created.toObject()), { status: 201 });
  } catch (error) {
    console.error('[api/batches] Failed to create batch:', error);
    return NextResponse.json({ message: 'Failed to create batch' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await connectMongo();
    const body = (await request.json()) as
      | { id?: string; patch?: Partial<Batch> }
      | Partial<Batch>;
    const id =
      sanitizeText((body as { id?: string }).id, 120) ||
      sanitizeText(new URL(request.url).searchParams.get('id'), 120);

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: 'Valid batch ID is required.' }, { status: 400 });
    }

    const source =
      typeof (body as { patch?: Partial<Batch> }).patch === 'object' &&
      (body as { patch?: Partial<Batch> }).patch !== null
        ? ((body as { patch?: Partial<Batch> }).patch as Partial<Batch>)
        : (body as Partial<Batch>);

    const patch: Record<string, unknown> = {};
    if (hasOwn(source, 'name')) patch.name = sanitizeText(source.name, 240);
    if (hasOwn(source, 'startAt')) patch.startAt = toDate(source.startAt);
    if (hasOwn(source, 'endAt')) patch.endAt = toDate(source.endAt);
    if (hasOwn(source, 'studentIds')) patch.studentIds = sanitizeStringArray(source.studentIds, 120);
    if (hasOwn(source, 'testIds')) patch.testIds = sanitizeStringArray(source.testIds, 120);

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ message: 'No valid fields to update.' }, { status: 400 });
    }

    const previous = await TmsBatchModel.findById(id).lean();
    const updated = await TmsBatchModel.findByIdAndUpdate(id, { $set: patch }, { new: true }).lean();
    if (!updated) {
      return NextResponse.json({ message: 'Batch not found.' }, { status: 404 });
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'studentIds')) {
      await syncBatchEnrollments(
        id,
        sanitizeStringArray(previous?.studentIds, 120).map((entry) => entry.toLowerCase()),
        sanitizeStringArray(updated.studentIds, 120).map((entry) => entry.toLowerCase())
      );
    }
    return NextResponse.json(toBatch(updated));
  } catch (error) {
    console.error('[api/batches] Failed to update batch:', error);
    return NextResponse.json({ message: 'Failed to update batch' }, { status: 500 });
  }
}
