'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageTransition } from '@/components/ui/page-transition';
import { useAuthStore } from '@/store/auth-store';
import { getBatchById } from '@/services/batch-service';
import { getStudentById } from '@/services/student-service';
import { getTests } from '@/services/test-service';
import { Batch, Student, Test } from '@/types';
import { formatShortDate } from '@/utils/formatters';

export default function StudentBatchPage() {
  const user = useAuthStore((state) => state.user);
  const [student, setStudent] = useState<Student | null>(null);
  const [batch, setBatch] = useState<Batch | null>(null);
  const [tests, setTests] = useState<Test[]>([]);

  useEffect(() => {
    if (!user?.studentId) return;
    getStudentById(user.studentId).then((studentData) => {
      setStudent(studentData);
      if (studentData?.batchId) {
        getBatchById(studentData.batchId).then(setBatch);
      }
    });
    getTests().then(setTests);
  }, [user?.studentId]);

  const assignedTests = useMemo(
    () => {
      if (!batch) return [];
      return tests.filter(
        (test) =>
          batch.testIds.includes(test.id) || test.allowedBatchIds.includes(batch.id)
      );
    },
    [tests, batch]
  );

  return (
    <PageTransition>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Batch</h1>
          <p className="text-sm text-slate-500">Batch validity and assigned tests overview.</p>
        </div>

        {!batch ? (
          <Card>
            <p className="text-sm text-slate-600">No active batch assigned to your profile.</p>
          </Card>
        ) : (
          <>
            <Card className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-900">{batch.name}</h2>
              <p className="text-sm text-slate-600">
                Validity: {formatShortDate(batch.startAt)} - {formatShortDate(batch.endAt)}
              </p>
              <p className="text-sm text-slate-600">
                Students in batch: <span className="font-semibold">{batch.studentIds.length}</span>
              </p>
            </Card>

            <Card>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-800">Assigned Tests</h3>
                <Badge variant="default">{assignedTests.length}</Badge>
              </div>
              {assignedTests.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No tests assigned to this batch yet.
                </p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {assignedTests.map((test) => (
                    <div key={test.id} className="rounded-xl border border-slate-100 p-3">
                      <p className="font-semibold text-slate-900">{test.name}</p>
                      <p className="text-xs text-slate-500">{test.durationMin} mins</p>
                      <Badge className="mt-2" variant={test.status === 'Published' ? 'success' : 'warning'}>
                        {test.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </PageTransition>
  );
}
