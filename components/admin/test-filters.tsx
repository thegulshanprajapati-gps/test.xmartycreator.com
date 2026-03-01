'use client';

import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useTestFiltersStore } from '@/store/filters-store';

type Option = { value: string; label: string };

export function TestFilters({
  batchOptions,
  courseOptions,
}: {
  batchOptions: Option[];
  courseOptions: Option[];
}) {
  const filters = useTestFiltersStore((state) => state);

  return (
    <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-5">
      <Input
        placeholder="Search test name/category..."
        value={filters.query}
        onChange={(event) => filters.set({ query: event.target.value })}
      />
      <Select
        options={[
          { value: 'all', label: 'All Status' },
          { value: 'Draft', label: 'Draft' },
          { value: 'Published', label: 'Published' },
          { value: 'Scheduled', label: 'Scheduled' },
          { value: 'Expired', label: 'Expired' },
        ]}
        value={filters.status}
        onChange={(event) => filters.set({ status: event.target.value })}
      />
      <Select
        options={[{ value: 'all', label: 'All Batches' }, ...batchOptions]}
        value={filters.batchId}
        onChange={(event) => filters.set({ batchId: event.target.value })}
      />
      <Select
        options={[{ value: 'all', label: 'All Courses' }, ...courseOptions]}
        value={filters.courseId}
        onChange={(event) => filters.set({ courseId: event.target.value })}
      />
      <Select
        options={[
          { value: 'all', label: 'All Pricing' },
          { value: 'free', label: 'Free' },
          { value: 'paid', label: 'Paid' },
        ]}
        value={filters.paid}
        onChange={(event) =>
          filters.set({ paid: event.target.value as 'all' | 'free' | 'paid' })
        }
      />
    </div>
  );
}
