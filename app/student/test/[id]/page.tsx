'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  CheckCheck,
  MoonStar,
  Sparkles,
  Sun,
  Zap,
} from 'lucide-react';
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
import { useThemeStore } from '@/store/theme-store';
import { useToastStore } from '@/store/toast-store';
import { cn } from '@/utils/helpers';
import { Attempt, Question, Student, Test } from '@/types';

type SaveState = 'idle' | 'saved';

function sameQuestionOrder(current: string[], next: string[]) {
  if (current.length !== next.length) return false;
  return current.every((questionId, index) => questionId === next[index]);
}

function buildHint(question: Question | null) {
  if (!question) return 'Read the question carefully and identify the core concept first.';
  const lead =
    question.description?.split('.').map((value) => value.trim()).find(Boolean) || '';
  if (question.type === 'MCQ') {
    return `Focus on the core concept of ${question.topic || 'this topic'}. Eliminate options that conflict with definitions before selecting one.${lead ? ` Clue: ${lead}.` : ''}`;
  }
  return `Break the problem into small steps and validate units or boundaries before finalizing.${lead ? ` Clue: ${lead}.` : ''}`;
}

export default function StudentTestAttemptPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAuthStore((state) => state.user);
  const pushToast = useToastStore((state) => state.push);
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);

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
  const [hintOpen, setHintOpen] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const autoSubmittedRef = useRef(false);
  const [secureLinkState, setSecureLinkState] = useState<'checking' | 'valid' | 'invalid'>(
    'checking'
  );
  const validatingTokenRef = useRef('');
  const saveToastTimerRef = useRef<number | null>(null);
  const launchToken = (searchParams.get('launch') || '').trim();

  const markSaved = useCallback(() => {
    setSaveState('saved');
    if (saveToastTimerRef.current) {
      window.clearTimeout(saveToastTimerRef.current);
    }
    saveToastTimerRef.current = window.setTimeout(() => {
      setSaveState('idle');
      saveToastTimerRef.current = null;
    }, 1400);
  }, []);

  useEffect(() => {
    return () => {
      if (saveToastTimerRef.current) {
        window.clearTimeout(saveToastTimerRef.current);
      }
    };
  }, []);

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
            `/student/link-corrupt?reason=${encodeURIComponent(data.code || 'invalid-link')}`
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
      test ? questions.filter((question) => test.questionIds.includes(question.id)) : [],
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

  const attemptStats = useMemo(() => {
    if (!activeAttempt) {
      return {
        total: 0,
        answered: 0,
        notAnswered: 0,
        notVisited: 0,
        marked: 0,
      };
    }

    return activeAttempt.questionIds.reduce(
      (acc, questionId) => {
        const state = getQuestionState(questionId);
        acc.total += 1;
        if (state === 'answered') acc.answered += 1;
        if (state === 'not_answered') acc.notAnswered += 1;
        if (state === 'not_visited') acc.notVisited += 1;
        if (state === 'marked_for_review') acc.marked += 1;
        return acc;
      },
      {
        total: 0,
        answered: 0,
        notAnswered: 0,
        notVisited: 0,
        marked: 0,
      }
    );
  }, [activeAttempt, getQuestionState]);

  const performSubmit = useCallback(
    async (autoSubmitted = false) => {
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
    },
    [activeAttempt, pushToast, resetAttempt, router, student, submitting, test]
  );

  useEffect(() => {
    if (!activeAttempt) return;
    if (activeAttempt.remainingSec > 0 || autoSubmittedRef.current) return;
    autoSubmittedRef.current = true;
    performSubmit(true);
  }, [activeAttempt, performSubmit]);

  const questionId = activeAttempt?.questionIds[activeAttempt.currentQuestionIndex] ?? '';
  const currentQuestion =
    testQuestions.find((question) => question.id === questionId) ?? null;
  const currentAnswer =
    activeAttempt?.answers.find((answer) => answer.questionId === questionId) ?? null;

  useEffect(() => {
    if (!activeAttempt || !currentQuestion || !questionId) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

      const key = event.key.toLowerCase();
      if (key === 'arrowleft' || key === 'p') {
        event.preventDefault();
        previous();
        return;
      }
      if (key === 'arrowright' || key === 'n') {
        event.preventDefault();
        saveAndNext();
        markSaved();
        return;
      }
      if (key === 'm') {
        event.preventDefault();
        toggleMark(questionId);
        markSaved();
        return;
      }
      if (key === 'h') {
        event.preventDefault();
        setHintOpen(true);
        return;
      }

      if (currentQuestion.type === 'MCQ' && ['1', '2', '3', '4'].includes(key)) {
        const optionIndex = Number(key) - 1;
        const option = currentQuestion.options[optionIndex];
        if (!option) return;
        event.preventDefault();
        setAnswer(questionId, option, 1);
        markSaved();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    activeAttempt,
    currentQuestion,
    markSaved,
    previous,
    questionId,
    saveAndNext,
    setAnswer,
    toggleMark,
  ]);

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
  if (!activeAttempt || !currentQuestion || !questionId) return null;

  const dark = theme === 'dark';
  const currentQuestionNumber = activeAttempt.currentQuestionIndex + 1;
  const completionPct = attemptStats.total
    ? Math.round((attemptStats.answered / attemptStats.total) * 100)
    : 0;
  const examTitle = 'Computer Fundamentals';
  const hintMessage = buildHint(currentQuestion);

  return (
    <PageTransition>
      <div
        className={cn(
          'relative overflow-hidden rounded-[30px] border p-4 md:p-5',
          dark
            ? 'border-slate-700 bg-[#0F172A] text-[#E2E8F0]'
            : 'border-[#E5E7EB] bg-[#F8FAFC] text-[#111827]'
        )}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className={cn(
              'absolute -left-20 -top-24 h-72 w-72 rounded-full blur-3xl',
              dark ? 'bg-indigo-500/25' : 'bg-indigo-300/35'
            )}
          />
          <div
            className={cn(
              'absolute -bottom-20 right-[-60px] h-72 w-72 rounded-full blur-3xl',
              dark ? 'bg-emerald-500/20' : 'bg-cyan-300/30'
            )}
          />
          <div
            className={cn('absolute inset-0', dark ? 'opacity-30' : 'opacity-45')}
            style={{
              backgroundImage:
                'radial-gradient(circle at 1px 1px, rgba(148,163,184,0.34) 1px, transparent 0)',
              backgroundSize: '26px 26px',
            }}
          />
        </div>

        <div className="relative space-y-4">
          <header
            className={cn(
              'rounded-3xl border p-4 backdrop-blur-xl md:p-5',
              dark
                ? 'border-slate-700 bg-slate-800/50 shadow-[0_14px_36px_-20px_rgba(99,102,241,0.35)]'
                : 'border-white/70 bg-white/75 shadow-[0_14px_36px_-20px_rgba(15,23,42,0.18)]'
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <div>
                  <p
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.15em]',
                      dark
                        ? 'border-indigo-500/40 bg-indigo-500/15 text-indigo-200'
                        : 'border-indigo-200 bg-indigo-50 text-indigo-700'
                    )}
                  >
                    <Sparkles size={12} />
                    Live Test Session
                  </p>
                  <h1 className="mt-2 text-2xl font-bold">{examTitle}</h1>
                  <p className={cn('mt-1 text-xs', dark ? 'text-slate-400' : 'text-slate-500')}>
                    Active Paper: {test.name}
                  </p>
                </div>

                <div className="grid max-w-2xl grid-cols-2 gap-2 text-xs font-semibold sm:grid-cols-4">
                  <div
                    className={cn(
                      'rounded-xl border px-2.5 py-2',
                      dark
                        ? 'border-slate-700 bg-slate-800/70 text-slate-200'
                        : 'border-slate-200 bg-white/80 text-slate-700'
                    )}
                  >
                    <p className={cn('text-[10px] uppercase tracking-wide', dark ? 'text-slate-400' : 'text-slate-500')}>
                      Answered
                    </p>
                    <p>{attemptStats.answered}/{attemptStats.total}</p>
                  </div>
                  <div
                    className={cn(
                      'rounded-xl border px-2.5 py-2',
                      dark
                        ? 'border-slate-700 bg-slate-800/70 text-slate-200'
                        : 'border-slate-200 bg-white/80 text-slate-700'
                    )}
                  >
                    <p className={cn('text-[10px] uppercase tracking-wide', dark ? 'text-slate-400' : 'text-slate-500')}>
                      Pending
                    </p>
                    <p>{attemptStats.notAnswered + attemptStats.notVisited}</p>
                  </div>
                  <div
                    className={cn(
                      'rounded-xl border px-2.5 py-2',
                      dark
                        ? 'border-slate-700 bg-slate-800/70 text-slate-200'
                        : 'border-slate-200 bg-white/80 text-slate-700'
                    )}
                  >
                    <p className={cn('text-[10px] uppercase tracking-wide', dark ? 'text-slate-400' : 'text-slate-500')}>
                      Current
                    </p>
                    <p>{currentQuestionNumber}/{attemptStats.total}</p>
                  </div>
                  <motion.div
                    initial={false}
                    animate={{
                      scale: saveState === 'saved' ? 1.02 : 1,
                    }}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-xl border px-2.5 py-2',
                      saveState === 'saved'
                        ? dark
                          ? 'border-emerald-400/40 bg-emerald-500/20 text-emerald-300'
                          : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : dark
                          ? 'border-slate-700 bg-slate-800/70 text-slate-300'
                          : 'border-slate-200 bg-white/80 text-slate-600'
                    )}
                  >
                    <CheckCheck size={13} />
                    {saveState === 'saved' ? 'Answer Saved' : 'Auto-save On'}
                  </motion.div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div
                  className={cn(
                    'min-w-[220px] rounded-2xl border px-3 py-2',
                    dark
                      ? 'border-slate-600 bg-slate-800/80'
                      : 'border-slate-200 bg-white/90'
                  )}
                >
                  <div className="mb-1 flex items-center justify-between text-xs font-semibold">
                    <span>Progress</span>
                    <span>{attemptStats.answered}/{attemptStats.total} answered</span>
                  </div>
                  <div className={cn('mb-2 flex items-center justify-between text-[11px]', dark ? 'text-slate-400' : 'text-slate-500')}>
                    <span>Marked: {attemptStats.marked}</span>
                    <span>Pending: {attemptStats.notAnswered + attemptStats.notVisited}</span>
                  </div>
                  <div
                    className={cn(
                      'h-2 overflow-hidden rounded-full',
                      dark ? 'bg-slate-700' : 'bg-slate-200'
                    )}
                  >
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-[#6366F1] to-[#22C55E]"
                      initial={false}
                      animate={{ width: `${completionPct}%` }}
                      transition={{ duration: 0.35, ease: 'easeOut' }}
                    />
                  </div>
                </div>

                <TestTimer
                  seconds={activeAttempt.remainingSec}
                  totalSeconds={test.durationMin * 60}
                  theme={theme}
                />

                <button
                  onClick={toggleTheme}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-semibold transition',
                    dark
                      ? 'border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  )}
                >
                  <Sun size={14} />
                  <span className="relative h-5 w-10 rounded-full bg-slate-400/35">
                    <span
                      className={cn(
                        'absolute top-0.5 h-4 w-4 rounded-full bg-[#6366F1] transition-transform',
                        dark ? 'translate-x-[22px]' : 'translate-x-0.5'
                      )}
                    />
                  </span>
                  <MoonStar size={14} />
                  <span className="hidden text-[11px] uppercase tracking-wide sm:inline">
                    {theme === 'dark' ? 'Dark' : 'Light'}
                  </span>
                </button>

                <Button
                  variant="danger"
                  onClick={() => setConfirmOpen(true)}
                  disabled={submitting}
                  className="h-11 px-5 shadow-[0_12px_28px_-16px_rgba(239,68,68,0.65)]"
                >
                  Submit Test
                </Button>
              </div>
            </div>
          </header>

          <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
            <TestPalette
              questionIds={activeAttempt.questionIds}
              activeIndex={activeAttempt.currentQuestionIndex}
              getState={getQuestionState}
              onChange={setCurrentQuestion}
              onExit={() => router.push('/student/tests-enrolled')}
              theme={theme}
            />

            <AnimatePresence mode="wait">
              <motion.div
                key={questionId}
                initial={{ opacity: 0, x: 18 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -18 }}
                transition={{ duration: 0.24, ease: 'easeOut' }}
              >
                <QuestionRenderer
                  question={currentQuestion}
                  selected={currentAnswer?.selected ?? null}
                  isMarked={Boolean(currentAnswer?.isMarked)}
                  questionNumber={currentQuestionNumber}
                  totalQuestions={activeAttempt.questionIds.length}
                  onSelect={(value) => {
                    setAnswer(questionId, value, 1);
                    markSaved();
                  }}
                  onClear={() => {
                    clearAnswer(questionId);
                    markSaved();
                  }}
                  onToggleMark={() => {
                    toggleMark(questionId);
                    markSaved();
                  }}
                  onPrev={previous}
                  onNext={() => {
                    saveAndNext();
                    markSaved();
                  }}
                  onHint={() => setHintOpen(true)}
                  disablePrev={activeAttempt.currentQuestionIndex === 0}
                  disableNext={submitting}
                  theme={theme}
                />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      <Modal
        open={confirmOpen}
        title="Submit Test"
        onClose={() => setConfirmOpen(false)}
        theme={theme}
      >
        <div className="space-y-3">
          <p className={cn('text-sm', dark ? 'text-slate-300' : 'text-slate-600')}>
            Are you sure you want to submit? You cannot edit responses after submit.
          </p>
          <div
            className={cn(
              'rounded-xl p-3 text-xs',
              dark ? 'bg-amber-500/18 text-amber-300' : 'bg-amber-50 text-amber-700'
            )}
          >
            <AlertTriangle size={14} className="mr-1 inline-block" />
            Marked or unanswered questions will be submitted as-is.
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

      <Modal open={hintOpen} title="AI Hint" onClose={() => setHintOpen(false)} theme={theme}>
        <div className="space-y-3">
          <div
            className={cn(
              'rounded-xl p-3 text-sm',
              dark ? 'bg-indigo-500/18 text-indigo-100' : 'bg-indigo-50 text-indigo-700'
            )}
          >
            <Zap size={14} className="mr-1 inline-block" />
            {hintMessage}
          </div>
          <p className={cn('text-xs', dark ? 'text-slate-400' : 'text-slate-500')}>
            Hint only guides your approach. It does not reveal the final answer.
          </p>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setHintOpen(false)}>
              Continue Test
            </Button>
          </div>
        </div>
      </Modal>
    </PageTransition>
  );
}
