'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MultiSelect } from '@/components/ui/multi-select';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageTransition } from '@/components/ui/page-transition';
import { getBatches } from '@/services/batch-service';
import { getCourses } from '@/services/course-service';
import { getStudents } from '@/services/student-service';
import { getTestById, updateTest } from '@/services/test-service';
import { useToastStore } from '@/store/toast-store';
import { Batch, Course, Student, Test } from '@/types';

export default function AssignTestPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [test, setTest] = useState<Test | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const pushToast = useToastStore((state) => state.push);

  useEffect(() => {
    Promise.all([getTestById(params.id), getBatches(), getCourses(), getStudents()]).then(
      ([testData, batchData, courseData, studentData]) => {
        setTest(testData);
        setBatches(batchData);
        setCourses(courseData);
        setStudents(studentData);
        setSelectedBatchIds(testData?.allowedBatchIds ?? []);
        setSelectedCourseIds(testData?.allowedCourseIds ?? []);
      }
    );
  }, [params.id]);

  const impactedStudents = useMemo(
    () =>
      students.filter(
        (student) =>
          (student.batchId && selectedBatchIds.includes(student.batchId)) ||
          student.courseIds.some((courseId) => selectedCourseIds.includes(courseId))
      ),
    [students, selectedBatchIds, selectedCourseIds]
  );

  if (!test) return null;

  return (
    <PageTransition>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Assign Test</h1>
          <p className="text-sm text-slate-500">{test.name}</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <Card className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-800">Assign to Batches</p>
              <MultiSelect
                options={batches.map((batch) => ({ value: batch.id, label: batch.name }))}
                value={selectedBatchIds}
                onChange={setSelectedBatchIds}
              />
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-800">Assign to Courses</p>
              <MultiSelect
                options={courses.map((course) => ({ value: course.id, label: course.name }))}
                value={selectedCourseIds}
                onChange={setSelectedCourseIds}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => router.push('/admin/tests')}>
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  await updateTest(test.id, {
                    allowedBatchIds: selectedBatchIds,
                    allowedCourseIds: selectedCourseIds,
                  });
                  pushToast({ kind: 'success', title: 'Assignment saved' });
                  router.push('/admin/tests');
                }}
              >
                Save Assignment
              </Button>
            </div>
          </Card>

          <Card className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-800">Access Summary</h3>
            <p className="text-sm text-slate-600">
              Batches selected: <span className="font-semibold">{selectedBatchIds.length}</span>
            </p>
            <p className="text-sm text-slate-600">
              Courses selected: <span className="font-semibold">{selectedCourseIds.length}</span>
            </p>
            <p className="text-sm text-slate-600">
              Students with access: <span className="font-semibold">{impactedStudents.length}</span>
            </p>
            <div className="max-h-52 space-y-2 overflow-auto rounded-xl border border-slate-100 p-2">
              {impactedStudents.map((student) => (
                <div key={student.id} className="rounded-lg bg-slate-50 px-2 py-1 text-xs text-slate-700">
                  {student.name}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
}
