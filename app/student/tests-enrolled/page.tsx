'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { formatCurrency, formatDate } from '@/utils/formatters';

function getStatusBadgeVariant(status: Test['status']) {
  if (status === 'Published') return 'success';
  if (status === 'Scheduled') return 'info';
  if (status === 'Expired') return 'danger';
  return 'warning';
}

function attemptsUsed(testId: string, attempts: Attempt[]) {
  return attempts.filter(
    (attempt) => attempt.testId === testId && attempt.status !== 'in_progress'
  ).length;
}

function attemptsLeftLabel(test: Test, attempts: Attempt[]) {
  if (test.attemptLimit === 'unlimited') return 'Unlimited';
  const used = attemptsUsed(test.id, attempts);
  return `${Math.max(0, test.attemptLimit - used)}/${test.attemptLimit}`;
}

export default function StudentEnrolledTestsPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const pushToast = useToastStore((state) => state.push);

  const [student, setStudent] = useState<Student | null>(null);
  const [tests, setTests] = useState<Test[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [launchingId, setLaunchingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!user?.studentId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    Promise.all([
      getStudentById(user.studentId),
      getTests(),
      getAttemptsByStudent(user.studentId),
    ])
      .then(([studentData, testData, attemptData]) => {
        if (!active) return;
        setStudent(studentData);
        setTests(testData);
        setAttempts(attemptData);
      })
      .catch(() => {
        if (!active) return;
        pushToast({
          kind: 'error',
          title: 'Enrolled tests load nahi ho paya.',
        });
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user?.studentId, pushToast]);

  const enrolledTests = useMemo(() => {
    const enrolledIds = student?.enrolledTestIds || [];
    const testMap = new Map(tests.map((test) => [test.id, test]));
    return enrolledIds
      .map((id) => testMap.get(id))
      .filter((test): test is Test => Boolean(test));
  }, [student?.enrolledTestIds, tests]);

  const accessByTestId = useMemo(() => {
    const map = new Map<string, ReturnType<typeof checkTestAccess>>();
    if (!student) return map;
    enrolledTests.forEach((test) => {
      map.set(test.id, checkTestAccess({ test, student, attempts }));
    });
    return map;
  }, [student, enrolledTests, attempts]);

  const handleLaunchTest = async (test: Test) => {
    if (launchingId) return;
    if (test.questionIds.length === 0) {
      pushToast({
        kind: 'error',
        title: 'Is test me abhi questions assign nahi hain.',
      });
      return;
    }
    setLaunchingId(test.id);
    try {
      const response = await fetch('/api/student/test-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testId: test.id }),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        url?: string;
        message?: string;
      };

      if (!response.ok || !data.ok || !data.url) {
        pushToast({
          kind: 'error',
          title: data.message || 'Secure test link generate nahi hua.',
        });
        return;
      }

      router.push(data.url);
    } catch {
      pushToast({
        kind: 'error',
        title: 'Secure test link banane me error aaya.',
      });
    } finally {
      setLaunchingId(null);
    }
  };

  return (
    <PageTransition>
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Enrolled Tests</h1>
            <p className="text-sm text-slate-500">
              Tests you already enrolled in from the Test Store.
            </p>
          </div>
          <Link href="/student/courses-enrolled">
            <Button variant="outline">Open Test Store</Button>
          </Link>
        </div>

        {loading ? (
          <Card>
            <p className="text-sm text-slate-600">Loading enrolled tests...</p>
          </Card>
        ) : enrolledTests.length === 0 ? (
          <Card className="space-y-3">
            <p className="text-sm text-slate-600">
              You have not enrolled in any test yet.
            </p>
            <Link href="/student/courses-enrolled">
              <Button className="h-8 rounded-lg px-3 text-xs">Go to Test Store</Button>
            </Link>
          </Card>
        ) : (
          <>
            <Card className="flex flex-wrap items-center gap-2">
              <Badge variant="default">Total: {enrolledTests.length}</Badge>
              <Badge variant="success">
                Free: {enrolledTests.filter((test) => !test.isPaid).length}
              </Badge>
              <Badge variant="warning">
                Paid: {enrolledTests.filter((test) => test.isPaid).length}
              </Badge>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              {enrolledTests.map((test) => {
                const access = accessByTestId.get(test.id);
                return (
                  <Card key={test.id} className="space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h2 className="text-lg font-semibold text-slate-900">{test.name}</h2>
                        <p className="text-xs text-slate-500">
                          {test.category || 'General'} | {test.durationMin} min | {test.totalMarks} marks
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant={getStatusBadgeVariant(test.status)}>{test.status}</Badge>
                        <Badge variant={test.isPaid ? 'warning' : 'success'}>
                          {test.isPaid ? `Paid ${formatCurrency(test.price)}` : 'Free'}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-1 text-xs text-slate-600">
                      <p>Questions: {test.questionIds.length}</p>
                      <p>Attempts left: {attemptsLeftLabel(test, attempts)}</p>
                      <p>
                        Window: {formatDate(test.startAt)} to {formatDate(test.endAt)}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={`text-xs ${
                          access?.allowed ? 'text-emerald-700' : 'text-amber-700'
                        }`}
                      >
                        {access?.message || 'Checking access...'}
                      </p>
                      <Button
                        className="h-8 rounded-lg px-3 text-xs"
                        onClick={() => handleLaunchTest(test)}
                        disabled={!access?.allowed || launchingId === test.id}
                      >
                        {launchingId === test.id ? 'Generating Secure Link...' : 'Start / Continue'}
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </div>
    </PageTransition>
  );
}
