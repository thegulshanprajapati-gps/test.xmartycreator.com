'use client';

import { useState } from 'react';
import { Download, FileUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageTransition } from '@/components/ui/page-transition';
import { createQuestion } from '@/services/question-service';
import { useToastStore } from '@/store/toast-store';
import { downloadCSV, parseCSV } from '@/utils/csv';

type PreviewRow = {
  index: number;
  row: string[];
  record: Record<string, string>;
  error: string | null;
};

const templateRows = [
  {
    type: 'MCQ',
    text: 'Which keyword defines function in Python?',
    description: 'Pick the keyword used to declare a function in Python syntax.',
    optionA: 'func',
    optionB: 'define',
    optionC: 'def',
    optionD: 'lambda',
    correctAnswer: 'def',
    explanation: 'def is used for function definition.',
    difficulty: 'Easy',
    topic: 'Python',
    subtopic: 'Functions',
    tags: 'python,basics',
  },
];

export default function BulkUploadQuestionsPage() {
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [loading, setLoading] = useState(false);
  const pushToast = useToastStore((state) => state.push);

  const processFile = async (file: File) => {
    const raw = await file.text();
    const rows = parseCSV(raw);
    if (rows.length < 2) {
      setPreview([]);
      pushToast({ kind: 'error', title: 'CSV is empty or invalid' });
      return;
    }
    const header = rows[0].map((item) => item.trim());
    const required = [
      'type',
      'text',
      'correctAnswer',
      'explanation',
      'difficulty',
      'topic',
      'subtopic',
    ];
    const mapped = rows.slice(1).map((row, index) => {
      const record = Object.fromEntries(
        header.map((key, i) => [key, String(row[i] ?? '').trim()])
      );
      const missing = required.filter((key) => !String(record[key] || '').trim());
      return {
        index: index + 2,
        row,
        record,
        error: missing.length > 0 ? `Missing: ${missing.join(', ')}` : null,
      };
    });
    setPreview(mapped);
  };

  return (
    <PageTransition>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bulk Upload Questions</h1>
          <p className="text-sm text-slate-500">
            Upload CSV, preview validation errors, then import.
          </p>
        </div>

        <Card className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => downloadCSV('question-template.csv', Object.keys(templateRows[0]).join(',') + '\n' + Object.values(templateRows[0]).join(','))}
            >
              <Download size={14} className="mr-1.5" /> Download CSV Template
            </Button>
            <label className="inline-flex cursor-pointer items-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              <FileUp size={14} className="mr-1.5" />
              Upload CSV
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) processFile(file);
                }}
              />
            </label>
          </div>

          {preview.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-slate-500">
                Preview rows: {preview.length} | Invalid rows:{' '}
                {preview.filter((item) => item.error).length}
              </p>
              <div className="max-h-72 overflow-auto rounded-xl border border-slate-200">
                <table className="min-w-full text-xs">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left">Row</th>
                      <th className="px-3 py-2 text-left">Data</th>
                      <th className="px-3 py-2 text-left">Validation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((item) => (
                      <tr key={item.index} className="border-t border-slate-100">
                        <td className="px-3 py-2">{item.index}</td>
                        <td className="px-3 py-2 font-mono text-[11px] text-slate-500">
                          {item.row.join(' | ')}
                        </td>
                        <td className={`px-3 py-2 ${item.error ? 'text-red-600' : 'text-emerald-600'}`}>
                          {item.error ?? 'Valid'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end">
                <Button
                  disabled={loading || preview.some((item) => item.error)}
                  onClick={async () => {
                    setLoading(true);
                    try {
                      for (const row of preview) {
                        const record = row.record;
                        const type = record.type === 'Numeric' ? 'Numeric' : 'MCQ';
                        await createQuestion({
                          type,
                          text: record.text || '',
                          description: record.description || '',
                          options:
                            type === 'MCQ'
                              ? [
                                  record.optionA || '',
                                  record.optionB || '',
                                  record.optionC || '',
                                  record.optionD || '',
                                ]
                              : [],
                          correctAnswer: record.correctAnswer || '',
                          explanation: record.explanation || '',
                          difficulty:
                            record.difficulty === 'Hard'
                              ? 'Hard'
                              : record.difficulty === 'Medium'
                                ? 'Medium'
                                : 'Easy',
                          topic: record.topic || '',
                          subtopic: record.subtopic || '',
                          tags: (record.tags || '')
                            .split(',')
                            .map((tag) => tag.trim())
                            .filter(Boolean),
                        });
                      }
                      pushToast({ kind: 'success', title: 'CSV import completed' });
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  {loading ? 'Importing...' : 'Import Valid Rows'}
                </Button>
              </div>
            </div>
          ) : null}
        </Card>
      </div>
    </PageTransition>
  );
}
