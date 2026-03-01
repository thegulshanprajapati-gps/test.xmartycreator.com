'use client';

import { useEffect, useState } from 'react';
import { AnalyticsCharts } from '@/components/admin/analytics-charts';
import { KPICard } from '@/components/admin/kpi-card';
import { Card } from '@/components/ui/card';
import { PageTransition } from '@/components/ui/page-transition';
import { Skeleton } from '@/components/ui/skeleton';
import { getAdminDashboardData } from '@/services/dashboard-service';
import { formatDate } from '@/utils/formatters';

type DashboardData = Awaited<ReturnType<typeof getAdminDashboardData>>;

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    getAdminDashboardData().then(setData);
  }, []);

  if (!data) {
    return (
      <div className="space-y-4">
        <div className="premium-grid premium-grid-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
            <p className="text-sm text-slate-500">
              Track platform activity, performance, and attempts.
            </p>
          </div>
        </div>

        <div className="premium-grid premium-grid-4">
          <KPICard title="Total Students" value={data.kpis.totalStudents} trend="+4.1%" />
          <KPICard title="Total Tests" value={data.kpis.totalTests} trend="+2.8%" />
          <KPICard title="Active Tests" value={data.kpis.activeTests} trend="+1.2%" />
          <KPICard title="Today Attempts" value={data.kpis.todayAttempts} trend="+6.4%" />
        </div>

        <AnalyticsCharts
          attemptTrend={data.attemptTrend}
          attemptsByTest={data.attemptsByTest}
          passFail={data.passFail}
        />

        <Card>
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Recent Activity</h3>
          <div className="space-y-2">
            {data.recentActivity.map((entry) => (
              <div
                key={entry.id}
                className="flex flex-wrap items-center justify-between rounded-xl border border-slate-100 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {entry.studentName} attempted {entry.testName}
                  </p>
                  <p className="text-xs text-slate-500">{formatDate(entry.submittedAt)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-800">{entry.score} marks</p>
                  <p className="text-xs text-slate-500">{entry.accuracy}% accuracy</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </PageTransition>
  );
}
