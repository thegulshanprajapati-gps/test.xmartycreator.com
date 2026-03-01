'use client';

import { useRouter } from 'next/navigation';
import { TestForm } from '@/components/admin/test-form';
import { PageTransition } from '@/components/ui/page-transition';
import { createTest } from '@/services/test-service';
import { useToastStore } from '@/store/toast-store';
import { Test } from '@/types';

export default function CreateTestPage() {
  const router = useRouter();
  const pushToast = useToastStore((state) => state.push);

  return (
    <PageTransition>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Create Test</h1>
          <p className="text-sm text-slate-500">
            Configure test rules, sections, availability and scoring.
          </p>
        </div>
        <TestForm
          onSubmit={async (payload) => {
            const created = await createTest(payload as Omit<Test, 'id' | 'attemptsCount'>);
            pushToast({
              kind: 'success',
              title: 'Test created. Ab isme questions add karein.',
            });
            router.push(`/admin/tests/${created.id}/questions`);
          }}
        />
      </div>
    </PageTransition>
  );
}
