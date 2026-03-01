'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ResponsiveContainer, LineChart, Line, XAxis, Tooltip } from 'recharts';
import { AlertTriangle, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageTransition } from '@/components/ui/page-transition';
import { checkTestAccess } from '@/lib/access-control';
import { getAttemptsByStudent } from '@/services/result-service';
import { getStudentById } from '@/services/student-service';
import { getTests } from '@/services/test-service';
import { useAuthStore } from '@/store/auth-store';
import { useToastStore } from '@/store/toast-store';
import { Attempt, Student, Test } from '@/types';
import { formatDate } from '@/utils/formatters';

function attemptsLeft(test: Test, attempts: Attempt[]) {
  if (test.attemptLimit === 'unlimited') return 'Unlimited';
  const used = attempts.filter((entry) => entry.testId === test.id && entry.status !== 'in_progress').length;
  return `${Math.max(0, test.attemptLimit - used)}/${test.attemptLimit}`;
}

export default function StudentDashboardPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const pushToast = useToastStore((state) => state.push);
  const [student, setStudent] = useState<Student | null>(null);
  const [tests, setTests] = useState<Test[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [launchingId, setLaunchingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.studentId) return;
    Promise.all([
      getStudentById(user.studentId),
      getTests(),
      getAttemptsByStudent(user.studentId),
    ]).then(([studentData, testData, attemptData]) => {
      setStudent(studentData);
      setTests(testData);
      setAttempts(attemptData);
    });
  }, [user?.studentId]);

  const categorized = useMemo(() => {
    if (!student) return { active: [], upcoming: [], completed: [] as Test[] };

    const active: Test[] = [];
    const upcoming: Test[] = [];
    const completed: Test[] = [];
    const now = new Date();

    tests.forEach((test) => {
      const access = checkTestAccess({ test, student, attempts, now });
      const usedCount = attempts.filter(
        (entry) => entry.testId === test.id && entry.status !== 'in_progress'
      ).length;
      if (usedCount > 0) completed.push(test);

      if (
        access.reason === 'WINDOW_NOT_STARTED' &&
        (test.allowedBatchIds.includes(student.batchId || '') ||
          student.courseIds.some((courseId) => test.allowedCourseIds.includes(courseId)) ||
          student.enrolledTestIds.includes(test.id))
      ) {
        upcoming.push(test);
      }

      if (access.allowed) active.push(test);
    });

    return { active, upcoming, completed };
  }, [tests, attempts, student]);

  const snapshot = useMemo(() => {
    const recent = [...attempts]
      .filter((attempt) => attempt.status !== 'in_progress')
      .sort((a, b) => {
        const ad = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
        const bd = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
        return bd - ad;
      })
      .slice(0, 5)
      .reverse();
    const avgScore =
      recent.length > 0
        ? recent.reduce((sum, item) => sum + item.score, 0) / recent.length
        : 0;
    const avgAccuracy =
      recent.length > 0
        ? recent.reduce((sum, item) => sum + item.accuracy, 0) / recent.length
        : 0;
    return {
      avgScore: Number(avgScore.toFixed(1)),
      avgAccuracy: Number(avgAccuracy.toFixed(1)),
      trend: recent.map((attempt, index) => ({
        name: `A${index + 1}`,
        score: attempt.score,
      })),
    };
  }, [attempts]);

  const testById = useMemo(
    () => new Map(tests.map((test) => [test.id, test])),
    [tests]
  );

  const handleLaunchTest = async (testId: string) => {
    if (launchingId) return;
    const targetTest = testById.get(testId);
    if (!targetTest || targetTest.questionIds.length === 0) {
      pushToast({
        kind: 'error',
        title: 'Is test me abhi questions assign nahi hain.',
      });
      return;
    }
    setLaunchingId(testId);
    try {
      const response = await fetch('/api/student/test-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testId }),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        url?: string;
        message?: string;
        code?: string;
      };

      if (!response.ok || !data.ok || !data.url) {
        const errorMsg = data.message || 'Secure test link generate nahi hua.';
        pushToast({
          kind: 'error',
          title: errorMsg,
          description: 'Aap test-debug page par jakar details dekh sakte hain.',
        });
        return;
      }

      router.push(data.url);
    } catch (error) {
      pushToast({
        kind: 'error',
        title: 'Secure test link banane me error aaya.',
      });
    } finally {
      setLaunchingId(null);
    }
  };

  const sectionCard = (title: string, items: Test[], badgeVariant: 'success' | 'info' | 'warning') => (
    <Card className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
        <Badge variant={badgeVariant}>{items.length}</Badge>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">No tests in this section.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((test) => {
            const access = student ? checkTestAccess({ test, student, attempts }) : null;
            const isBlocked = !access?.allowed;
            
            return (
              <div key={test.id} className={`rounded-xl border p-3 ${isBlocked ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-slate-50'}`}>
                <p className="font-semibold text-slate-900">{test.name}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {test.durationMin} min • {test.totalMarks} marks • {test.questionIds.length} questions
                </p>
                <p className="mt-1 text-xs text-slate-500">Attempts left: {attemptsLeft(test, attempts)}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Window: {formatDate(test.startAt)} to {formatDate(test.endAt)}
                </p>
                
                {isBlocked && access && (
                  <div className="mt-2 flex items-start gap-2 rounded-lg bg-red-100 p-2">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0 text-red-600 mt-0.5" />
                    <div className="text-xs text-red-700">
                      <p className="font-semibold">{access.reason}</p>
                      <p>{access.message}</p>
                    </div>
                  </div>
                )}
                
                <div className="mt-3 flex gap-2">
                  <Button
                    className="h-8 rounded-lg px-3 text-xs flex-1"
                    onClick={() => handleLaunchTest(test.id)}
                    disabled={launchingId === test.id || isBlocked}
                  >
                    {launchingId === test.id ? 'Generating Secure Link...' : 'Start / Continue'}
                  </Button>
                  {isBlocked && (
                    <Link href={`/student/test-debug?testId=${test.id}`}>
                      <Button variant="outline" className="h-8 px-2">
                        <Wrench className="h-4 w-4" />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );

  return (
    <PageTransition>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Student Dashboard</h1>
            <p className="text-sm text-slate-500">
              Welcome {student?.name ?? user?.name}, continue your test journey.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/student/test-debug">
              <Button variant="outline" className="h-8 px-3 text-xs">
                <Wrench className="h-4 w-4 mr-2" />
                Test Debug
              </Button>
            </Link>
            <Link href="/student/profile">
              <Button variant="outline" className="h-8 px-3 text-xs">Open Profile</Button>
            </Link>
          </div>
        </div>

        <Card>
          <h2 className="mb-2 text-sm font-semibold text-slate-800">Performance Snapshot (Last 5 Attempts)</h2>
          <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
            <div className="space-y-2 rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Avg Score</p>
              <p className="text-2xl font-bold text-slate-900">{snapshot.avgScore}</p>
              <p className="text-xs text-slate-500">Avg Accuracy</p>
              <p className="text-xl font-semibold text-slate-800">{snapshot.avgAccuracy}%</p>
            </div>
            <div className="h-40 rounded-xl border border-slate-100 bg-white p-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={snapshot.trend}>
                  <XAxis dataKey="name" />
                  <Tooltip />
                  <Line type="monotone" dataKey="score" stroke="#0891b2" strokeWidth={2.4} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>

        {sectionCard('Active Now Tests', categorized.active, 'success')}
        {sectionCard('Upcoming Tests', categorized.upcoming, 'info')}
        {sectionCard('Completed Tests', categorized.completed, 'warning')}
      </div>
    </PageTransition>
  );
}
