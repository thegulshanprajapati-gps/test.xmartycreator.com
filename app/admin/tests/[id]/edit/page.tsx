'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { TestForm } from '@/components/admin/test-form';
import { PageTransition } from '@/components/ui/page-transition';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { getTestById, updateTest } from '@/services/test-service';
import { useToastStore } from '@/store/toast-store';
import { Test } from '@/types';

export default function EditTestPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [test, setTest] = useState<Test | null>(null);
  const pushToast = useToastStore((state) => state.push);

  useEffect(() => {
    getTestById(params.id).then((data) => setTest(data));
  }, [params.id]);

  if (!test) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Edit Test</h1>
          <p className="text-sm text-slate-500">ID: {test.id}</p>
        </div>
        <Link href={`/admin/tests/${test.id}/questions`}>
          <Button variant="outline" className="mb-1">
            Manage Questions
          </Button>
        </Link>
        <TestForm
          initial={test}
          onSubmit={async (payload) => {
            await updateTest(test.id, payload);
            pushToast({ kind: 'success', title: 'Test updated' });
            router.push('/admin/tests');
          }}
        />
      </div>
    </PageTransition>
  );
}
