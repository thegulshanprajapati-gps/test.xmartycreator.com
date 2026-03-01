'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { DataTable, TableColumn } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageTransition } from '@/components/ui/page-transition';
import { getBatches } from '@/services/batch-service';
import { getCourses } from '@/services/course-service';
import { getAttemptsByTest } from '@/services/result-service';
import { getStudents } from '@/services/student-service';
import { getTestById } from '@/services/test-service';
import { Attempt, Batch, Course, Student, Test } from '@/types';
import { formatDate, formatDuration } from '@/utils/formatters';

type Row = {
  attempt: Attempt;
  student: Student | undefined;
  batch: Batch | undefined;
  courses: Course[];
};

export default function TestAttemptsPage() {
  const params = useParams<{ testId: string }>();
  const [test, setTest] = useState<Test | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    Promise.all([
      getTestById(params.testId),
      getAttemptsByTest(params.testId),
      getStudents(),
      getBatches(),
      getCourses(),
    ]).then(([testData, attemptsData, studentsData, batchesData, coursesData]) => {
      setTest(testData);
      setAttempts(attemptsData.filter((item) => item.status !== 'in_progress'));
      setStudents(studentsData);
      setBatches(batchesData);
      setCourses(coursesData);
    });
  }, [params.testId]);

  const rows = useMemo<Row[]>(
    () =>
      attempts.map((attempt) => {
        const student = students.find((item) => item.id === attempt.studentId);
        return {
          attempt,
          student,
          batch: batches.find((batch) => batch.id === student?.batchId),
          courses: courses.filter((course) => student?.courseIds.includes(course.id)),
        };
      }),
    [attempts, students, batches, courses]
  );

  const columns: TableColumn<Row>[] = [
    {
      key: 'student',
      header: 'Student',
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-semibold text-slate-900">{row.student?.name ?? row.attempt.studentId}</p>
          <p className="text-xs text-slate-500">{row.student?.email}</p>
        </div>
      ),
      sortValue: (row) => row.student?.name ?? row.attempt.studentId,
    },
    {
      key: 'batch',
      header: 'Batch',
      render: (row) => row.batch?.name ?? '-',
    },
    {
      key: 'course',
      header: 'Course',
      render: (row) => row.courses.map((course) => course.name).join(', ') || '-',
    },
    {
      key: 'score',
      header: 'Score',
      sortable: true,
      render: (row) => row.attempt.score,
      sortValue: (row) => row.attempt.score,
    },
    {
      key: 'accuracy',
      header: 'Accuracy',
      sortable: true,
      render: (row) => `${row.attempt.accuracy}%`,
      sortValue: (row) => row.attempt.accuracy,
    },
    {
      key: 'time',
      header: 'Time Taken',
      render: (row) => formatDuration(row.attempt.timeTakenSec),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge variant={row.attempt.status === 'auto_submitted' ? 'warning' : 'success'}>
          {row.attempt.status}
        </Badge>
      ),
    },
    {
      key: 'submitted',
      header: 'Submitted At',
      render: (row) => formatDate(row.attempt.submittedAt),
    },
    {
      key: 'view',
      header: 'View',
      render: (row) => (
        <Link href={`/admin/results/${params.testId}/attempt/${row.attempt.id}`}>
          <Button variant="outline" className="h-8 rounded-lg px-3 text-xs">
            View
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <PageTransition>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Attempts: {test?.name ?? params.testId}</h1>
          <p className="text-sm text-slate-500">Student wise attempt records and performance.</p>
        </div>
        <Card>
          <DataTable data={rows} columns={columns} />
        </Card>
      </div>
    </PageTransition>
  );
}
