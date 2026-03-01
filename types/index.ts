export type Role = 'ADMIN' | 'STUDENT';

export type StudentStatus = 'active' | 'inactive';
export type EnrollmentStatus = 'active' | 'expired';
export type TestStatus = 'Draft' | 'Published' | 'Scheduled' | 'Expired';
export type Difficulty = 'Easy' | 'Medium' | 'Hard';
export type QuestionType = 'MCQ' | 'Numeric';
export type AttemptStatus = 'submitted' | 'auto_submitted' | 'in_progress';

export type Student = {
  id: string;
  name: string;
  mobile: string;
  email: string;
  batchId: string | null;
  courseIds: string[];
  enrolledTestIds: string[];
  status: StudentStatus;
};

export type Batch = {
  id: string;
  name: string;
  startAt: string;
  endAt: string;
  studentIds: string[];
  testIds: string[];
};

export type Course = {
  id: string;
  name: string;
  description: string;
  validityDays: number;
  price: number;
  testIds: string[];
};

export type TestSection = {
  id: string;
  name: string;
  questionCount: number;
  sectionMarks: number;
  sectionTimerMin?: number;
  questionIds: string[];
};

export type Test = {
  id: string;
  name: string;
  category: string;
  status: TestStatus;
  durationMin: number;
  totalMarks: number;
  marksPerQuestion: number;
  negativeMarking: boolean;
  negativeMarksValue: number;
  sections: TestSection[];
  startAt: string | null;
  endAt: string | null;
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

export type Question = {
  id: string;
  type: QuestionType;
  text: string;
  description?: string;
  imageUrl?: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: Difficulty;
  topic: string;
  subtopic: string;
  tags: string[];
};

export type Answer = {
  questionId: string;
  selected: string | null;
  isMarked: boolean;
  timeSpentSec: number;
};

export type Attempt = {
  id: string;
  testId: string;
  studentId: string;
  startedAt: string;
  submittedAt: string | null;
  timeTakenSec: number;
  answers: Answer[];
  score: number;
  accuracy: number;
  status: AttemptStatus;
};

export type Enrollment = {
  id: string;
  studentId: string;
  batchId: string | null;
  courseIds: string[];
  testIds: string[];
  status: EnrollmentStatus;
};

export type DashboardKPI = {
  label: string;
  value: number;
  trend: string;
  icon: string;
};

export type AccessReason =
  | 'NOT_ASSIGNED'
  | 'NOT_PUBLISHED'
  | 'WINDOW_NOT_STARTED'
  | 'WINDOW_EXPIRED'
  | 'ATTEMPTS_EXCEEDED'
  | 'TEST_LOCKED'
  | 'OK';

export type AccessCheck = {
  allowed: boolean;
  reason: AccessReason;
  message: string;
};

export type AuthUser = {
  id: string;
  name: string;
  role: Role;
  email: string;
  studentId?: string;
};
