'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DataTable, TableColumn } from '@/components/ui/table';
import { PageTransition } from '@/components/ui/page-transition';
import { getBatches } from '@/services/batch-service';
import { Batch } from '@/types';
import { formatShortDate } from '@/utils/formatters';

export default function BatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([]);

  useEffect(() => {
    getBatches().then(setBatches);
  }, []);

  const columns: TableColumn<Batch>[] = [
    {
      key: 'name',
      header: 'Batch Name',
      sortable: true,
      render: (row) => row.name,
      sortValue: (row) => row.name,
    },
    {
      key: 'dates',
      header: 'Validity',
      render: (row) => `${formatShortDate(row.startAt)} - ${formatShortDate(row.endAt)}`,
    },
    {
      key: 'students',
      header: 'Students',
      sortable: true,
      render: (row) => row.studentIds.length,
      sortValue: (row) => row.studentIds.length,
    },
    {
      key: 'tests',
      header: 'Assigned Tests',
      sortable: true,
      render: (row) => row.testIds.length,
      sortValue: (row) => row.testIds.length,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <Link href={`/admin/batches/${row.id}`}>
          <Button variant="outline" className="h-8 rounded-lg px-3 text-xs">
            Open
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <PageTransition>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Batches</h1>
            <p className="text-sm text-slate-500">
              Create and manage student batches with test assignment.
            </p>
          </div>
          <Link href="/admin/batches/create">
            <Button>
              <PlusCircle size={14} className="mr-1.5" /> Create Batch
            </Button>
          </Link>
        </div>

        <Card>
          <DataTable data={batches} columns={columns} />
        </Card>
      </div>
    </PageTransition>
  );
}
