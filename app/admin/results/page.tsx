'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { DataTable, TableColumn } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { PageTransition } from '@/components/ui/page-transition';
import { getAttempts } from '@/services/result-service';
import { getTests } from '@/services/test-service';
import { Attempt, Test } from '@/types';

type Summary = {
  testId: string;
  testName: string;
  attempts: number;
  avgScore: number;
  avgAccuracy: number;
};

export default function ResultsLandingPage() {
  const [tests, setTests] = useState<Test[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);

  useEffect(() => {
    Promise.all([getTests(), getAttempts()]).then(([testsData, attemptsData]) => {
      setTests(testsData);
      setAttempts(attemptsData.filter((item) => item.status !== 'in_progress'));
    });
  }, []);

  const summary = useMemo<Summary[]>(() => {
    return tests.map((test) => {
      const rows = attempts.filter((attempt) => attempt.testId === test.id);
      const avgScore =
        rows.length > 0
          ? rows.reduce((sum, entry) => sum + entry.score, 0) / rows.length
          : 0;
      const avgAccuracy =
        rows.length > 0
          ? rows.reduce((sum, entry) => sum + entry.accuracy, 0) / rows.length
          : 0;
      return {
        testId: test.id,
        testName: test.name,
        attempts: rows.length,
        avgScore: Number(avgScore.toFixed(1)),
        avgAccuracy: Number(avgAccuracy.toFixed(1)),
      };
    });
  }, [tests, attempts]);

  const columns: TableColumn<Summary>[] = [
    {
      key: 'test',
      header: 'Test',
      sortable: true,
      render: (row) => row.testName,
      sortValue: (row) => row.testName,
    },
    {
      key: 'attempts',
      header: 'Attempt Count',
      sortable: true,
      render: (row) => row.attempts,
      sortValue: (row) => row.attempts,
    },
    {
      key: 'score',
      header: 'Avg Score',
      sortable: true,
      render: (row) => row.avgScore,
      sortValue: (row) => row.avgScore,
    },
    {
      key: 'accuracy',
      header: 'Avg Accuracy',
      sortable: true,
      render: (row) => `${row.avgAccuracy}%`,
      sortValue: (row) => row.avgAccuracy,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <Link href={`/admin/results/${row.testId}`}>
          <Button variant="outline" className="h-8 rounded-lg px-3 text-xs">
            View Attempts
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <PageTransition>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="text-cyan-600" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Results Analytics</h1>
            <p className="text-sm text-slate-500">
              Test-wise attempt summary and performance metrics.
            </p>
          </div>
        </div>
        <Card>
          <DataTable data={summary} columns={columns} />
        </Card>
      </div>
    </PageTransition>
  );
}
