import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectMongo } from '@/lib/mongo';
import { TmsQuestionModel } from '@/lib/models/tms';
import { Question } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const sanitizeText = (value: unknown, max = 500) =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

const sanitizeStringArray = (value: unknown, max = 120) =>
  Array.isArray(value)
    ? value
        .map((item) => sanitizeText(item, max))
        .filter(Boolean)
    : [];

const normalizeQuestionType = (value: unknown): Question['type'] =>
  value === 'Numeric' ? 'Numeric' : 'MCQ';

const normalizeDifficulty = (value: unknown): Question['difficulty'] => {
  if (value === 'Medium' || value === 'Hard') return value;
  return 'Easy';
};

const toQuestion = (raw: any): Question => ({
  id: String(raw?._id || raw?.id || '').trim(),
  type: normalizeQuestionType(raw?.type),
  text: sanitizeText(raw?.text, 1200),
  description: sanitizeText(raw?.description, 1200),
  imageUrl: sanitizeText(raw?.imageUrl, 2000),
  options: sanitizeStringArray(raw?.options, 400),
  correctAnswer: sanitizeText(raw?.correctAnswer, 400),
  explanation: sanitizeText(raw?.explanation, 2000),
  difficulty: normalizeDifficulty(raw?.difficulty),
  topic: sanitizeText(raw?.topic, 160),
  subtopic: sanitizeText(raw?.subtopic, 160),
  tags: sanitizeStringArray(raw?.tags, 80),
});

export async function GET(request: Request) {
  try {
    await connectMongo();
    const url = new URL(request.url);
    const id = sanitizeText(url.searchParams.get('id'), 120);

    if (id) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return NextResponse.json(null);
      }
      const question = await TmsQuestionModel.findById(id).lean();
      return NextResponse.json(question ? toQuestion(question) : null);
    }

    const queryText = sanitizeText(url.searchParams.get('query'), 200).toLowerCase();
    const docs = await TmsQuestionModel.find({}).sort({ createdAt: -1 }).lean();
    let questions = docs.map(toQuestion);

    if (queryText) {
      questions = questions.filter(
        (question) =>
          question.text.toLowerCase().includes(queryText) ||
          question.topic.toLowerCase().includes(queryText) ||
          question.subtopic.toLowerCase().includes(queryText)
      );
    }

    return NextResponse.json(questions);
  } catch (error) {
    console.error('[api/questions] Failed to fetch questions:', error);
    return NextResponse.json({ message: 'Failed to fetch questions' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await connectMongo();
    const body = (await request.json()) as Partial<Question>;

    const payload = {
      type: normalizeQuestionType(body.type),
      text: sanitizeText(body.text, 1200),
      description: sanitizeText(body.description, 1200),
      imageUrl: sanitizeText(body.imageUrl, 2000),
      options: sanitizeStringArray(body.options, 400),
      correctAnswer: sanitizeText(body.correctAnswer, 400),
      explanation: sanitizeText(body.explanation, 2000),
      difficulty: normalizeDifficulty(body.difficulty),
      topic: sanitizeText(body.topic, 160),
      subtopic: sanitizeText(body.subtopic, 160),
      tags: sanitizeStringArray(body.tags, 80),
    };

    if (!payload.text || !payload.correctAnswer) {
      return NextResponse.json(
        { message: 'Question text and correct answer are required.' },
        { status: 400 }
      );
    }

    const created = await TmsQuestionModel.create(payload);
    return NextResponse.json(toQuestion(created.toObject()), { status: 201 });
  } catch (error) {
    console.error('[api/questions] Failed to create question:', error);
    return NextResponse.json({ message: 'Failed to create question' }, { status: 500 });
  }
}

