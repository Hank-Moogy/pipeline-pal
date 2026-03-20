import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { StatusMetric } from '@/lib/metrics';

const STATUS_COLORS: Record<string, string> = {
  'Lead': 'hsl(210, 80%, 55%)',
  'Prospect': 'hsl(200, 70%, 50%)',
  'Email follow up': 'hsl(190, 60%, 45%)',
  'Discovery Meeting': 'hsl(38, 92%, 50%)',
  'Tech Qualification': 'hsl(32, 85%, 48%)',
  'Design proposal': 'hsl(280, 55%, 55%)',
  'Committed': 'hsl(142, 60%, 45%)',
  'Closed-won': 'hsl(142, 70%, 35%)',
  'Closed-lost': 'hsl(0, 68%, 52%)',
  'Recycle': 'hsl(215, 14%, 52%)',
};

interface Props {
  metrics: StatusMetric[];
  dataKey: 'count' | 'totalValue' | 'weightedValue';
  title: string;
  formatValue?: (v: number) => string;
}

export function StatusChart({ metrics, dataKey, title, formatValue }: Props) {
  const data = metrics.filter((m) => m.count > 0);
  const fmt = formatValue || ((v: number) => v.toLocaleString());

  return (
    <Card className="border-border/40 bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, bottom: 24, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(225, 10%, 18%)" vertical={false} />
              <XAxis
                dataKey="status"
                tick={{ fill: 'hsl(215, 14%, 52%)', fontSize: 11 }}
                angle={-35}
                textAnchor="end"
                height={60}
                axisLine={{ stroke: 'hsl(225, 10%, 18%)' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: 'hsl(215, 14%, 52%)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => fmt(v)}
              />
              <Tooltip
                contentStyle={{
                  background: 'hsl(225, 14%, 11%)',
                  border: '1px solid hsl(225, 10%, 18%)',
                  borderRadius: '8px',
                  color: 'hsl(210, 20%, 92%)',
                  fontSize: '12px',
                }}
                formatter={(value: number) => [fmt(value), '']}
                cursor={{ fill: 'hsl(225, 12%, 14%)' }}
              />
              <Bar dataKey={dataKey} radius={[4, 4, 0, 0]}>
                {data.map((entry) => (
                  <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || 'hsl(215, 14%, 52%)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
