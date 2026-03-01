'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageTransition } from '@/components/ui/page-transition';
import { NotAuthorized } from '@/components/student/not-authorized';
import { QuestionRenderer } from '@/components/student/question-renderer';
import { TestPalette } from '@/components/student/test-palette';
import { TestTimer } from '@/components/student/test-timer';
import { checkTestAccess } from '@/lib/access-control';
import { getQuestions } from '@/services/question-service';
import { getAttemptsByStudent, submitAttempt } from '@/services/result-service';
import { getStudentById } from '@/services/student-service';
import { getTestById } from '@/services/test-service';
import { useAuthStore } from '@/store/auth-store';
import { useTestAttemptStore } from '@/store/test-attempt-store';
import { useToastStore } from '@/store/toast-store';
import { Attempt, Question, Student, Test } from '@/types';

function sameQuestionOrder(current: string[], next: string[]) {
  if (current.length !== next.length) return false;
  return current.every((questionId, index) => questionId === next[index]);
}

export default function StudentTestAttemptPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAuthStore((state) => state.user);
  const pushToast = useToastStore((state) => state.push);

  const activeAttempt = useTestAttemptStore((state) => state.activeAttempt);
  const startAttempt = useTestAttemptStore((state) => state.startAttempt);
  const setCurrentQuestion = useTestAttemptStore((state) => state.setCurrentQuestion);
  const setAnswer = useTestAttemptStore((state) => state.setAnswer);
  const clearAnswer = useTestAttemptStore((state) => state.clearAnswer);
  const toggleMark = useTestAttemptStore((state) => state.toggleMark);
  const saveAndNext = useTestAttemptStore((state) => state.saveAndNext);
  const previous = useTestAttemptStore((state) => state.previous);
  const tick = useTestAttemptStore((state) => state.tick);
  const resetAttempt = useTestAttemptStore((state) => state.reset);
  const getQuestionState = useTestAttemptStore((state) => state.getQuestionState);

  const [test, setTest] = useState<Test | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const autoSubmittedRef = useRef(false);
  const [secureLinkState, setSecureLinkState] = useState<'checking' | 'valid' | 'invalid'>('checking');
  const validatingTokenRef = useRef('');
  const launchToken = (searchParams.get('launch') || '').trim();

  useEffect(() => {
    const validationKey = `${params.id}:${launchToken}`;
    if (validatingTokenRef.current === validationKey) return;
    validatingTokenRef.current = validationKey;
    setSecureLinkState('checking');

    if (!launchToken) {
      setSecureLinkState('invalid');
      router.replace('/student/link-corrupt?reason=missing-link');
      return;
    }

    let active = true;

    const validateSecureLink = async () => {
      try {
        const response = await fetch('/api/student/test-link/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            testId: params.id,
            token: launchToken,
          }),
        });
        const data = (await response.json()) as {
          ok?: boolean;
          code?: string;
          message?: string;
        };

        if (!active) return;

        if (!response.ok || !data.ok) {
          setSecureLinkState('invalid');
          router.replace(
            `/student/link-corrupt?reason=${encodeURIComponent(
              data.code || 'invalid-link'
            )}`
          );
          return;
        }

        setSecureLinkState('valid');
      } catch {
        if (!active) return;
        setSecureLinkState('invalid');
        router.replace('/student/link-corrupt?reason=validation-failed');
      }
    };

    validateSecureLink();

    return () => {
      active = false;
    };
  }, [launchToken, params.id, router]);

  useEffect(() => {
    if (!user?.studentId || secureLinkState !== 'valid') return;
    Promise.all([
      getTestById(params.id),
      getStudentById(user.studentId),
      getAttemptsByStudent(user.studentId),
      getQuestions(),
    ]).then(([testData, studentData, attemptsData, questionPool]) => {
      setTest(testData);
      setStudent(studentData);
      setAttempts(attemptsData);
      setQuestions(questionPool);
    });
  }, [params.id, user?.studentId, secureLinkState]);

  const access = useMemo(() => {
    if (!test || !student) return null;
    return checkTestAccess({ test, student, attempts });
  }, [test, student, attempts]);

  const testQuestions = useMemo(
    () =>
      test
        ? questions.filter((question) => test.questionIds.includes(question.id))
        : [],
    [test, questions]
  );

  useEffect(() => {
    if (!test || !student) return;
    if (!access?.allowed) return;
    const nextQuestionIds = testQuestions.map((question) => question.id);
    const currentAttempt = activeAttempt;

    const sameAttempt =
      currentAttempt !== null &&
      currentAttempt.testId === test.id &&
      currentAttempt.studentId === student.id;
    const activeQuestionIds = sameAttempt ? currentAttempt.questionIds : [];
    const shouldRestartAttempt =
      !sameAttempt || !sameQuestionOrder(activeQuestionIds, nextQuestionIds);

    if (shouldRestartAttempt) {
      startAttempt({
        testId: test.id,
        studentId: student.id,
        durationMin: test.durationMin,
        questionIds: nextQuestionIds,
      });
    }
  }, [test, student, access?.allowed, activeAttempt, startAttempt, testQuestions]);

  useEffect(() => {
    if (!activeAttempt) return;
    const timer = window.setInterval(() => tick(), 1000);
    return () => clearInterval(timer);
  }, [activeAttempt, tick]);

  const performSubmit = async (autoSubmitted = false) => {
    if (!activeAttempt || !test || !student || submitting) return;
    setSubmitting(true);
    try {
      const result = await submitAttempt({
        testId: test.id,
        studentId: student.id,
        startedAt: activeAttempt.startedAt,
        answers: activeAttempt.answers,
        timeTakenSec: test.durationMin * 60 - activeAttempt.remainingSec,
        autoSubmitted,
      });
      resetAttempt();
      pushToast({
        kind: 'success',
        title: autoSubmitted ? 'Time up: Auto submitted' : 'Test submitted successfully',
      });
      router.push(`/student/result/${result.id}`);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!activeAttempt) return;
    if (activeAttempt.remainingSec > 0 || autoSubmittedRef.current) return;
    autoSubmittedRef.current = true;
    performSubmit(true);
  }, [activeAttempt]);

  if (secureLinkState !== 'valid') {
    return (
      <Card className="mx-auto max-w-xl">
        <p className="text-sm text-slate-600">Validating secure test link...</p>
      </Card>
    );
  }
  if (!test || !student) return null;
  if (!access?.allowed) {
    return <NotAuthorized message={access?.message ?? 'Not authorized to access this test.'} />;
  }
  if (!activeAttempt) return null;

  const questionId = activeAttempt.questionIds[activeAttempt.currentQuestionIndex];
  const currentQuestion = testQuestions.find((question) => question.id === questionId);
  const currentAnswer = activeAttempt.answers.find((answer) => answer.questionId === questionId);

  if (!currentQuestion) {
    return (
      <Card className="mx-auto max-w-2xl">
        <p className="text-sm text-slate-600">No questions found for this test.</p>
      </Card>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900">{test.name}</h1>
            <p className="text-xs text-slate-500">Student Session: {student.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <TestTimer seconds={activeAttempt.remainingSec} />
            <Button
              variant="danger"
              onClick={() => setConfirmOpen(true)}
              disabled={submitting}
            >
              Submit Test
            </Button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <TestPalette
            questionIds={activeAttempt.questionIds}
            activeIndex={activeAttempt.currentQuestionIndex}
            getState={getQuestionState}
            onChange={setCurrentQuestion}
          />

          <QuestionRenderer
            question={currentQuestion}
            selected={currentAnswer?.selected ?? null}
            isMarked={Boolean(currentAnswer?.isMarked)}
            onSelect={(value) => setAnswer(questionId, value, 1)}
            onClear={() => clearAnswer(questionId)}
            onToggleMark={() => toggleMark(questionId)}
            onPrev={previous}
            onNext={saveAndNext}
          />
        </div>

        <Modal open={confirmOpen} title="Submit Test" onClose={() => setConfirmOpen(false)}>
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Are you sure you want to submit? You cannot edit responses after submit.
            </p>
            <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-700">
              <AlertTriangle size={14} className="mr-1 inline-block" />
              Marked/unanswered questions will be submitted as-is.
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={async () => {
                  setConfirmOpen(false);
                  await performSubmit(false);
                }}
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Confirm Submit'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </PageTransition>
  );
}
