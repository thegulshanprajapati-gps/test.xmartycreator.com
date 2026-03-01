import mongoose, { Model, Schema } from 'mongoose';

type TmsCourseLink = {
  courseId: string;
  testIds: string[];
  updatedAt?: Date;
};

type MainCourseDoc = {
  title: string;
  slug: string;
  contentType?: 'course' | 'test';
  shortDescription?: string;
  fullDescription?: string;
  duration?: string;
  validityDays?: number;
  price?: number;
};

type TmsBatch = {
  name: string;
  startAt: Date;
  endAt: Date;
  studentIds: string[];
  testIds: string[];
};

type TmsEnrollment = {
  studentId: string;
  batchId: string | null;
  courseIds: string[];
  testIds: string[];
  status: 'active' | 'expired';
};

type TmsQuestion = {
  type: 'MCQ' | 'Numeric';
  text: string;
  description?: string;
  imageUrl?: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  topic: string;
  subtopic: string;
  tags: string[];
};

type TmsTestSection = {
  id: string;
  name: string;
  questionCount: number;
  sectionMarks: number;
  sectionTimerMin?: number;
  questionIds: string[];
};

type TmsTest = {
  name: string;
  category: string;
  status: 'Draft' | 'Published' | 'Scheduled' | 'Expired';
  durationMin: number;
  totalMarks: number;
  marksPerQuestion: number;
  negativeMarking: boolean;
  negativeMarksValue: number;
  sections: TmsTestSection[];
  startAt: Date | null;
  endAt: Date | null;
  attemptLimit: number | 'unlimited';
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  instructions: string;
  allowedBatchIds: string[];
  allowedCourseIds: string[];
  isPaid: boolean;
  price: number;
  isLocked: boolean;
  attemptsCount: number;
  questionIds: string[];
};

type TmsAttemptAnswer = {
  questionId: string;
  selected: string | null;
  isMarked: boolean;
  timeSpentSec: number;
};

type TmsAttempt = {
  testId: string;
  studentId: string;
  startedAt: Date;
  submittedAt: Date | null;
  timeTakenSec: number;
  answers: TmsAttemptAnswer[];
  score: number;
  accuracy: number;
  status: 'submitted' | 'auto_submitted' | 'in_progress';
};

type TmsStudent = {
  email: string;
  name?: string;
  mobile?: string;
  status?: 'active' | 'inactive';
  isSuspended?: boolean;
};

const TestSectionSchema = new Schema<TmsTestSection>(
  {
    id: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    questionCount: { type: Number, default: 0, min: 0 },
    sectionMarks: { type: Number, default: 0, min: 0 },
    sectionTimerMin: { type: Number, default: 0, min: 0 },
    questionIds: { type: [String], default: [] },
  },
  { _id: false }
);

const TestSchema = new Schema<TmsTest>(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, default: '', trim: true },
    status: {
      type: String,
      enum: ['Draft', 'Published', 'Scheduled', 'Expired'],
      default: 'Draft',
    },
    durationMin: { type: Number, default: 60, min: 1 },
    totalMarks: { type: Number, default: 100, min: 0 },
    marksPerQuestion: { type: Number, default: 1, min: 0 },
    negativeMarking: { type: Boolean, default: false },
    negativeMarksValue: { type: Number, default: 0, min: 0 },
    sections: { type: [TestSectionSchema], default: [] },
    startAt: { type: Date, default: null },
    endAt: { type: Date, default: null },
    attemptLimit: { type: Schema.Types.Mixed, default: 1 },
    shuffleQuestions: { type: Boolean, default: true },
    shuffleOptions: { type: Boolean, default: true },
    instructions: { type: String, default: '', trim: true },
    allowedBatchIds: { type: [String], default: [] },
    allowedCourseIds: { type: [String], default: [] },
    isPaid: { type: Boolean, default: false },
    price: { type: Number, default: 0, min: 0 },
    isLocked: { type: Boolean, default: false },
    attemptsCount: { type: Number, default: 0, min: 0 },
    questionIds: { type: [String], default: [] },
  },
  { collection: 'tms_tests', timestamps: true }
);

const QuestionSchema = new Schema<TmsQuestion>(
  {
    type: { type: String, enum: ['MCQ', 'Numeric'], default: 'MCQ' },
    text: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    imageUrl: { type: String, default: '', trim: true },
    options: { type: [String], default: [] },
    correctAnswer: { type: String, required: true, trim: true },
    explanation: { type: String, default: '', trim: true },
    difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Easy' },
    topic: { type: String, default: '', trim: true },
    subtopic: { type: String, default: '', trim: true },
    tags: { type: [String], default: [] },
  },
  { collection: 'tms_questions', timestamps: true }
);

const BatchSchema = new Schema<TmsBatch>(
  {
    name: { type: String, required: true, trim: true },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    studentIds: { type: [String], default: [] },
    testIds: { type: [String], default: [] },
  },
  { collection: 'tms_batches', timestamps: true }
);

const EnrollmentSchema = new Schema<TmsEnrollment>(
  {
    studentId: { type: String, required: true, trim: true, lowercase: true, unique: true },
    batchId: { type: String, default: null },
    courseIds: { type: [String], default: [] },
    testIds: { type: [String], default: [] },
    status: { type: String, enum: ['active', 'expired'], default: 'active' },
  },
  { collection: 'tms_enrollments', timestamps: true }
);

const AttemptAnswerSchema = new Schema<TmsAttemptAnswer>(
  {
    questionId: { type: String, required: true, trim: true },
    selected: { type: String, default: null },
    isMarked: { type: Boolean, default: false },
    timeSpentSec: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const AttemptSchema = new Schema<TmsAttempt>(
  {
    testId: { type: String, required: true, trim: true },
    studentId: { type: String, required: true, trim: true, lowercase: true },
    startedAt: { type: Date, required: true },
    submittedAt: { type: Date, default: null },
    timeTakenSec: { type: Number, default: 0, min: 0 },
    answers: { type: [AttemptAnswerSchema], default: [] },
    score: { type: Number, default: 0 },
    accuracy: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ['submitted', 'auto_submitted', 'in_progress'], default: 'submitted' },
  },
  { collection: 'tms_attempts', timestamps: true }
);

const StudentSchema = new Schema<TmsStudent>(
  {
    email: { type: String, required: true, trim: true, lowercase: true, index: true },
    name: { type: String, default: '', trim: true },
    mobile: { type: String, default: '', trim: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    isSuspended: { type: Boolean, default: false },
  },
  {
    collection: 'students',
    timestamps: true,
    strict: false,
  }
);

const CourseLinkSchema = new Schema<TmsCourseLink>(
  {
    courseId: { type: String, required: true, trim: true, unique: true },
    testIds: { type: [String], default: [] },
  },
  { collection: 'tms_course_links', timestamps: true }
);

const MainCourseSchema = new Schema<MainCourseDoc>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true },
    contentType: { type: String, enum: ['course', 'test'], default: 'course' },
    shortDescription: { type: String, default: '', trim: true },
    fullDescription: { type: String, default: '', trim: true },
    duration: { type: String, default: '', trim: true },
    validityDays: { type: Number, default: 30, min: 1 },
    price: { type: Number, default: 0, min: 0 },
  },
  {
    collection: 'courses',
    timestamps: true,
    strict: false,
  }
);

export const TmsTestModel =
  (mongoose.models.TmsTest as Model<TmsTest>) ||
  mongoose.model<TmsTest>('TmsTest', TestSchema);

export const TmsQuestionModel =
  (mongoose.models.TmsQuestion as Model<TmsQuestion>) ||
  mongoose.model<TmsQuestion>('TmsQuestion', QuestionSchema);

export const TmsBatchModel =
  (mongoose.models.TmsBatch as Model<TmsBatch>) ||
  mongoose.model<TmsBatch>('TmsBatch', BatchSchema);

export const TmsEnrollmentModel =
  (mongoose.models.TmsEnrollment as Model<TmsEnrollment>) ||
  mongoose.model<TmsEnrollment>('TmsEnrollment', EnrollmentSchema);

export const TmsAttemptModel =
  (mongoose.models.TmsAttempt as Model<TmsAttempt>) ||
  mongoose.model<TmsAttempt>('TmsAttempt', AttemptSchema);

export const TmsStudentModel =
  (mongoose.models.TmsStudent as Model<TmsStudent>) ||
  mongoose.model<TmsStudent>('TmsStudent', StudentSchema);

export const TmsCourseLinkModel =
  (mongoose.models.TmsCourseLink as Model<TmsCourseLink>) ||
  mongoose.model<TmsCourseLink>('TmsCourseLink', CourseLinkSchema);

export const MainCourseModel =
  (mongoose.models.MainCourse as Model<MainCourseDoc>) ||
  mongoose.model<MainCourseDoc>('MainCourse', MainCourseSchema);
