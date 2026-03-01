'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { useToastStore } from '@/store/toast-store';
import { getTests } from '@/services/test-service';
import { Test } from '@/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, XCircle, Info } from 'lucide-react';

interface TestStatus {
  testId: string;
  allowed: boolean;
  reason: string;
  message: string;
  debug: {
    studentInfo: any;
    testInfo: any;
    enrollmentCheck: any;
    attemptsInfo: any;
    now: string;
  };
}

export default function TestDebugPage() {
  const user = useAuthStore((state) => state.user);
  const pushToast = useToastStore((state) => state.push);
  const [tests, setTests] = useState<Test[]>([]);
  const [statuses, setStatuses] = useState<Map<string, TestStatus>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const allTests = await getTests();
        setTests(allTests);

        // Check status for each test
        const statusMap = new Map<string, TestStatus>();
        for (const test of allTests) {
          try {
            const res = await fetch('/api/debug/test-status', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ testId: test.id }),
            });
            const data = (await res.json()) as TestStatus | { error: string };
            if ('error' in data) {
              pushToast({
                kind: 'error',
                title: `Error checking ${test.name}: ${data.error}`,
              });
            } else {
              statusMap.set(test.id, data);
            }
          } catch (err) {
            console.error(`Error checking test ${test.id}:`, err);
          }
        }
        setStatuses(statusMap);
      } catch (err) {
        pushToast({
          kind: 'error',
          title: 'Failed to load tests',
        });
      } finally {
        setLoading(false);
      }
    };

    if (user?.studentId) {
      fetchData();
    }
  }, [user?.studentId]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-lg bg-slate-200" />
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 py-8">
      <div>
        <h1 className="text-3xl font-bold">Test Status Checker</h1>
        <p className="text-sm text-slate-600 mt-2">
          Check why you cannot take a test with detailed diagnostic information.
        </p>
      </div>

      <div className="space-y-4">
        {tests.length === 0 ? (
          <Card className="text-center py-8">
            <p className="text-slate-500">No tests available</p>
          </Card>
        ) : (
          tests.map((test) => {
            const status = statuses.get(test.id);
            if (!status) return null;

            return (
              <Card key={test.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {status.allowed ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                      <h3 className="text-lg font-semibold">{test.name}</h3>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{status.message}</p>

                    {/* Debug Info */}
                    <div className="mt-4 space-y-3 rounded-lg bg-slate-50 p-4 text-xs font-mono text-slate-600">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-semibold mb-2">Test Info</h4>
                          <div className="space-y-1">
                            <div>
                              <span className="text-slate-500">Status:</span> {status.debug.testInfo.status}
                            </div>
                            <div>
                              <span className="text-slate-500">Questions:</span> {status.debug.testInfo.questionCount}
                            </div>
                            <div>
                              <span className="text-slate-500">Locked:</span> {status.debug.testInfo.isLocked ? 'Yes' : 'No'}
                            </div>
                            <div>
                              <span className="text-slate-500">Starts:</span>{' '}
                              {status.debug.testInfo.startAt
                                ? new Date(status.debug.testInfo.startAt).toLocaleString()
                                : 'No limit'}
                            </div>
                            <div>
                              <span className="text-slate-500">Ends:</span>{' '}
                              {status.debug.testInfo.endAt
                                ? new Date(status.debug.testInfo.endAt).toLocaleString()
                                : 'No limit'}
                            </div>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-semibold mb-2">Access Check</h4>
                          <div className="space-y-1">
                            <div>
                              <span className="text-slate-500">Batch Access:</span>{' '}
                              {status.debug.enrollmentCheck.hasBatchAccess ? '✓' : '✗'}
                            </div>
                            <div>
                              <span className="text-slate-500">Course Access:</span>{' '}
                              {status.debug.enrollmentCheck.hasCourseAccess ? '✓' : '✗'}
                            </div>
                            <div>
                              <span className="text-slate-500">Direct Enroll:</span>{' '}
                              {status.debug.enrollmentCheck.hasDirectEnrollment ? '✓' : '✗'}
                            </div>
                            <div>
                              <span className="text-slate-500">Attempts Used:</span>{' '}
                              {status.debug.attemptsInfo.completedAttempts}/{status.debug.attemptsInfo.attemptLimit}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-200 text-xs text-slate-500">
                        <div>Current Time: {new Date(status.debug.now).toLocaleString()}</div>
                      </div>
                    </div>
                  </div>

                  {status.allowed && (
                    <Button className="ml-4">Take Test</Button>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Legend */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <h3 className="font-semibold flex items-center gap-2 mb-3">
          <Info className="h-5 w-5" />
          Why can't you take a test?
        </h3>
        <div className="text-sm space-y-2 text-slate-700">
          <div>
            <span className="font-semibold">✗ Test not published:</span> Test status is not "Published"
          </div>
          <div>
            <span className="font-semibold">✗ No questions:</span> Test has 0 questions assigned
          </div>
          <div>
            <span className="font-semibold">✗ Not assigned:</span> You're not enrolled in batch/course that this test is assigned to
          </div>
          <div>
            <span className="font-semibold">✗ Window not started:</span> Test start time is in the future
          </div>
          <div>
            <span className="font-semibold">✗ Window expired:</span> Test end time has passed
          </div>
          <div>
            <span className="font-semibold">✗ Attempts exceeded:</span> You've used all your attempts
          </div>
          <div>
            <span className="font-semibold">✗ Test locked:</span> Admin has locked this test
          </div>
        </div>
      </Card>
    </div>
  );
}
