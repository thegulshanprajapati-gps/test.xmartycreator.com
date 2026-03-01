'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { PageTransition } from '@/components/ui/page-transition';
import { createBatch } from '@/services/batch-service';
import { useToastStore } from '@/store/toast-store';
import { batchSchema } from '@/utils/validators';

type Values = z.infer<typeof batchSchema>;

export default function CreateBatchPage() {
  const router = useRouter();
  const pushToast = useToastStore((state) => state.push);
  const form = useForm<Values>({
    resolver: zodResolver(batchSchema),
    defaultValues: {
      name: '',
      startAt: '',
      endAt: '',
    },
  });

  return (
    <PageTransition>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Create Batch</h1>
          <p className="text-sm text-slate-500">Define validity and activate batch workflow.</p>
        </div>
        <Card>
          <form
            className="grid gap-4 md:grid-cols-3"
            onSubmit={form.handleSubmit(async (values) => {
              await createBatch({
                name: values.name,
                startAt: new Date(values.startAt).toISOString(),
                endAt: new Date(values.endAt).toISOString(),
              });
              pushToast({ kind: 'success', title: 'Batch created' });
              router.push('/admin/batches');
            })}
          >
            <Input {...form.register('name')} placeholder="Batch name" />
            <Input type="date" {...form.register('startAt')} />
            <Input type="date" {...form.register('endAt')} />
            <div className="md:col-span-3 flex justify-end">
              <Button type="submit">Create Batch</Button>
            </div>
          </form>
        </Card>
      </div>
    </PageTransition>
  );
}
