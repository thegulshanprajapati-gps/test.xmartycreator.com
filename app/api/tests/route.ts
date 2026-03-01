import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectMongo } from '@/lib/mongo';
import { TmsBatchModel, TmsTestModel } from '@/lib/models/tms';
import { Test, TestSection } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const hasOwn = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key);

const sanitizeText = (value: unknown, max = 300) =>
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

const sanitizeNumber = (value: unknown, fallback = 0, min = Number.NEGATIVE_INFINITY) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, parsed);
};

const sanitizeBoolean = (value: unknown, fallback = false) =>
  typeof value === 'boolean' ? value : fallback;

const toIsoString = (value: unknown): string | null => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
};

const toDateOrNull = (value: unknown): Date | null => {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isFinite(date.getTime()) ? date : null;
};

const parseAttemptLimit = (value: unknown): number | 'unlimited' => {
  if (value === 'unlimited') return 'unlimited';
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 1;
  return Math.max(1, Math.floor(parsed));
};

const sanitizeSections = (value: unknown): TestSection[] => {
  if (!Array.isArray(value)) return [];
  return value.map((raw, index) => {
    const section = (raw || {}) as Partial<TestSection>;
    const id = sanitizeText(section.id, 80) || `sec-${index + 1}`;
    return {
      id,
      name: sanitizeText(section.name, 160) || `Section ${index + 1}`,
      questionCount: Math.max(0, Math.floor(sanitizeNumber(section.questionCount, 0, 0))),
      sectionMarks: sanitizeNumber(section.sectionMarks, 0, 0),
      sectionTimerMin: Math.max(0, Math.floor(sanitizeNumber(section.sectionTimerMin, 0, 0))),
      questionIds: sanitizeStringArray(section.questionIds, 120),
    };
  });
};

const normalizeStatus = (value: unknown): Test['status'] => {
  if (value === 'Published' || value === 'Scheduled' || value === 'Expired') {
    return value;
  }
  return 'Draft';
};

const toTest = (raw: any): Test => {
  const id = String(raw?._id || raw?.id || '').trim();
  return {
    id,
    name: sanitizeText(raw?.name, 240),
    category: sanitizeText(raw?.category, 160),
    status: normalizeStatus(raw?.status),
    durationMin: Math.max(1, Math.floor(sanitizeNumber(raw?.durationMin, 60, 1))),
    totalMarks: sanitizeNumber(raw?.totalMarks, 0, 0),
    marksPerQuestion: sanitizeNumber(raw?.marksPerQuestion, 0, 0),
    negativeMarking: sanitizeBoolean(raw?.negativeMarking, false),
    negativeMarksValue: sanitizeNumber(raw?.negativeMarksValue, 0, 0),
    sections: sanitizeSections(raw?.sections),
    startAt: toIsoString(raw?.startAt),
    endAt: toIsoString(raw?.endAt),
    attemptLimit: parseAttemptLimit(raw?.attemptLimit),
    shuffleQuestions: sanitizeBoolean(raw?.shuffleQuestions, true),
    shuffleOptions: sanitizeBoolean(raw?.shuffleOptions, true),
    instructions: sanitizeText(raw?.instructions, 4000),
    allowedBatchIds: sanitizeStringArray(raw?.allowedBatchIds, 120),
    allowedCourseIds: sanitizeStringArray(raw?.allowedCourseIds, 120),
    isPaid: sanitizeBoolean(raw?.isPaid, false),
    price: sanitizeNumber(raw?.price, 0, 0),
    isLocked: sanitizeBoolean(raw?.isLocked, false),
    attemptsCount: Math.max(0, Math.floor(sanitizeNumber(raw?.attemptsCount, 0, 0))),
    questionIds: sanitizeStringArray(raw?.questionIds, 120),
  };
};

function mergeAllowedBatchIds(test: Test, linkedBatchIds: string[]): Test {
  if (linkedBatchIds.length === 0) return test;
  const merged = Array.from(new Set([...test.allowedBatchIds, ...linkedBatchIds]));
  return {
    ...test,
    allowedBatchIds: merged,
  };
}

function buildBatchAssignmentsByTest(batchDocs: any[]) {
  const mapping = new Map<string, Set<string>>();

  batchDocs.forEach((raw) => {
    const batchId = sanitizeId(raw?._id || raw?.id, 120);
    if (!batchId) return;
    const testIds = sanitizeStringArray(raw?.testIds, 120);
    testIds.forEach((testId) => {
      if (!mapping.has(testId)) {
        mapping.set(testId, new Set<string>());
      }
      mapping.get(testId)?.add(batchId);
    });
  });

  return new Map(
    Array.from(mapping.entries()).map(([testId, batchIds]) => [testId, Array.from(batchIds)])
  );
}

function buildTestPayload(payload: Partial<Test>) {
  return {
    name: sanitizeText(payload.name, 240),
    category: sanitizeText(payload.category, 160),
    status: normalizeStatus(payload.status),
    durationMin: Math.max(1, Math.floor(sanitizeNumber(payload.durationMin, 60, 1))),
    totalMarks: sanitizeNumber(payload.totalMarks, 0, 0),
    marksPerQuestion: sanitizeNumber(payload.marksPerQuestion, 0, 0),
    negativeMarking: sanitizeBoolean(payload.negativeMarking, false),
    negativeMarksValue: sanitizeNumber(payload.negativeMarksValue, 0, 0),
    sections: sanitizeSections(payload.sections),
    startAt: toDateOrNull(payload.startAt),
    endAt: toDateOrNull(payload.endAt),
    attemptLimit: parseAttemptLimit(payload.attemptLimit),
    shuffleQuestions: sanitizeBoolean(payload.shuffleQuestions, true),
    shuffleOptions: sanitizeBoolean(payload.shuffleOptions, true),
    instructions: sanitizeText(payload.instructions, 4000),
    allowedBatchIds: sanitizeStringArray(payload.allowedBatchIds, 120),
    allowedCourseIds: sanitizeStringArray(payload.allowedCourseIds, 120),
    isPaid: sanitizeBoolean(payload.isPaid, false),
    price: sanitizeNumber(payload.price, 0, 0),
    isLocked: sanitizeBoolean(payload.isLocked, false),
    attemptsCount: Math.max(0, Math.floor(sanitizeNumber(payload.attemptsCount, 0, 0))),
    questionIds: sanitizeStringArray(payload.questionIds, 120),
  };
}

function buildTestPatch(payload: Partial<Test>) {
  const patch: Record<string, unknown> = {};
  if (hasOwn(payload, 'name')) patch.name = sanitizeText(payload.name, 240);
  if (hasOwn(payload, 'category')) patch.category = sanitizeText(payload.category, 160);
  if (hasOwn(payload, 'status')) patch.status = normalizeStatus(payload.status);
  if (hasOwn(payload, 'durationMin'))
    patch.durationMin = Math.max(1, Math.floor(sanitizeNumber(payload.durationMin, 60, 1)));
  if (hasOwn(payload, 'totalMarks')) patch.totalMarks = sanitizeNumber(payload.totalMarks, 0, 0);
  if (hasOwn(payload, 'marksPerQuestion'))
    patch.marksPerQuestion = sanitizeNumber(payload.marksPerQuestion, 0, 0);
  if (hasOwn(payload, 'negativeMarking'))
    patch.negativeMarking = sanitizeBoolean(payload.negativeMarking, false);
  if (hasOwn(payload, 'negativeMarksValue'))
    patch.negativeMarksValue = sanitizeNumber(payload.negativeMarksValue, 0, 0);
  if (hasOwn(payload, 'sections')) patch.sections = sanitizeSections(payload.sections);
  if (hasOwn(payload, 'startAt')) patch.startAt = toDateOrNull(payload.startAt);
  if (hasOwn(payload, 'endAt')) patch.endAt = toDateOrNull(payload.endAt);
  if (hasOwn(payload, 'attemptLimit')) patch.attemptLimit = parseAttemptLimit(payload.attemptLimit);
  if (hasOwn(payload, 'shuffleQuestions'))
    patch.shuffleQuestions = sanitizeBoolean(payload.shuffleQuestions, true);
  if (hasOwn(payload, 'shuffleOptions'))
    patch.shuffleOptions = sanitizeBoolean(payload.shuffleOptions, true);
  if (hasOwn(payload, 'instructions'))
    patch.instructions = sanitizeText(payload.instructions, 4000);
  if (hasOwn(payload, 'allowedBatchIds'))
    patch.allowedBatchIds = sanitizeStringArray(payload.allowedBatchIds, 120);
  if (hasOwn(payload, 'allowedCourseIds'))
    patch.allowedCourseIds = sanitizeStringArray(payload.allowedCourseIds, 120);
  if (hasOwn(payload, 'isPaid')) patch.isPaid = sanitizeBoolean(payload.isPaid, false);
  if (hasOwn(payload, 'price')) patch.price = sanitizeNumber(payload.price, 0, 0);
  if (hasOwn(payload, 'isLocked')) patch.isLocked = sanitizeBoolean(payload.isLocked, false);
  if (hasOwn(payload, 'attemptsCount'))
    patch.attemptsCount = Math.max(0, Math.floor(sanitizeNumber(payload.attemptsCount, 0, 0)));
  if (hasOwn(payload, 'questionIds'))
    patch.questionIds = sanitizeStringArray(payload.questionIds, 120);
  return patch;
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
      const [testDoc, batchDocs] = await Promise.all([
        TmsTestModel.findById(id).lean(),
        TmsBatchModel.find({ testIds: { $exists: true, $ne: [] } })
          .select({ _id: 1, testIds: 1 })
          .lean(),
      ]);
      if (!testDoc) return NextResponse.json(null);
      const byTest = buildBatchAssignmentsByTest(batchDocs);
      const normalized = toTest(testDoc);
      return NextResponse.json(
        mergeAllowedBatchIds(normalized, byTest.get(normalized.id) || [])
      );
    }

    const status = sanitizeText(url.searchParams.get('status'), 20);
    const batchId = sanitizeText(url.searchParams.get('batchId'), 120);
    const courseId = sanitizeText(url.searchParams.get('courseId'), 120);
    const paid = sanitizeText(url.searchParams.get('paid'), 12);
    const queryText = sanitizeText(url.searchParams.get('query'), 200).toLowerCase();

    const [docs, batchDocs] = await Promise.all([
      TmsTestModel.find({}).sort({ createdAt: -1 }).lean(),
      TmsBatchModel.find({ testIds: { $exists: true, $ne: [] } })
        .select({ _id: 1, testIds: 1 })
        .lean(),
    ]);

    const byTest = buildBatchAssignmentsByTest(batchDocs);
    let tests = docs.map((doc) => {
      const normalized = toTest(doc);
      return mergeAllowedBatchIds(normalized, byTest.get(normalized.id) || []);
    });

    if (status && status !== 'all') {
      tests = tests.filter((test) => test.status === status);
    }
    if (batchId && batchId !== 'all') {
      tests = tests.filter((test) => test.allowedBatchIds.includes(batchId));
    }
    if (courseId && courseId !== 'all') {
      tests = tests.filter((test) => test.allowedCourseIds.includes(courseId));
    }
    if (paid && paid !== 'all') {
      tests = tests.filter((test) => (paid === 'paid' ? test.isPaid : !test.isPaid));
    }
    if (queryText) {
      tests = tests.filter(
        (test) =>
          test.name.toLowerCase().includes(queryText) ||
          test.category.toLowerCase().includes(queryText) ||
          test.instructions.toLowerCase().includes(queryText)
      );
    }

    return NextResponse.json(tests);
  } catch (error) {
    console.error('[api/tests] Failed to fetch tests:', error);
    return NextResponse.json({ message: 'Failed to fetch tests' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await connectMongo();
    const body = (await request.json()) as Partial<Test>;
    const payload = buildTestPayload(body);
    if (!payload.name) {
      return NextResponse.json({ message: 'Test name is required.' }, { status: 400 });
    }

    const created = await TmsTestModel.create(payload);
    const lean = created.toObject();
    return NextResponse.json(toTest(lean), { status: 201 });
  } catch (error) {
    console.error('[api/tests] Failed to create test:', error);
    return NextResponse.json({ message: 'Failed to create test' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await connectMongo();
    const body = (await request.json()) as
      | { id?: string; patch?: Partial<Test> }
      | Partial<Test>;

    const id =
      sanitizeText((body as { id?: string }).id, 120) ||
      sanitizeText(new URL(request.url).searchParams.get('id'), 120);

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: 'Valid test ID is required.' }, { status: 400 });
    }

    const patchSource =
      typeof (body as { patch?: Partial<Test> }).patch === 'object' &&
      (body as { patch?: Partial<Test> }).patch !== null
        ? ((body as { patch?: Partial<Test> }).patch as Partial<Test>)
        : (body as Partial<Test>);

    const patch = buildTestPatch(patchSource);
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ message: 'No valid fields to update.' }, { status: 400 });
    }

    const updated = await TmsTestModel.findByIdAndUpdate(id, { $set: patch }, { new: true }).lean();
    if (!updated) {
      return NextResponse.json({ message: 'Test not found.' }, { status: 404 });
    }
    return NextResponse.json(toTest(updated));
  } catch (error) {
    console.error('[api/tests] Failed to update test:', error);
    return NextResponse.json({ message: 'Failed to update test' }, { status: 500 });
  }
}
