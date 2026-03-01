'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Copy, Lock, LockOpen, Pencil, PlusCircle, ListChecks } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable, TableColumn } from '@/components/ui/table';
import { TestFilters } from '@/components/admin/test-filters';
import { PageTransition } from '@/components/ui/page-transition';
import { getBatches } from '@/services/batch-service';
import { getCourses } from '@/services/course-service';
import { duplicateTest, getTests, toggleLock, togglePublish } from '@/services/test-service';
import { Batch, Course, Test } from '@/types';
import { useTestFiltersStore } from '@/store/filters-store';
import { useToastStore } from '@/store/toast-store';

export default function AdminTestsPage() {
  const [tests, setTests] = useState<Test[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const filters = useTestFiltersStore((state) => state);
  const pushToast = useToastStore((state) => state.push);

  const load = async () => {
    const [testData, batchData, courseData] = await Promise.all([
      getTests({
        status: filters.status,
        batchId: filters.batchId,
        courseId: filters.courseId,
        paid: filters.paid,
        query: filters.query,
      }),
      getBatches(),
      getCourses(),
    ]);
    setTests(testData);
    setBatches(batchData);
    setCourses(courseData);
  };

  useEffect(() => {
    load();
  }, [filters.status, filters.batchId, filters.courseId, filters.paid, filters.query]);

  const batchMap = useMemo(
    () => new Map(batches.map((batch) => [batch.id, batch.name])),
    [batches]
  );
  const courseMap = useMemo(
    () => new Map(courses.map((course) => [course.id, course.name])),
    [courses]
  );

  const columns: TableColumn<Test>[] = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-semibold text-slate-900">{row.name}</p>
          <p className="text-xs text-slate-500">{row.category}</p>
        </div>
      ),
      sortValue: (row) => row.name,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row) => {
        const variant =
          row.status === 'Published'
            ? 'success'
            : row.status === 'Scheduled'
              ? 'info'
              : row.status === 'Expired'
                ? 'warning'
                : 'default';
        return <Badge variant={variant}>{row.status}</Badge>;
      },
      sortValue: (row) => row.status,
    },
    {
      key: 'duration',
      header: 'Duration',
      sortable: true,
      render: (row) => `${row.durationMin} min`,
      sortValue: (row) => row.durationMin,
    },
    {
      key: 'questions',
      header: 'Questions',
      render: (row) => row.questionIds.length,
      sortValue: (row) => row.questionIds.length,
      sortable: true,
    },
    {
      key: 'marks',
      header: 'Marks',
      render: (row) => row.totalMarks,
      sortValue: (row) => row.totalMarks,
      sortable: true,
    },
    {
      key: 'access',
      header: 'Allowed Batches/Courses',
      render: (row) => (
        <div className="space-y-1 text-xs">
          <p className="text-slate-600">
            Batches:{' '}
            {row.allowedBatchIds.length
              ? row.allowedBatchIds.map((id) => batchMap.get(id) || id).join(', ')
              : 'None'}
          </p>
          <p className="text-slate-600">
            Courses:{' '}
            {row.allowedCourseIds.length
              ? row.allowedCourseIds.map((id) => courseMap.get(id) || id).join(', ')
              : 'None'}
          </p>
        </div>
      ),
    },
    {
      key: 'attempts',
      header: 'Attempts',
      sortable: true,
      render: (row) => row.attemptsCount,
      sortValue: (row) => row.attemptsCount,
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'w-[360px]',
      render: (row) => (
        <div className="flex flex-wrap gap-1.5">
          <Link href={`/admin/tests/${row.id}/edit`}>
            <Button variant="outline" className="h-8 rounded-lg px-2 text-xs">
              <Pencil size={12} className="mr-1" /> Edit
            </Button>
          </Link>
          <Link href={`/admin/tests/${row.id}/questions`}>
            <Button variant="outline" className="h-8 rounded-lg px-2 text-xs">
              <ListChecks size={12} className="mr-1" /> Questions
            </Button>
          </Link>
          <Link href={`/admin/tests/${row.id}/assign`}>
            <Button variant="outline" className="h-8 rounded-lg px-2 text-xs">
              Assign
            </Button>
          </Link>
          <Button
            variant="outline"
            className="h-8 rounded-lg px-2 text-xs"
            onClick={async () => {
              await duplicateTest(row.id);
              pushToast({ kind: 'success', title: 'Test duplicated' });
              await load();
            }}
          >
            <Copy size={12} className="mr-1" /> Duplicate
          </Button>
          <Button
            variant="outline"
            className="h-8 rounded-lg px-2 text-xs"
            onClick={async () => {
              await togglePublish(row.id);
              pushToast({ kind: 'info', title: `Test ${row.status === 'Published' ? 'unpublished' : 'published'}` });
              await load();
            }}
          >
            {row.status === 'Published' ? 'Unpublish' : 'Publish'}
          </Button>
          <Button
            variant="outline"
            className="h-8 rounded-lg px-2 text-xs"
            onClick={async () => {
              await toggleLock(row.id);
              pushToast({
                kind: 'info',
                title: row.isLocked ? 'Test unlocked' : 'Test locked',
              });
              await load();
            }}
          >
            {row.isLocked ? (
              <>
                <LockOpen size={12} className="mr-1" /> Unlock
              </>
            ) : (
              <>
                <Lock size={12} className="mr-1" /> Lock
              </>
            )}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <PageTransition>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Test Management</h1>
            <p className="text-sm text-slate-500">
              Manage test lifecycle, access, and publishing actions.
            </p>
          </div>
          <Link href="/admin/tests/create">
            <Button>
              <PlusCircle size={16} className="mr-1.5" /> Create Test
            </Button>
          </Link>
        </div>

        <TestFilters
          batchOptions={batches.map((batch) => ({ value: batch.id, label: batch.name }))}
          courseOptions={courses.map((course) => ({ value: course.id, label: course.name }))}
        />

        <DataTable data={tests} columns={columns} emptyText="No tests match current filters." />
      </div>
    </PageTransition>
  );
}
