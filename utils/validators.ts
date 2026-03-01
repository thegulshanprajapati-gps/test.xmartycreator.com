import { z } from 'zod';

export const loginSchema = z.object({
  role: z.enum(['ADMIN', 'STUDENT']),
  studentId: z.string().optional(),
});

export const testSchema = z.object({
  name: z.string().min(3, 'Test name is required'),
  category: z.string().min(2, 'Category is required'),
  durationMin: z.coerce.number().min(5),
  totalMarks: z.coerce.number().min(1),
  marksPerQuestion: z.coerce.number().min(1),
  negativeMarking: z.boolean(),
  negativeMarksValue: z.coerce.number().min(0),
  startAt: z.string().optional(),
  endAt: z.string().optional(),
  attemptLimit: z.union([z.literal('unlimited'), z.coerce.number().min(1)]),
  shuffleQuestions: z.boolean(),
  shuffleOptions: z.boolean(),
  instructions: z.string().min(10),
  isPaid: z.boolean(),
  price: z.coerce.number().min(0),
});

export const questionSchema = z.object({
  type: z.enum(['MCQ', 'Numeric']),
  text: z.string().min(5),
  description: z.string().max(600).optional(),
  optionA: z.string().optional(),
  optionB: z.string().optional(),
  optionC: z.string().optional(),
  optionD: z.string().optional(),
  correctAnswer: z.string().min(1),
  explanation: z.string().min(3),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']),
  topic: z.string().min(2),
  subtopic: z.string().min(2),
  tags: z.string().optional(),
});

export const batchSchema = z.object({
  name: z.string().min(3),
  startAt: z.string().min(1),
  endAt: z.string().min(1),
});

export const courseSchema = z.object({
  name: z.string().min(3),
  description: z.string().min(10),
  validityDays: z.coerce.number().min(1),
  price: z.coerce.number().min(0),
});

export const profileSchema = z.object({
  name: z.string().min(3),
  mobile: z.string().min(10),
  email: z.string().email(),
});
