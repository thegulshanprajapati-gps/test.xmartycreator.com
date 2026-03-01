'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { questionSchema } from '@/utils/validators';
import { Question } from '@/types';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

type Values = z.infer<typeof questionSchema>;

export function QuestionForm({
  onSubmit,
}: {
  onSubmit: (payload: Omit<Question, 'id'>) => Promise<void>;
}) {
  const form = useForm<Values>({
    resolver: zodResolver(questionSchema),
    defaultValues: {
      type: 'MCQ',
      text: '',
      description: '',
      optionA: '',
      optionB: '',
      optionC: '',
      optionD: '',
      correctAnswer: '',
      explanation: '',
      difficulty: 'Easy',
      topic: '',
      subtopic: '',
      tags: '',
    },
  });

  const type = form.watch('type');

  return (
    <form
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5"
      onSubmit={form.handleSubmit(async (values) => {
        await onSubmit({
          type: values.type,
          text: values.text,
          description: values.description?.trim() || '',
          options:
            values.type === 'MCQ'
              ? [values.optionA, values.optionB, values.optionC, values.optionD].map((option) => option || '')
              : [],
          correctAnswer: values.correctAnswer,
          explanation: values.explanation,
          difficulty: values.difficulty,
          topic: values.topic,
          subtopic: values.subtopic,
          tags: (values.tags || '')
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean),
        });
        form.reset();
      })}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500">Question Type</label>
          <Select
            {...form.register('type')}
            options={[
              { value: 'MCQ', label: 'MCQ' },
              { value: 'Numeric', label: 'Numeric' },
            ]}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500">Difficulty</label>
          <Select
            {...form.register('difficulty')}
            options={[
              { value: 'Easy', label: 'Easy' },
              { value: 'Medium', label: 'Medium' },
              { value: 'Hard', label: 'Hard' },
            ]}
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-500">Question Text</label>
        <Textarea rows={3} {...form.register('text')} />
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-500">
          Question Description (optional)
        </label>
        <Textarea
          rows={2}
          {...form.register('description')}
          placeholder="Add context or scenario for this question"
        />
      </div>

      {type === 'MCQ' ? (
        <div className="grid gap-3 md:grid-cols-2">
          <Input placeholder="Option A" {...form.register('optionA')} />
          <Input placeholder="Option B" {...form.register('optionB')} />
          <Input placeholder="Option C" {...form.register('optionC')} />
          <Input placeholder="Option D" {...form.register('optionD')} />
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <Input placeholder="Correct answer" {...form.register('correctAnswer')} />
        <Input placeholder="Tags (comma separated)" {...form.register('tags')} />
        <Input placeholder="Topic" {...form.register('topic')} />
        <Input placeholder="Subtopic" {...form.register('subtopic')} />
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-500">Explanation</label>
        <Textarea rows={2} {...form.register('explanation')} />
      </div>

      <div className="flex justify-end">
        <Button type="submit">Save Question</Button>
      </div>
    </form>
  );
}
