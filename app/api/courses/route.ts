import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongo';
import { MainCourseModel, TmsCourseLinkModel } from '@/lib/models/tms';
import { Course } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const sanitizeText = (value: unknown, max = 320) =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

const sanitizeNumber = (value: unknown, fallback = 0, min = Number.NEGATIVE_INFINITY) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, parsed);
};

const sanitizeStringArray = (value: unknown, max = 120) =>
  Array.isArray(value)
    ? value
        .map((item) => sanitizeText(item, max))
        .filter(Boolean)
    : [];

const deriveValidityDays = (rawDuration: unknown) => {
  if (typeof rawDuration !== 'string') return 30;
  const match = rawDuration.match(/\d+/);
  if (!match) return 30;
  return Math.max(1, Number(match[0]));
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);

const normalizeCourse = (raw: any): Course | null => {
  const id = sanitizeText(raw?._id || raw?.id || raw?.slug, 120);
  if (!id) return null;

  const title = sanitizeText(raw?.title || raw?.name || raw?.slug || id, 240);
  const description = sanitizeText(
    raw?.shortDescription || raw?.fullDescription || raw?.description || title,
    2000
  );
  const validityDays = Math.max(
    1,
    Math.floor(
      sanitizeNumber(raw?.validityDays, deriveValidityDays(raw?.duration), 1)
    )
  );
  const price = Math.max(0, sanitizeNumber(raw?.price, 0, 0));

  return {
    id,
    name: title,
    description: description || title,
    validityDays,
    price,
    testIds: [],
  };
};

async function mergeCourseLinks(courses: Course[]) {
  if (courses.length === 0) return courses;
  const links = await TmsCourseLinkModel.find({
    courseId: { $in: courses.map((course) => course.id) },
  }).lean();
  const map = new Map(
    links.map((link) => [sanitizeText(link.courseId, 120), sanitizeStringArray(link.testIds, 120)])
  );
  return courses.map((course) => ({
    ...course,
    testIds: map.get(course.id) || [],
  }));
}

async function makeUniqueSlug(baseSlug: string) {
  const initial = baseSlug || `course-${Date.now()}`;
  let slug = initial;
  let index = 1;
  while (await MainCourseModel.exists({ slug })) {
    slug = `${initial}-${index}`;
    index += 1;
  }
  return slug;
}

function hasCourseFieldPatch(patch: Partial<Course>) {
  return (
    Object.prototype.hasOwnProperty.call(patch, 'name') ||
    Object.prototype.hasOwnProperty.call(patch, 'description') ||
    Object.prototype.hasOwnProperty.call(patch, 'price') ||
    Object.prototype.hasOwnProperty.call(patch, 'validityDays')
  );
}

export async function GET(request: Request) {
  try {
    await connectMongo();
    const id = sanitizeText(new URL(request.url).searchParams.get('id'), 120);
    if (id && !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(null);
    }

    const query = {
      $or: [{ contentType: 'course' }, { contentType: { $exists: false } }, { contentType: null }],
    };
    const docs = id
      ? await MainCourseModel.find({ ...query, _id: id }).lean()
      : await MainCourseModel.find(query).sort({ createdAt: -1 }).lean();

    const courses = docs
      .map((doc) => normalizeCourse(doc))
      .filter((course): course is Course => Boolean(course));
    const merged = await mergeCourseLinks(courses);

    if (id) {
      return NextResponse.json(merged[0] || null);
    }
    return NextResponse.json(merged);
  } catch (error) {
    console.error('[api/courses] Failed to fetch courses:', error);
    return NextResponse.json({ message: 'Failed to fetch courses.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await connectMongo();
    const body = (await request.json()) as Partial<Course>;

    const name = sanitizeText(body.name, 240);
    const description = sanitizeText(body.description, 2000);
    const validityDays = Math.max(1, Math.floor(sanitizeNumber(body.validityDays, 30, 1)));
    const price = Math.max(0, sanitizeNumber(body.price, 0, 0));

    if (!name) {
      return NextResponse.json({ message: 'Course name is required.' }, { status: 400 });
    }

    const slug = await makeUniqueSlug(slugify(name) || `course-${Date.now()}`);
    const created = await MainCourseModel.create({
      title: name,
      slug,
      shortDescription: description || name,
      fullDescription: description || name,
      duration: `${validityDays} days`,
      validityDays,
      price,
      contentType: 'course',
    });

    await TmsCourseLinkModel.updateOne(
      { courseId: String(created._id) },
      { $set: { courseId: String(created._id), testIds: [] } },
      { upsert: true }
    );

    const normalized = normalizeCourse(created.toObject());
    if (!normalized) {
      return NextResponse.json({ message: 'Invalid course payload.' }, { status: 500 });
    }
    return NextResponse.json({ ...normalized, testIds: [] }, { status: 201 });
  } catch (error) {
    console.error('[api/courses] Failed to create course:', error);
    return NextResponse.json({ message: 'Failed to create course.' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await connectMongo();
    const body = (await request.json()) as
      | { id?: string; patch?: Partial<Course> }
      | Partial<Course>;
    const id = sanitizeText(
      (body as { id?: string }).id || new URL(request.url).searchParams.get('id'),
      120
    );
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: 'Valid course ID is required.' }, { status: 400 });
    }

    const source =
      typeof (body as { patch?: Partial<Course> }).patch === 'object' &&
      (body as { patch?: Partial<Course> }).patch !== null
        ? ((body as { patch?: Partial<Course> }).patch as Partial<Course>)
        : (body as Partial<Course>);

    const patch: Partial<Course> = {};
    if (Object.prototype.hasOwnProperty.call(source, 'name')) {
      patch.name = sanitizeText(source.name, 240);
    }
    if (Object.prototype.hasOwnProperty.call(source, 'description')) {
      patch.description = sanitizeText(source.description, 2000);
    }
    if (Object.prototype.hasOwnProperty.call(source, 'price')) {
      patch.price = Math.max(0, sanitizeNumber(source.price, 0, 0));
    }
    if (Object.prototype.hasOwnProperty.call(source, 'validityDays')) {
      patch.validityDays = Math.max(1, Math.floor(sanitizeNumber(source.validityDays, 30, 1)));
    }
    if (Object.prototype.hasOwnProperty.call(source, 'testIds')) {
      patch.testIds = sanitizeStringArray(source.testIds, 120);
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ message: 'No valid fields to update.' }, { status: 400 });
    }

    if (Object.prototype.hasOwnProperty.call(patch, 'testIds')) {
      await TmsCourseLinkModel.updateOne(
        { courseId: id },
        { $set: { courseId: id, testIds: patch.testIds || [] } },
        { upsert: true }
      );
    }

    if (hasCourseFieldPatch(patch)) {
      const updatePayload: Record<string, unknown> = {};
      if (Object.prototype.hasOwnProperty.call(patch, 'name')) {
        updatePayload.title = patch.name;
      }
      if (Object.prototype.hasOwnProperty.call(patch, 'description')) {
        updatePayload.shortDescription = patch.description;
        updatePayload.fullDescription = patch.description;
      }
      if (Object.prototype.hasOwnProperty.call(patch, 'price')) {
        updatePayload.price = patch.price;
      }
      if (Object.prototype.hasOwnProperty.call(patch, 'validityDays')) {
        updatePayload.validityDays = patch.validityDays;
        updatePayload.duration = `${patch.validityDays} days`;
      }

      await MainCourseModel.updateOne({ _id: id }, { $set: updatePayload });
    }

    const [courseDoc, linkDoc] = await Promise.all([
      MainCourseModel.findById(id).lean(),
      TmsCourseLinkModel.findOne({ courseId: id }).lean(),
    ]);
    if (!courseDoc) return NextResponse.json(null);

    const normalized = normalizeCourse(courseDoc);
    if (!normalized) return NextResponse.json(null);

    return NextResponse.json({
      ...normalized,
      testIds: sanitizeStringArray(linkDoc?.testIds, 120),
    });
  } catch (error) {
    console.error('[api/courses] Failed to update course:', error);
    return NextResponse.json({ message: 'Failed to update course.' }, { status: 500 });
  }
}
