'use client';

import { useRouter } from 'next/navigation';
import { QuestionForm } from '@/components/admin/question-form';
import { PageTransition } from '@/components/ui/page-transition';
import { createQuestion } from '@/services/question-service';
import { useToastStore } from '@/store/toast-store';

export default function CreateQuestionPage() {
  const router = useRouter();
  const pushToast = useToastStore((state) => state.push);

  return (
    <PageTransition>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Create Question</h1>
          <p className="text-sm text-slate-500">
            Add MCQ or numeric question to the central bank.
          </p>
        </div>
        <QuestionForm
          onSubmit={async (payload) => {
            await createQuestion(payload);
            pushToast({ kind: 'success', title: 'Question created' });
            router.push('/admin/questions');
          }}
        />
      </div>
    </PageTransition>
  );
}
