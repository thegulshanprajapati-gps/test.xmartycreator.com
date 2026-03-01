'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { courseSchema } from '@/utils/validators';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageTransition } from '@/components/ui/page-transition';
import { createCourse } from '@/services/course-service';
import { useToastStore } from '@/store/toast-store';

type Values = z.infer<typeof courseSchema>;

export default function CreateCoursePage() {
  const router = useRouter();
  const pushToast = useToastStore((state) => state.push);
  const form = useForm<Values>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      name: '',
      description: '',
      validityDays: 120,
      price: 999,
    },
  });

  return (
    <PageTransition>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Create Course</h1>
          <p className="text-sm text-slate-500">Add course metadata and pricing.</p>
        </div>
        <Card>
          <form
            className="grid gap-4"
            onSubmit={form.handleSubmit(async (values) => {
              await createCourse(values);
              pushToast({ kind: 'success', title: 'Course created' });
              router.push('/admin/courses');
            })}
          >
            <Input {...form.register('name')} placeholder="Course name" />
            <Textarea {...form.register('description')} rows={4} placeholder="Description" />
            <div className="grid gap-3 md:grid-cols-2">
              <Input type="number" {...form.register('validityDays')} placeholder="Validity days" />
              <Input type="number" {...form.register('price')} placeholder="Price" />
            </div>
            <div className="flex justify-end">
              <Button type="submit">Create Course</Button>
            </div>
          </form>
        </Card>
      </div>
    </PageTransition>
  );
}
