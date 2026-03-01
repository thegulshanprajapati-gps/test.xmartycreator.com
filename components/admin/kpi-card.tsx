import { ArrowUpRight } from 'lucide-react';
import { Card } from '@/components/ui/card';

export function KPICard({
  title,
  value,
  trend,
}: {
  title: string;
  value: number;
  trend: string;
}) {
  return (
    <Card className="space-y-3">
      <p className="text-sm text-slate-500">{title}</p>
      <div className="flex items-end justify-between">
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
          <ArrowUpRight size={12} />
          {trend}
        </span>
      </div>
    </Card>
  );
}
