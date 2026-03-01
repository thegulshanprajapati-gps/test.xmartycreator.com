'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';
import { z } from 'zod';
import { Test, TestSection } from '@/types';
import { testSchema } from '@/utils/validators';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { createId } from '@/utils/helpers';

type Values = z.infer<typeof testSchema>;

const defaultValues: Values = {
  name: '',
  category: '',
  durationMin: 60,
  totalMarks: 100,
  marksPerQuestion: 4,
  negativeMarking: true,
  negativeMarksValue: 1,
  startAt: '',
  endAt: '',
  attemptLimit: 1,
  shuffleQuestions: true,
  shuffleOptions: true,
  instructions: '',
  isPaid: false,
  price: 0,
};

export function TestForm({
  initial,
  onSubmit,
}: {
  initial?: Test | null;
  onSubmit: (payload: Omit<Test, 'id' | 'attemptsCount'>) => Promise<void>;
}) {
  const form = useForm<Values>({
    resolver: zodResolver(testSchema),
    defaultValues: initial
      ? {
          name: initial.name,
          category: initial.category,
          durationMin: initial.durationMin,
          totalMarks: initial.totalMarks,
          marksPerQuestion: initial.marksPerQuestion,
          negativeMarking: initial.negativeMarking,
          negativeMarksValue: initial.negativeMarksValue,
          startAt: initial.startAt ?? '',
          endAt: initial.endAt ?? '',
          attemptLimit: initial.attemptLimit === 'unlimited' ? 'unlimited' : initial.attemptLimit,
          shuffleQuestions: initial.shuffleQuestions,
          shuffleOptions: initial.shuffleOptions,
          instructions: initial.instructions,
          isPaid: initial.isPaid,
          price: initial.price,
        }
      : defaultValues,
  });

  const [status, setStatus] = useState<Test['status']>(initial?.status ?? 'Draft');
  const [sections, setSections] = useState<TestSection[]>(
    initial?.sections?.length
      ? initial.sections
      : [
          {
            id: createId('sec'),
            name: 'General',
            questionCount: 10,
            sectionMarks: 40,
            sectionTimerMin: 0,
            questionIds: [],
          },
        ]
  );
  const [singleSection, setSingleSection] = useState(sections.length <= 1);
  const [submitting, setSubmitting] = useState(false);

  const addSection = () => {
    setSections((prev) => [
      ...prev,
      {
        id: createId('sec'),
        name: `Section ${prev.length + 1}`,
        questionCount: 5,
        sectionMarks: 20,
        sectionTimerMin: 0,
        questionIds: [],
      },
    ]);
  };

  return (
    <form
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5"
      onSubmit={form.handleSubmit(async (values) => {
        setSubmitting(true);
        try {
          const payload: Omit<Test, 'id' | 'attemptsCount'> = {
            name: values.name,
            category: values.category,
            status,
            durationMin: values.durationMin,
            totalMarks: values.totalMarks,
            marksPerQuestion: values.marksPerQuestion,
            negativeMarking: values.negativeMarking,
            negativeMarksValue: values.negativeMarking ? values.negativeMarksValue : 0,
            sections: singleSection ? [sections[0]] : sections,
            startAt: values.startAt ? new Date(values.startAt).toISOString() : null,
            endAt: values.endAt ? new Date(values.endAt).toISOString() : null,
            attemptLimit: values.attemptLimit,
            shuffleQuestions: values.shuffleQuestions,
            shuffleOptions: values.shuffleOptions,
            instructions: values.instructions,
            allowedBatchIds: initial?.allowedBatchIds ?? [],
            allowedCourseIds: initial?.allowedCourseIds ?? [],
            isPaid: values.isPaid,
            price: values.isPaid ? values.price : 0,
            isLocked: initial?.isLocked ?? false,
            questionIds: initial?.questionIds ?? [],
          };
          await onSubmit(payload);
        } finally {
          setSubmitting(false);
        }
      })}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500">Test Name</label>
          <Input {...form.register('name')} placeholder="e.g. Algebra Weekly Mock" />
          {form.formState.errors.name ? (
            <p className="mt-1 text-xs text-red-600">{form.formState.errors.name.message}</p>
          ) : null}
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500">Category</label>
          <Input {...form.register('category')} placeholder="e.g. Mathematics" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500">Status</label>
          <Select
            value={status}
            onChange={(event) => setStatus(event.target.value as Test['status'])}
            options={[
              { value: 'Draft', label: 'Draft' },
              { value: 'Published', label: 'Published' },
              { value: 'Scheduled', label: 'Scheduled' },
              { value: 'Expired', label: 'Expired' },
            ]}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500">Duration (mins)</label>
          <Input type="number" {...form.register('durationMin')} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500">Total Marks</label>
          <Input type="number" {...form.register('totalMarks')} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500">Marks per Question</label>
          <Input type="number" {...form.register('marksPerQuestion')} />
        </div>
      </div>

      <div className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-4">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" {...form.register('negativeMarking')} />
          Negative Marking
        </label>
        <Input type="number" {...form.register('negativeMarksValue')} placeholder="Negative marks" />
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" {...form.register('shuffleQuestions')} />
          Shuffle Questions
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" {...form.register('shuffleOptions')} />
          Shuffle Options
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500">Start At</label>
          <Input type="datetime-local" {...form.register('startAt')} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500">End At</label>
          <Input type="datetime-local" {...form.register('endAt')} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500">Attempt Limit</label>
          <Select
            {...form.register('attemptLimit')}
            options={[
              { value: '1', label: '1' },
              { value: '2', label: '2' },
              { value: 'unlimited', label: 'Unlimited' },
            ]}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="col-span-2 mb-1 block text-xs font-semibold text-slate-500">
            Pricing
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" {...form.register('isPaid')} />
            Paid
          </label>
          <Input type="number" {...form.register('price')} placeholder="Price" />
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-800">Section Builder</p>
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={!singleSection}
              onChange={(event) => setSingleSection(!event.target.checked)}
            />
            Multi-section mode
          </label>
        </div>
        {sections.map((section, index) => (
          <div key={section.id} className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-4">
            <Input
              value={section.name}
              onChange={(event) =>
                setSections((prev) =>
                  prev.map((entry, i) =>
                    i === index ? { ...entry, name: event.target.value } : entry
                  )
                )
              }
              placeholder="Section name"
            />
            <Input
              type="number"
              value={section.questionCount}
              onChange={(event) =>
                setSections((prev) =>
                  prev.map((entry, i) =>
                    i === index
                      ? { ...entry, questionCount: Number(event.target.value) || 0 }
                      : entry
                  )
                )
              }
              placeholder="Question count"
            />
            <Input
              type="number"
              value={section.sectionMarks}
              onChange={(event) =>
                setSections((prev) =>
                  prev.map((entry, i) =>
                    i === index
                      ? { ...entry, sectionMarks: Number(event.target.value) || 0 }
                      : entry
                  )
                )
              }
              placeholder="Section marks"
            />
            <div className="flex gap-2">
              <Input
                type="number"
                value={section.sectionTimerMin ?? 0}
                onChange={(event) =>
                  setSections((prev) =>
                    prev.map((entry, i) =>
                      i === index
                        ? { ...entry, sectionTimerMin: Number(event.target.value) || 0 }
                        : entry
                    )
                  )
                }
                placeholder="Timer mins"
              />
              {!singleSection ? (
                <Button
                  variant="outline"
                  className="h-10 w-10 p-0"
                  onClick={() =>
                    setSections((prev) => prev.filter((_, i) => i !== index))
                  }
                >
                  <Trash2 size={16} />
                </Button>
              ) : null}
            </div>
          </div>
        ))}
        {!singleSection ? (
          <Button variant="outline" onClick={addSection}>
            <Plus size={14} className="mr-1" /> Add Section
          </Button>
        ) : null}
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-500">Instructions</label>
        <Textarea rows={4} {...form.register('instructions')} placeholder="Write test instructions..." />
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving...' : 'Save Test'}
        </Button>
      </div>
    </form>
  );
}
