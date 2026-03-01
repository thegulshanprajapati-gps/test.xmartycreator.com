'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { MultiSelect } from '@/components/ui/multi-select';
import { Button } from '@/components/ui/button';
import { PageTransition } from '@/components/ui/page-transition';
import { getBatchById, updateBatch } from '@/services/batch-service';
import { getAttempts } from '@/services/result-service';
import { getStudents } from '@/services/student-service';
import { getTests } from '@/services/test-service';
import { Attempt, Batch, Student, Test } from '@/types';
import { useToastStore } from '@/store/toast-store';

export default function BatchDetailPage() {
  const params = useParams<{ id: string }>();
  const [batch, setBatch] = useState<Batch | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [studentIds, setStudentIds] = useState<string[]>([]);
  const [testIds, setTestIds] = useState<string[]>([]);
  const pushToast = useToastStore((state) => state.push);

  useEffect(() => {
    Promise.all([getBatchById(params.id), getStudents(), getTests(), getAttempts()]).then(
      ([batchData, studentsData, testsData, attemptsData]) => {
        setBatch(batchData);
        setStudents(studentsData);
        setTests(testsData);
        setAttempts(attemptsData);
        setStudentIds(batchData?.studentIds ?? []);
        setTestIds(batchData?.testIds ?? []);
      }
    );
  }, [params.id]);

  const performance = useMemo(() => {
    if (!batch) return { attempts: 0, avgScore: 0, avgAccuracy: 0 };
    const rows = attempts.filter((attempt) => studentIds.includes(attempt.studentId));
    const avgScore =
      rows.length > 0 ? rows.reduce((sum, entry) => sum + entry.score, 0) / rows.length : 0;
    const avgAccuracy =
      rows.length > 0
        ? rows.reduce((sum, entry) => sum + entry.accuracy, 0) / rows.length
        : 0;
    return {
      attempts: rows.length,
      avgScore: Number(avgScore.toFixed(1)),
      avgAccuracy: Number(avgAccuracy.toFixed(1)),
    };
  }, [attempts, studentIds, batch]);

  if (!batch) return null;

  return (
    <PageTransition>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{batch.name}</h1>
          <p className="text-sm text-slate-500">
            Add/remove students, assign tests and monitor batch performance.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <Card className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-700">Students in Batch</p>
              <MultiSelect
                options={students.map((student) => ({
                  value: student.id,
                  label: `${student.name} (${student.email})`,
                }))}
                value={studentIds}
                onChange={setStudentIds}
              />
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-700">Assigned Tests</p>
              <MultiSelect
                options={tests.map((test) => ({ value: test.id, label: test.name }))}
                value={testIds}
                onChange={setTestIds}
              />
            </div>
            <div className="flex justify-end">
              <Button
                onClick={async () => {
                  const updated = await updateBatch(batch.id, {
                    studentIds,
                    testIds,
                  });
                  setBatch(updated);
                  pushToast({ kind: 'success', title: 'Batch updated' });
                }}
              >
                Save Changes
              </Button>
            </div>
          </Card>

          <Card className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-800">Performance Summary</h3>
            <p className="text-sm text-slate-600">
              Total attempts: <span className="font-semibold">{performance.attempts}</span>
            </p>
            <p className="text-sm text-slate-600">
              Avg score: <span className="font-semibold">{performance.avgScore}</span>
            </p>
            <p className="text-sm text-slate-600">
              Avg accuracy:{' '}
              <span className="font-semibold">{performance.avgAccuracy}%</span>
            </p>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
}
