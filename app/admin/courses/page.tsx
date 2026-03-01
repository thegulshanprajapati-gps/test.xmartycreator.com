'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PlusCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DataTable, TableColumn } from '@/components/ui/table';
import { PageTransition } from '@/components/ui/page-transition';
import { getCourses } from '@/services/course-service';
import { Course } from '@/types';
import { formatCurrency } from '@/utils/formatters';

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    getCourses().then(setCourses);
  }, []);

  const columns: TableColumn<Course>[] = [
    {
      key: 'name',
      header: 'Course',
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-semibold text-slate-900">{row.name}</p>
          <p className="line-clamp-1 text-xs text-slate-500">{row.description}</p>
        </div>
      ),
      sortValue: (row) => row.name,
    },
    {
      key: 'validity',
      header: 'Validity',
      sortable: true,
      render: (row) => `${row.validityDays} days`,
      sortValue: (row) => row.validityDays,
    },
    {
      key: 'price',
      header: 'Price',
      sortable: true,
      render: (row) => formatCurrency(row.price),
      sortValue: (row) => row.price,
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
        <Link href={`/admin/courses/${row.id}`}>
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
            <h1 className="text-2xl font-bold text-slate-900">Courses</h1>
            <p className="text-sm text-slate-500">Manage course catalog and linked tests.</p>
          </div>
          <Link href="/admin/courses/create">
            <Button>
              <PlusCircle size={14} className="mr-1.5" /> Create Course
            </Button>
          </Link>
        </div>
        <Card>
          <DataTable data={courses} columns={columns} />
        </Card>
      </div>
    </PageTransition>
  );
}
