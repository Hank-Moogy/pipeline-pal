import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUploads, useDealsForUpload, useAllDeals } from '@/hooks/useDeals';
import { computeMetrics, computeWow } from '@/lib/metrics';
import { CsvUpload } from '@/components/CsvUpload';
import { MetricCard } from '@/components/MetricCard';
import { StatusChart } from '@/components/StatusChart';
import { StatusTable } from '@/components/StatusTable';
import { WeekSelector } from '@/components/WeekSelector';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { BarChart3, DollarSign, Scale, Clock, TrendingUp, LogOut, Kanban, Bot, Upload } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Link } from 'react-router-dom';

function fmtCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

export default function Dashboard() {
  const { signOut } = useAuth();
  const { data: uploads = [] } = useUploads();
  const { data: allDeals = [] } = useAllDeals();

  const [compareUploadId, setCompareUploadId] = useState<string | null>(null);

  // Auto-select previous upload for WoW comparison
  useEffect(() => {
    if (uploads.length > 1 && !compareUploadId) {
      setCompareUploadId(uploads[1].id);
    }
  }, [uploads, compareUploadId]);

  const { data: compareDeals = [] } = useDealsForUpload(compareUploadId);

  // Primary metrics from live pipeline
  const currentMetrics = useMemo(() => computeMetrics(allDeals), [allDeals]);
  const compareMetrics = useMemo(() => computeMetrics(compareDeals), [compareDeals]);

  const hasCompare = compareUploadId && compareDeals.length > 0;

  const wowDeals = hasCompare ? computeWow(currentMetrics.totalDeals, compareMetrics.totalDeals) : null;
  const wowPipeline = hasCompare ? computeWow(currentMetrics.totalPipelineValue, compareMetrics.totalPipelineValue) : null;
  const wowWeighted = hasCompare ? computeWow(currentMetrics.totalWeightedValue, compareMetrics.totalWeightedValue) : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-lg font-bold tracking-tight">Deal Tracker</h1>
            <nav className="ml-6 flex items-center gap-1">
              <Button variant="secondary" size="sm" className="gap-1.5 pointer-events-none">
                <BarChart3 className="h-4 w-4" />
                Dashboard
              </Button>
              <Link to="/pipeline">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-1.5">
                  <Kanban className="h-4 w-4" />
                  Pipeline
                </Button>
              </Link>
              <Link to="/agents">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-1.5">
                  <Bot className="h-4 w-4" />
                  Agents
                </Button>
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground hover:text-foreground">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        {/* Upload + WoW comparison selector */}
        <div className="grid gap-6 lg:grid-cols-3">
          <CsvUpload />
          <div className="flex flex-col justify-end gap-4 lg:col-span-2">
            <div className="flex flex-wrap gap-4">
              <WeekSelector
                uploads={uploads}
                selected={compareUploadId}
                onSelect={setCompareUploadId}
                label="Compare With (WoW)"
              />
            </div>
          </div>
        </div>

        {/* Summary cards */}
        {allDeals.length > 0 && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                title="Total Deals"
                value={currentMetrics.totalDeals.toLocaleString()}
                delta={wowDeals}
                icon={<BarChart3 className="h-5 w-5" />}
              />
              <MetricCard
                title="Pipeline Value"
                value={fmtCurrency(currentMetrics.totalPipelineValue)}
                delta={wowPipeline}
                icon={<DollarSign className="h-5 w-5" />}
              />
              <MetricCard
                title="Weighted Pipeline"
                value={fmtCurrency(currentMetrics.totalWeightedValue)}
                delta={wowWeighted}
                icon={<Scale className="h-5 w-5" />}
              />
              <MetricCard
                title="Avg Days in Status"
                value={
                  currentMetrics.statusMetrics.length
                    ? (
                        currentMetrics.statusMetrics.reduce((s, m) => s + m.avgDaysInStatus * m.count, 0) /
                        Math.max(1, currentMetrics.statusMetrics.reduce((s, m) => s + m.count, 0))
                      ).toFixed(1)
                    : '0'
                }
                icon={<Clock className="h-5 w-5" />}
              />
            </div>

            {/* Charts */}
            <div className="grid gap-6 lg:grid-cols-2">
              <StatusChart
                metrics={currentMetrics.statusMetrics}
                dataKey="count"
                title="Deals by Status"
              />
              <StatusChart
                metrics={currentMetrics.statusMetrics}
                dataKey="totalValue"
                title="Deal Value by Status"
                formatValue={(v) => `$${(v / 1000).toFixed(0)}k`}
              />
            </div>

            <StatusChart
              metrics={currentMetrics.statusMetrics}
              dataKey="weightedValue"
              title="Weighted Amount by Status"
              formatValue={(v) => `$${(v / 1000).toFixed(0)}k`}
            />

            {/* Table */}
            <StatusTable metrics={currentMetrics.statusMetrics} />
          </>
        )}

        {allDeals.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <BarChart3 className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold">No data yet</h2>
            <p className="mt-2 max-w-sm text-muted-foreground">
              Upload your first weekly CRM export above to start tracking your pipeline.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
