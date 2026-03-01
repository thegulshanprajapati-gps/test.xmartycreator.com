'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { PlusCircle, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable, TableColumn } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { PageTransition } from '@/components/ui/page-transition';
import { getQuestions } from '@/services/question-service';
import { Question } from '@/types';

export default function AdminQuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [topic, setTopic] = useState('all');
  const [difficulty, setDifficulty] = useState('all');
  const [type, setType] = useState('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    getQuestions().then(setQuestions);
  }, []);

  const topics = useMemo(
    () =>
      Array.from(new Set(questions.map((question) => question.topic))).map((item) => ({
        value: item,
        label: item,
      })),
    [questions]
  );

  const filtered = useMemo(
    () =>
      questions.filter((question) => {
        const topicMatch = topic === 'all' || question.topic === topic;
        const diffMatch = difficulty === 'all' || question.difficulty === difficulty;
        const typeMatch = type === 'all' || question.type === type;
        const queryMatch =
          !query.trim() || question.text.toLowerCase().includes(query.toLowerCase());
        return topicMatch && diffMatch && typeMatch && queryMatch;
      }),
    [questions, topic, difficulty, type, query]
  );

  const columns: TableColumn<Question>[] = [
    {
      key: 'text',
      header: 'Question',
      render: (row) => (
        <div>
          <p className="line-clamp-2 max-w-lg font-medium text-slate-900">{row.text}</p>
          {row.description ? (
            <p className="line-clamp-2 max-w-lg text-xs text-slate-500">{row.description}</p>
          ) : null}
          <p className="text-xs text-slate-500">
            {row.topic} / {row.subtopic}
          </p>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      sortable: true,
      render: (row) => <Badge variant="info">{row.type}</Badge>,
      sortValue: (row) => row.type,
    },
    {
      key: 'difficulty',
      header: 'Difficulty',
      sortable: true,
      render: (row) => (
        <Badge
          variant={
            row.difficulty === 'Easy'
              ? 'success'
              : row.difficulty === 'Medium'
                ? 'warning'
                : 'danger'
          }
        >
          {row.difficulty}
        </Badge>
      ),
      sortValue: (row) => row.difficulty,
    },
    {
      key: 'answer',
      header: 'Correct Answer',
      render: (row) => <span className="font-mono text-xs">{row.correctAnswer}</span>,
    },
    {
      key: 'tags',
      header: 'Tags',
      render: (row) => (
        <div className="flex max-w-[250px] flex-wrap gap-1">
          {row.tags.slice(0, 3).map((tag) => (
            <Badge key={tag}>{tag}</Badge>
          ))}
        </div>
      ),
    },
  ];

  return (
    <PageTransition>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Question Bank</h1>
            <p className="text-sm text-slate-500">
              Filter and manage question inventory for tests.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/questions/bulk-upload">
              <Button variant="outline">
                <Upload size={14} className="mr-1.5" /> Bulk Upload
              </Button>
            </Link>
            <Link href="/admin/questions/create">
              <Button>
                <PlusCircle size={14} className="mr-1.5" /> Create Question
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-4">
          <Input
            placeholder="Search question text..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <Select
            options={[{ value: 'all', label: 'All Topics' }, ...topics]}
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
          />
          <Select
            options={[
              { value: 'all', label: 'All Difficulty' },
              { value: 'Easy', label: 'Easy' },
              { value: 'Medium', label: 'Medium' },
              { value: 'Hard', label: 'Hard' },
            ]}
            value={difficulty}
            onChange={(event) => setDifficulty(event.target.value)}
          />
          <Select
            options={[
              { value: 'all', label: 'All Types' },
              { value: 'MCQ', label: 'MCQ' },
              { value: 'Numeric', label: 'Numeric' },
            ]}
            value={type}
            onChange={(event) => setType(event.target.value)}
          />
        </div>

        <DataTable data={filtered} columns={columns} />
      </div>
    </PageTransition>
  );
}
