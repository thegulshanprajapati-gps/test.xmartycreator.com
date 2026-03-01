'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { MultiSelect } from '@/components/ui/multi-select';
import { Button } from '@/components/ui/button';
import { PageTransition } from '@/components/ui/page-transition';
import { getCourseById, updateCourse } from '@/services/course-service';
import { getEnrollments } from '@/services/enrollment-service';
import { getStudents } from '@/services/student-service';
import { getTests } from '@/services/test-service';
import { Course, Enrollment, Student, Test } from '@/types';
import { useToastStore } from '@/store/toast-store';
import { formatCurrency } from '@/utils/formatters';

export default function CourseDetailPage() {
  const params = useParams<{ id: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [tests, setTests] = useState<Test[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const pushToast = useToastStore((state) => state.push);

  useEffect(() => {
    Promise.all([getCourseById(params.id), getTests(), getEnrollments(), getStudents()]).then(
      ([courseData, testData, enrollmentData, studentData]) => {
        setCourse(courseData);
        setTests(testData);
        setEnrollments(enrollmentData);
        setStudents(studentData);
        setSelectedTests(courseData?.testIds ?? []);
      }
    );
  }, [params.id]);

  const enrolledStudents = useMemo(() => {
    if (!course) return [];
    const ids = enrollments
      .filter((entry) => entry.courseIds.includes(course.id))
      .map((entry) => entry.studentId);
    return students.filter((student) => ids.includes(student.id));
  }, [course, enrollments, students]);

  if (!course) return null;

  return (
    <PageTransition>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{course.name}</h1>
          <p className="text-sm text-slate-500">{course.description}</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <Card className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-800">Assign Tests / Series</h3>
            <MultiSelect
              options={tests.map((test) => ({ value: test.id, label: test.name }))}
              value={selectedTests}
              onChange={setSelectedTests}
            />
            <div className="flex justify-end">
              <Button
                onClick={async () => {
                  const updated = await updateCourse(course.id, { testIds: selectedTests });
                  setCourse(updated);
                  pushToast({ kind: 'success', title: 'Course updated' });
                }}
              >
                Save Assignments
              </Button>
            </div>
          </Card>

          <Card className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-800">Course Stats</h3>
            <p className="text-sm text-slate-600">
              Price: <span className="font-semibold">{formatCurrency(course.price)}</span>
            </p>
            <p className="text-sm text-slate-600">
              Validity: <span className="font-semibold">{course.validityDays} days</span>
            </p>
            <p className="text-sm text-slate-600">
              Enrolled Students:{' '}
              <span className="font-semibold">{enrolledStudents.length}</span>
            </p>
            <div className="max-h-40 space-y-2 overflow-auto rounded-xl border border-slate-100 p-2">
              {enrolledStudents.map((student) => (
                <p key={student.id} className="text-xs text-slate-700">
                  {student.name}
                </p>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
}
