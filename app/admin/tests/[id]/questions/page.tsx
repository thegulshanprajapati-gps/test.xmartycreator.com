'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { QuestionForm } from '@/components/admin/question-form';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MultiSelect } from '@/components/ui/multi-select';
import { PageTransition } from '@/components/ui/page-transition';
import { createQuestion, getQuestions } from '@/services/question-service';
import { getTestById, updateTest } from '@/services/test-service';
import { useToastStore } from '@/store/toast-store';
import { Question, Test, TestSection } from '@/types';
import { createId } from '@/utils/helpers';

function syncSectionsWithQuestions(
  sections: TestSection[],
  selectedQuestionIds: string[],
  marksPerQuestion: number
) {
  if (sections.length === 0) {
    return [
      {
        id: createId('sec'),
        name: 'General',
        questionCount: selectedQuestionIds.length,
        sectionMarks: selectedQuestionIds.length * marksPerQuestion,
        sectionTimerMin: 0,
        questionIds: selectedQuestionIds,
      },
    ];
  }

  const selected = new Set(selectedQuestionIds);
  const used = new Set<string>();

  const nextSections = sections.map((section) => {
    const kept = section.questionIds.filter((id) => selected.has(id) && !used.has(id));
    kept.forEach((id) => used.add(id));
    return {
      ...section,
      questionIds: kept,
      questionCount: kept.length,
      sectionMarks: kept.length * marksPerQuestion,
    };
  });

  const leftovers = selectedQuestionIds.filter((id) => !used.has(id));
  if (leftovers.length > 0) {
    nextSections[0] = {
      ...nextSections[0],
      questionIds: [...nextSections[0].questionIds, ...leftovers],
      questionCount: nextSections[0].questionIds.length + leftovers.length,
      sectionMarks:
        (nextSections[0].questionIds.length + leftovers.length) * marksPerQuestion,
    };
  }

  return nextSections;
}

export default function TestQuestionsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const pushToast = useToastStore((state) => state.push);
  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    Promise.all([getTestById(params.id), getQuestions()]).then(([testData, questionData]) => {
      setTest(testData);
      setQuestions(questionData);
      setSelectedQuestionIds(testData?.questionIds ?? []);
    });
  }, [params.id]);

  const selectedQuestions = useMemo(() => {
    const selected = new Set(selectedQuestionIds);
    return questions.filter((question) => selected.has(question.id));
  }, [questions, selectedQuestionIds]);

  if (!test) return null;

  return (
    <PageTransition>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Test Questions</h1>
            <p className="text-sm text-slate-500">
              {test.name} ke liye questions create aur assign karein.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href={`/admin/tests/${test.id}/edit`}>
              <Button variant="outline">
                <ArrowLeft size={14} className="mr-1.5" /> Back to Test
              </Button>
            </Link>
            <Button
              disabled={saving}
              onClick={async () => {
                setSaving(true);
                try {
                  await updateTest(test.id, {
                    questionIds: selectedQuestionIds,
                    sections: syncSectionsWithQuestions(
                      test.sections,
                      selectedQuestionIds,
                      test.marksPerQuestion
                    ),
                  });
                  pushToast({ kind: 'success', title: 'Test questions saved' });
                  router.push('/admin/tests');
                } finally {
                  setSaving(false);
                }
              }}
            >
              {saving ? 'Saving...' : 'Save Questions'}
            </Button>
          </div>
        </div>

        <Card className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-800">Assign Existing Questions</h2>
          <MultiSelect
            options={questions.map((question) => ({
              value: question.id,
              label: `${question.topic}: ${question.text.slice(0, 64)}${
                question.text.length > 64 ? '...' : ''
              }`,
            }))}
            value={selectedQuestionIds}
            onChange={setSelectedQuestionIds}
            placeholder="Question bank se select karein"
          />
          <p className="text-xs text-slate-500">
            Selected: {selectedQuestionIds.length} question(s)
          </p>
        </Card>

        <Card className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-800">Create New Question For This Test</h2>
          {creating ? (
            <p className="text-xs text-slate-500">Saving new question...</p>
          ) : null}
          <QuestionForm
            onSubmit={async (payload) => {
              setCreating(true);
              try {
                const created = await createQuestion(payload);
                setQuestions((prev) => [created, ...prev]);
                setSelectedQuestionIds((prev) =>
                  prev.includes(created.id) ? prev : [...prev, created.id]
                );
                pushToast({
                  kind: 'success',
                  title: 'Question created and attached to test',
                });
              } finally {
                setCreating(false);
              }
            }}
          />
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-slate-800">Selected Question Preview</h2>
          <div className="space-y-2">
            {selectedQuestions.length === 0 ? (
              <p className="text-sm text-slate-500">No questions selected yet.</p>
            ) : (
              selectedQuestions.map((question, index) => (
                <div key={question.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <p className="text-sm font-semibold text-slate-900">
                    Q{index + 1}. {question.text}
                  </p>
                  {question.description ? (
                    <p className="mt-1 text-xs text-slate-600">{question.description}</p>
                  ) : null}
                  <p className="mt-1 text-xs text-slate-500">
                    {question.topic} / {question.subtopic} / {question.difficulty}
                  </p>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </PageTransition>
  );
}
