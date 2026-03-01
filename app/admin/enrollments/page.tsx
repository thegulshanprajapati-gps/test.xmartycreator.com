'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable, TableColumn } from '@/components/ui/table';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { MultiSelect } from '@/components/ui/multi-select';
import { Card } from '@/components/ui/card';
import { PageTransition } from '@/components/ui/page-transition';
import { getBatches } from '@/services/batch-service';
import { getCourses } from '@/services/course-service';
import { getEnrollments, updateEnrollment } from '@/services/enrollment-service';
import { getStudents } from '@/services/student-service';
import { Batch, Course, Enrollment, Student } from '@/types';
import { useToastStore } from '@/store/toast-store';

type Row = {
  enrollment: Enrollment;
  student: Student | undefined;
  batch: Batch | undefined;
  courses: Course[];
};

export default function EnrollmentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [editing, setEditing] = useState<Enrollment | null>(null);
  const [editBatch, setEditBatch] = useState<string>('none');
  const [editCourses, setEditCourses] = useState<string[]>([]);
  const [editStatus, setEditStatus] = useState<Enrollment['status']>('active');
  const pushToast = useToastStore((state) => state.push);

  const load = () => {
    Promise.all([getStudents(), getBatches(), getCourses(), getEnrollments()]).then(
      ([studentData, batchData, courseData, enrollmentData]) => {
        setStudents(studentData);
        setBatches(batchData);
        setCourses(courseData);
        setEnrollments(enrollmentData);
      }
    );
  };

  useEffect(() => {
    load();
  }, []);

  const rows = useMemo<Row[]>(
    () =>
      enrollments.map((enrollment) => {
        const student = students.find((item) => item.id === enrollment.studentId);
        return {
          enrollment,
          student,
          batch: batches.find((item) => item.id === enrollment.batchId),
          courses: courses.filter((course) => enrollment.courseIds.includes(course.id)),
        };
      }),
    [enrollments, students, batches, courses]
  );

  const columns: TableColumn<Row>[] = [
    {
      key: 'student',
      header: 'Student',
      render: (row) => (
        <div>
          <p className="font-semibold text-slate-900">{row.student?.name ?? row.enrollment.studentId}</p>
          <p className="text-xs text-slate-500">{row.student?.email}</p>
        </div>
      ),
      sortable: true,
      sortValue: (row) => row.student?.name ?? '',
    },
    {
      key: 'batch',
      header: 'Batch',
      render: (row) => row.batch?.name ?? '-',
    },
    {
      key: 'courses',
      header: 'Courses',
      render: (row) => row.courses.map((course) => course.name).join(', ') || '-',
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge variant={row.enrollment.status === 'active' ? 'success' : 'warning'}>
          {row.enrollment.status}
        </Badge>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      render: (row) => (
        <Button
          variant="outline"
          className="h-8 rounded-lg px-3 text-xs"
          onClick={() => {
            setEditing(row.enrollment);
            setEditBatch(row.enrollment.batchId ?? 'none');
            setEditCourses(row.enrollment.courseIds);
            setEditStatus(row.enrollment.status);
          }}
        >
          Edit
        </Button>
      ),
    },
  ];

  return (
    <PageTransition>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Enrollments</h1>
          <p className="text-sm text-slate-500">
            Map students to batches and courses with status control.
          </p>
        </div>
        <Card>
          <DataTable data={rows} columns={columns} />
        </Card>

        <Modal
          open={Boolean(editing)}
          title="Edit Enrollment"
          onClose={() => setEditing(null)}
        >
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Batch</label>
              <Select
                value={editBatch}
                onChange={(event) => setEditBatch(event.target.value)}
                options={[
                  { value: 'none', label: 'No Batch' },
                  ...batches.map((batch) => ({ value: batch.id, label: batch.name })),
                ]}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Courses</label>
              <MultiSelect
                options={courses.map((course) => ({ value: course.id, label: course.name }))}
                value={editCourses}
                onChange={setEditCourses}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Status</label>
              <Select
                value={editStatus}
                onChange={(event) =>
                  setEditStatus(event.target.value as Enrollment['status'])
                }
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'expired', label: 'Expired' },
                ]}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!editing) return;
                  await updateEnrollment(editing.id, {
                    batchId: editBatch === 'none' ? null : editBatch,
                    courseIds: editCourses,
                    status: editStatus,
                  });
                  setEditing(null);
                  pushToast({ kind: 'success', title: 'Enrollment updated' });
                  load();
                }}
              >
                Save
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </PageTransition>
  );
}
