'use client';

import {
  Bar,
  BarChart,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card } from '@/components/ui/card';

const pieColors = ['#10b981', '#ef4444'];

type Props = {
  attemptTrend: Array<{ day: string; attempts: number }>;
  attemptsByTest: Array<{ name: string; attempts: number }>;
  passFail: Array<{ name: string; value: number }>;
};

export function AnalyticsCharts({ attemptTrend, attemptsByTest, passFail }: Props) {
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <Card className="xl:col-span-2">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">Daily Attempts (Last 7 Days)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={attemptTrend}>
              <XAxis dataKey="day" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="attempts"
                stroke="#2563eb"
                strokeWidth={2.5}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <h3 className="mb-3 text-sm font-semibold text-slate-700">Pass / Fail Ratio</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={passFail}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label
              >
                {passFail.map((entry, index) => (
                  <Cell key={entry.name} fill={pieColors[index % pieColors.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="xl:col-span-3">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">Top 5 Tests by Attempts</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={attemptsByTest}>
              <XAxis dataKey="name" interval={0} angle={-10} textAnchor="end" height={70} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="attempts" fill="#06b6d4" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
