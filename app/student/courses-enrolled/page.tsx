'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageTransition } from '@/components/ui/page-transition';
import { enrollStudentInTest } from '@/services/enrollment-service';
import { getStudentById } from '@/services/student-service';
import { getTests } from '@/services/test-service';
import { useAuthStore } from '@/store/auth-store';
import { useToastStore } from '@/store/toast-store';
import { Student, Test } from '@/types';
import { formatCurrency, formatDate } from '@/utils/formatters';

type PaidFilter = 'all' | 'free' | 'paid';

function getStatusBadgeVariant(status: Test['status']) {
  if (status === 'Published') return 'success';
  if (status === 'Scheduled') return 'info';
  if (status === 'Expired') return 'danger';
  return 'warning';
}

function attemptLimitLabel(test: Test) {
  return test.attemptLimit === 'unlimited' ? 'Unlimited' : String(test.attemptLimit);
}

export default function StudentTestStorePage() {
  const user = useAuthStore((state) => state.user);
  const pushToast = useToastStore((state) => state.push);

  const [student, setStudent] = useState<Student | null>(null);
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [paidFilter, setPaidFilter] = useState<PaidFilter>('all');

  useEffect(() => {
    let active = true;
    if (!user?.studentId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    Promise.all([getStudentById(user.studentId), getTests()])
      .then(([studentData, testData]) => {
        if (!active) return;
        setStudent(studentData);
        setTests(testData);
      })
      .catch(() => {
        if (!active) return;
        pushToast({
          kind: 'error',
          title: 'Test store data load nahi ho paya.',
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

  const enrolledSet = useMemo(
    () => new Set(student?.enrolledTestIds || []),
    [student?.enrolledTestIds]
  );

  const filteredTests = useMemo(() => {
    if (paidFilter === 'free') return tests.filter((test) => !test.isPaid);
    if (paidFilter === 'paid') return tests.filter((test) => test.isPaid);
    return tests;
  }, [tests, paidFilter]);

  const counts = useMemo(
    () => ({
      all: tests.length,
      free: tests.filter((test) => !test.isPaid).length,
      paid: tests.filter((test) => test.isPaid).length,
    }),
    [tests]
  );

  const handleEnroll = async (test: Test) => {
    if (!user?.studentId || enrollingId) return;
    if (enrolledSet.has(test.id)) return;

    setEnrollingId(test.id);
    try {
      await enrollStudentInTest(user.studentId, test.id);
      setStudent((current) => {
        if (!current) {
          const fallbackId = user.studentId?.trim().toLowerCase() || '';
          return {
            id: fallbackId,
            name: user.name || 'Student',
            mobile: '',
            email: (user.email || fallbackId).trim().toLowerCase(),
            batchId: null,
            courseIds: [],
            enrolledTestIds: [test.id],
            status: 'active',
          };
        }
        return {
          ...current,
          enrolledTestIds: Array.from(new Set([...(current.enrolledTestIds || []), test.id])),
        };
      });
      pushToast({
        kind: 'success',
        title: `Enrolled in ${test.name}`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Enrollment failed';
      pushToast({
        kind: 'error',
        title: message,
      });
    } finally {
      setEnrollingId(null);
    }
  };

  return (
    <PageTransition>
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Test Store</h1>
            <p className="text-sm text-slate-500">
              All available tests from live database. Enroll from here.
            </p>
          </div>
          <Link href="/student/tests-enrolled">
            <Button variant="outline">Open Enrolled Tests</Button>
          </Link>
        </div>

        <Card className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={paidFilter === 'all' ? 'primary' : 'outline'}
              className="h-8 rounded-lg px-3 text-xs"
              onClick={() => setPaidFilter('all')}
            >
              All ({counts.all})
            </Button>
            <Button
              variant={paidFilter === 'free' ? 'primary' : 'outline'}
              className="h-8 rounded-lg px-3 text-xs"
              onClick={() => setPaidFilter('free')}
            >
              Free ({counts.free})
            </Button>
            <Button
              variant={paidFilter === 'paid' ? 'primary' : 'outline'}
              className="h-8 rounded-lg px-3 text-xs"
              onClick={() => setPaidFilter('paid')}
            >
              Paid ({counts.paid})
            </Button>
          </div>
        </Card>

        {loading ? (
          <Card>
            <p className="text-sm text-slate-600">Loading test store...</p>
          </Card>
        ) : filteredTests.length === 0 ? (
          <Card>
            <p className="text-sm text-slate-600">No tests available in this filter.</p>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredTests.map((test) => {
              const enrolled = enrolledSet.has(test.id);
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
                    <p>Attempt Limit: {attemptLimitLabel(test)}</p>
                    <p>
                      Window: {formatDate(test.startAt)} to {formatDate(test.endAt)}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-slate-500">
                      {enrolled
                        ? 'Already in your enrolled tests list.'
                        : 'Enroll now, then launch from Enrolled Tests.'}
                    </p>
                    <Button
                      variant={enrolled ? 'outline' : 'primary'}
                      className="h-8 rounded-lg px-3 text-xs"
                      onClick={() => handleEnroll(test)}
                      disabled={enrolled || enrollingId === test.id}
                    >
                      {enrolled
                        ? 'Enrolled'
                        : enrollingId === test.id
                          ? 'Enrolling...'
                          : test.isPaid
                            ? 'Buy & Enroll'
                            : 'Enroll Free'}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
