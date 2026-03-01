import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectMongo } from '@/lib/mongo';
import { TmsAttemptModel, TmsQuestionModel, TmsStudentModel, TmsTestModel } from '@/lib/models/tms';
import { Answer, Attempt, Question, Test } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const sanitizeText = (value: unknown, max = 320) =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

const normalizeStudentId = (value: unknown) => sanitizeText(value, 320).toLowerCase();

const sanitizeNumber = (value: unknown, fallback = 0, min = Number.NEGATIVE_INFINITY) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, parsed);
};

const toIso = (value: unknown): string | null => {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(String(value));
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
};

const parseAttemptStatus = (value: unknown): Attempt['status'] => {
  if (value === 'auto_submitted' || value === 'in_progress') return value;
  return 'submitted';
};

const parseAttemptLimit = (value: unknown): Test['attemptLimit'] => {
  if (value === 'unlimited') return 'unlimited';
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 1;
  return Math.max(1, Math.floor(parsed));
};

const sanitizeStringArray = (value: unknown, max = 120) =>
  Array.isArray(value)
    ? value
        .map((item) => sanitizeText(item, max))
        .filter(Boolean)
    : [];

const toTest = (raw: any): Test => ({
  id: String(raw?._id || raw?.id || '').trim(),
  name: sanitizeText(raw?.name, 240),
  category: sanitizeText(raw?.category, 160),
  status:
    raw?.status === 'Published' || raw?.status === 'Scheduled' || raw?.status === 'Expired'
      ? raw.status
      : 'Draft',
  durationMin: Math.max(1, Math.floor(sanitizeNumber(raw?.durationMin, 60, 1))),
  totalMarks: sanitizeNumber(raw?.totalMarks, 0, 0),
  marksPerQuestion: sanitizeNumber(raw?.marksPerQuestion, 0, 0),
  negativeMarking: Boolean(raw?.negativeMarking),
  negativeMarksValue: sanitizeNumber(raw?.negativeMarksValue, 0, 0),
  sections: Array.isArray(raw?.sections) ? raw.sections : [],
  startAt: toIso(raw?.startAt),
  endAt: toIso(raw?.endAt),
  attemptLimit: parseAttemptLimit(raw?.attemptLimit),
  shuffleQuestions: Boolean(raw?.shuffleQuestions),
  shuffleOptions: Boolean(raw?.shuffleOptions),
  instructions: sanitizeText(raw?.instructions, 4000),
  allowedBatchIds: sanitizeStringArray(raw?.allowedBatchIds, 120),
  allowedCourseIds: sanitizeStringArray(raw?.allowedCourseIds, 120),
  isPaid: Boolean(raw?.isPaid),
  price: sanitizeNumber(raw?.price, 0, 0),
  isLocked: Boolean(raw?.isLocked),
  attemptsCount: Math.max(0, Math.floor(sanitizeNumber(raw?.attemptsCount, 0, 0))),
  questionIds: sanitizeStringArray(raw?.questionIds, 120),
});

const toQuestion = (raw: any): Question => ({
  id: String(raw?._id || raw?.id || '').trim(),
  type: raw?.type === 'Numeric' ? 'Numeric' : 'MCQ',
  text: sanitizeText(raw?.text, 1200),
  description: sanitizeText(raw?.description, 1200),
  imageUrl: sanitizeText(raw?.imageUrl, 2000),
  options: sanitizeStringArray(raw?.options, 400),
  correctAnswer: sanitizeText(raw?.correctAnswer, 400),
  explanation: sanitizeText(raw?.explanation, 2000),
  difficulty: raw?.difficulty === 'Medium' || raw?.difficulty === 'Hard' ? raw.difficulty : 'Easy',
  topic: sanitizeText(raw?.topic, 160),
  subtopic: sanitizeText(raw?.subtopic, 160),
  tags: sanitizeStringArray(raw?.tags, 80),
});

const toAnswer = (raw: any): Answer => ({
  questionId: sanitizeText(raw?.questionId, 120),
  selected: raw?.selected === null ? null : sanitizeText(raw?.selected, 400) || null,
  isMarked: Boolean(raw?.isMarked),
  timeSpentSec: Math.max(0, Math.floor(sanitizeNumber(raw?.timeSpentSec, 0, 0))),
});

const toAttempt = (raw: any): Attempt => ({
  id: String(raw?._id || raw?.id || '').trim(),
  testId: sanitizeText(raw?.testId, 120),
  studentId: normalizeStudentId(raw?.studentId),
  startedAt: toIso(raw?.startedAt) || new Date().toISOString(),
  submittedAt: toIso(raw?.submittedAt),
  timeTakenSec: Math.max(0, Math.floor(sanitizeNumber(raw?.timeTakenSec, 0, 0))),
  answers: Array.isArray(raw?.answers) ? raw.answers.map(toAnswer) : [],
  score: sanitizeNumber(raw?.score, 0),
  accuracy: sanitizeNumber(raw?.accuracy, 0, 0),
  status: parseAttemptStatus(raw?.status),
});

function evaluateAttempt(params: { test: Test; questions: Question[]; answers: Answer[] }) {
  const byQuestionId = new Map(params.questions.map((question) => [question.id, question]));
  let score = 0;
  let correct = 0;
  let wrong = 0;

  params.answers.forEach((answer) => {
    const question = byQuestionId.get(answer.questionId);
    if (!question) return;
    if (!answer.selected) return;
    if (String(answer.selected).trim() === String(question.correctAnswer).trim()) {
      correct += 1;
      score += params.test.marksPerQuestion;
    } else {
      wrong += 1;
      if (params.test.negativeMarking) {
        score -= params.test.negativeMarksValue;
      }
    }
  });

  const attempted = correct + wrong;
  const accuracy = attempted > 0 ? (correct / attempted) * 100 : 0;

  return {
    score,
    accuracy: Number(accuracy.toFixed(1)),
  };
}

export async function GET(request: Request) {
  try {
    await connectMongo();
    const url = new URL(request.url);
    const id = sanitizeText(url.searchParams.get('id'), 120);
    const testId = sanitizeText(url.searchParams.get('testId'), 120);
    const studentId = normalizeStudentId(url.searchParams.get('studentId'));

    if (id) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return NextResponse.json(null);
      }
      const attempt = await TmsAttemptModel.findById(id).lean();
      return NextResponse.json(attempt ? toAttempt(attempt) : null);
    }

    const query: Record<string, unknown> = {};
    if (testId) query.testId = testId;
    if (studentId) query.studentId = studentId;

    const attempts = await TmsAttemptModel.find(query).sort({ createdAt: -1 }).lean();
    return NextResponse.json(attempts.map(toAttempt));
  } catch (error) {
    console.error('[api/attempts] Failed to fetch attempts:', error);
    return NextResponse.json({ message: 'Failed to fetch attempts' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await connectMongo();
    const body = (await request.json()) as {
      testId?: string;
      studentId?: string;
      startedAt?: string;
      answers?: Answer[];
      timeTakenSec?: number;
      autoSubmitted?: boolean;
    };

    const testId = sanitizeText(body.testId, 120);
    const studentId = normalizeStudentId(body.studentId);
    if (!testId || !studentId) {
      return NextResponse.json({ message: 'testId and studentId are required.' }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(testId)) {
      return NextResponse.json({ message: 'Invalid test ID.' }, { status: 400 });
    }

    const testDoc = await TmsTestModel.findById(testId).lean();
    if (!testDoc) {
      return NextResponse.json({ message: 'Test not found.' }, { status: 404 });
    }
    const test = toTest(testDoc);

    const submittedAnswers = Array.isArray(body.answers) ? body.answers.map(toAnswer) : [];
    const questionDocs = await TmsQuestionModel.find({}).lean();
    const questionMap = new Map(questionDocs.map((doc) => [String(doc._id), toQuestion(doc)]));
    const questionPool = test.questionIds
      .map((questionId) => questionMap.get(questionId))
      .filter((item): item is Question => Boolean(item));

    const evaluation = evaluateAttempt({
      test,
      questions: questionPool,
      answers: submittedAnswers,
    });

    const startedAt = new Date(String(body.startedAt || new Date().toISOString()));
    const safeStartedAt = Number.isFinite(startedAt.getTime()) ? startedAt : new Date();

    const created = await TmsAttemptModel.create({
      testId: test.id,
      studentId,
      startedAt: safeStartedAt,
      submittedAt: new Date(),
      timeTakenSec: Math.max(0, Math.floor(sanitizeNumber(body.timeTakenSec, 0, 0))),
      answers: submittedAnswers,
      score: evaluation.score,
      accuracy: evaluation.accuracy,
      status: body.autoSubmitted ? 'auto_submitted' : 'submitted',
    });

    await TmsTestModel.updateOne({ _id: test.id }, { $inc: { attemptsCount: 1 } });

    if (studentId.includes('@')) {
      await TmsStudentModel.updateOne(
        { email: studentId },
        {
          $set: {
            email: studentId,
            updatedAt: new Date(),
          },
          $setOnInsert: {
            name: studentId.split('@')[0] || 'Student',
            createdAt: new Date(),
          },
        },
        { upsert: true }
      );
    }

    return NextResponse.json(toAttempt(created.toObject()), { status: 201 });
  } catch (error) {
    console.error('[api/attempts] Failed to create attempt:', error);
    return NextResponse.json({ message: 'Failed to submit attempt' }, { status: 500 });
  }
}

