import { useEffect, useRef, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { http } from '../api/http.js';
import { useAuth } from '../context/AuthContext.jsx';
import { PeriodLabel, formatRangeLabel, usePersistentPeriod } from '../components/ui/PeriodControls.jsx';
import { ChartExport } from '../components/ui/ChartExport.jsx';

// Bright but lightened palette — vivid without straining
const CHART = {
  blue: '#5C7CFA',
  red: '#FF6B6B',
  teal: '#21C0AE',
  amber: '#FCC419',
  violet: '#9775FA'
};

const priorityColors = {
  Normal: CHART.blue,
  Urgent: CHART.red
};

// Renders percentage labels inside each pie slice (works with fixed-pixel radii)
function PieLabel({ cx, cy, midAngle, innerRadius, outerRadius, value }) {
  if (!value || value < 5) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.54;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={14} fontWeight={700}>
      {value}%
    </text>
  );
}

export default function Analytics() {
  const { theme } = useAuth();
  const [data, setData] = useState(null);
  const { timeRange, groupBy } = usePersistentPeriod();
  const flowChartRef = useRef(null);
  const deptChartRef = useRef(null);
  const priorityChartRef = useRef(null);

  useEffect(() => {
    http.get('/dashboard/summary', { params: { from: timeRange.from, to: timeRange.to, groupBy } }).then((res) => setData(res.data));
  }, [timeRange, groupBy]);

  if (!data) return null;

  const isDark = theme === 'dark';
  const priority = (data.priorityDistribution?.length ? data.priorityDistribution : [
    { name: 'Normal', value: 0, count: 0 },
    { name: 'Urgent', value: 0, count: 0 }
  ]).map((item) => ({ ...item, color: priorityColors[item.name] || CHART.blue }));

  const departmentColors = [CHART.blue, CHART.red, CHART.teal, CHART.amber, CHART.violet];
  const axisTick = { fill: isDark ? '#CBD5E1' : '#64748B', fontSize: 12, fontWeight: 600 };
  const gridColor = isDark ? '#334155' : '#D7E0EF';
  const panelClass = 'rounded-xl bg-transparent';
  const mutedText = 'text-slate-500 dark:text-slate-300';
  const volumeAxisTick = { ...axisTick, fontSize: groupBy === 'daily' ? 10 : 12 };

  // Department chart dimensions
  const maxDepartmentWorkload = Math.max(0, ...data.departments.map((d) => d.workload));
  const yUpper = Math.max(4, maxDepartmentWorkload + 1);
  const yTicks = Array.from({ length: yUpper + 1 }, (_, i) => i);
  const busiestDepartment = maxDepartmentWorkload > 0
    ? [...data.departments].sort((a, b) => b.workload - a.workload)[0]
    : null;

  // Trend chart data — use dispatchedExternally from server buckets
  const flowData = data.volume.map((bucket) => ({
    ...bucket,
    dispatchedExternally: bucket.dispatchedExternally ?? 0,
    awaitingDispatch: bucket.awaitingDispatch ?? 0,
    total: (bucket.incoming ?? 0) + (bucket.outgoing ?? 0),
    balance: bucket.incoming - (bucket.dispatchedExternally ?? 0)
  }));
  const incomingTotal = flowData.reduce((sum, b) => sum + b.incoming, 0);
  const dispatchedExternallyTotal = flowData.reduce((sum, b) => sum + (b.dispatchedExternally ?? 0), 0);
  const awaitingDispatchTotal = data.metrics[3]?.value ?? 0; // current READY_FOR_SIGNATURE state
  const busiestFlowBucket = [...flowData].sort((a, b) => (b.incoming + b.dispatchedExternally) - (a.incoming + a.dispatchedExternally))[0];

  const maxVolume = Math.max(0, ...flowData.map((b) => Math.max(b.incoming, b.dispatchedExternally)));
  const volumeUpper = maxVolume <= 5 ? Math.max(1, maxVolume) : Math.ceil(maxVolume / 10) * 10;
  const volumeTicks = volumeUpper <= 5 ? Array.from({ length: volumeUpper + 1 }, (_, i) => i) : undefined;
  const volumeXAxisInterval = groupBy === 'daily' ? 0 : 'preserveStartEnd';

  // ── Tooltips ────────────────────────────────────────────────────

  function FlowTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    const bucket = payload[0]?.payload;
    const tooltipLabel = bucket?.tooltipLabel || label;
    const received = bucket?.incoming ?? 0;
    const dispatched = bucket?.dispatchedExternally ?? 0;
    const awaiting = bucket?.awaitingDispatch ?? 0;
    return (
      <div className="min-w-[200px] rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-2xl dark:border-white/10 dark:bg-slate-900">
        <p className="mb-2 font-bold text-ink dark:text-white">{tooltipLabel}</p>
        <p className="font-semibold text-purcBlue dark:text-blue-300">Total Letters Received: {received}</p>
        <p className="mt-1 font-semibold text-purcRed dark:text-red-300">Letters Sent: {dispatched}</p>
        {awaiting > 0 && (
          <p className="mt-1 font-semibold text-amber-600 dark:text-amber-300">Outgoing letters still at ES: {awaiting}</p>
        )}
      </div>
    );
  }

  function FlowLegend({ payload = [] }) {
    return (
      <div className="mt-3 flex flex-wrap justify-center gap-x-10 gap-y-2 text-xs font-semibold">
        {payload.map((entry) => (
          <span key={entry.value} className="flex items-center gap-2 text-slate-600 dark:text-slate-200">
            <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: entry.color }} />
            {entry.value}
          </span>
        ))}
      </div>
    );
  }

  function DepartmentTooltip({ active, payload }) {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    const color = departmentColors[data.departments.indexOf(d) % departmentColors.length];
    const isES = d.code === 'ES';
    return (
      <div className="min-w-[270px] rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-2xl dark:border-white/10 dark:bg-slate-900">
        <p className="mb-0.5 text-xs font-bold uppercase tracking-wider" style={{ color }}>{d.code}</p>
        <p className="mb-3 text-base font-bold leading-tight text-ink dark:text-white">{d.name}</p>
        {isES ? (
          <>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-lg px-3 py-1.5 text-xs font-bold text-white" style={{ backgroundColor: color }}>
                Total at ES: {d.workload}
              </span>
              <span className="rounded-lg bg-purcBlue px-3 py-1.5 text-xs font-bold text-white">
                Received Letters at ES: {d.incomingAtEs ?? 0}
              </span>
              <span className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-white">
                Outgoing letters still at ES: {d.outgoingAtEs ?? 0}
              </span>
            </div>
            <p className="mt-3 text-xs font-medium text-slate-400">
              <span className="font-semibold text-slate-600 dark:text-slate-300">Received Letters at ES</span> = letters received by ES from external bodies not yet dispatched internally.
            </p>
            <p className="mt-1 text-xs font-medium text-slate-400">
              <span className="font-semibold text-slate-600 dark:text-slate-300">Outgoing letters still at ES</span> = outgoing letters still at ES not yet sent out.
            </p>
          </>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-lg px-3 py-1.5 text-xs font-bold text-white" style={{ backgroundColor: color }}>
                Total: {d.workload}
              </span>
              <span className="rounded-lg bg-purcBlue px-3 py-1.5 text-xs font-bold text-white">
                Received: {d.received}
              </span>
              <span className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white">
                Sent: {d.sent}
              </span>
            </div>
            <p className="mt-3 text-xs font-medium text-slate-400">
              <span className="font-semibold text-slate-600 dark:text-slate-300">Received</span> = letters internally dispatched to {d.code} by ES.
            </p>
            <p className="mt-1 text-xs font-medium text-slate-400">
              <span className="font-semibold text-slate-600 dark:text-slate-300">Sent</span> = letters {d.code} submitted to ES that ES has dispatched externally.
            </p>
          </>
        )}
      </div>
    );
  }

  function PriorityTooltip({ active, payload }) {
    if (!active || !payload?.length) return null;
    const item = payload[0].payload;
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-xl dark:border-white/10 dark:bg-slate-900">
        <p className="font-bold text-ink dark:text-white">{item.name}: {item.value}%</p>
        <p className="mt-1 font-medium text-slate-500 dark:text-slate-300">{item.count} letter record{item.count !== 1 ? 's' : ''}</p>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────

  const periodLabel = formatRangeLabel(timeRange);
  const deptExportColumns = [
    { header: 'Directorate Code', accessor: (d) => d.code },
    { header: 'Directorate', accessor: (d) => d.name },
    { header: 'Total Letters', accessor: (d) => d.workload },
    { header: 'Received from ES', accessor: (d) => d.received ?? 0 },
    { header: 'Sent through ES', accessor: (d) => d.sent ?? 0 }
  ];
  const flowExportColumns = [
    { header: 'Period', accessor: (b) => b.tooltipLabel || b.month },
    { header: 'Total Letters Received', accessor: (b) => b.incoming },
    { header: 'Letters Sent', accessor: (b) => b.dispatchedExternally },
    { header: 'Outgoing letters still at ES', accessor: (b) => b.awaitingDispatch }
  ];
  const priorityExportColumns = [
    { header: 'Priority', accessor: (p) => p.name },
    { header: 'Percentage', accessor: (p) => `${p.value}%` },
    { header: 'Letter Count', accessor: (p) => p.count }
  ];

  return (
    <div className="space-y-6">
      <PeriodLabel timeRange={timeRange} />

      <div className="space-y-6">

        {/* ── Chart 1: Letters Received vs Dispatched Externally ── */}
        <section className={`${panelClass} p-6`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-base font-bold text-ink dark:text-white">
                <TrendingUp size={18} className="text-purcBlue dark:text-blue-300" />
                Total Letters Received vs Letters Sent
              </h2>
              <p className={`mt-1 text-xs font-medium ${mutedText}`}>
                Compares letters received by the Commission against letters confirmed as sent out by ES, grouped by the selected period.
              </p>
            </div>
            <ChartExport
              getNode={() => flowChartRef.current}
              baseName="letters-received-vs-sent"
              excel={{ title: 'Letters Received vs Letters Sent', periodLabel, columns: flowExportColumns, rows: flowData }}
            />
          </div>

          {/* 4 summary stats */}
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Total Letters Received', value: incomingTotal, tone: 'text-purcBlue dark:text-blue-200' },
              { label: 'Letters Sent', value: dispatchedExternallyTotal, tone: 'text-purcRed dark:text-red-200' },
              { label: 'Outgoing letters still at ES', value: awaitingDispatchTotal, tone: 'text-amber-600 dark:text-amber-300' },
              { label: 'Busiest Period', value: busiestFlowBucket?.tooltipLabel || '—', tone: 'text-slate-700 dark:text-slate-100' }
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-slate-200/70 bg-slate-50/70 px-4 py-3 dark:border-white/10 dark:bg-white/5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">{item.label}</p>
                <p className={`mt-1 break-words text-xl font-bold leading-snug ${item.tone}`}>{item.value}</p>
              </div>
            ))}
          </div>

          {/* Bar chart */}
          <div ref={flowChartRef} className="mt-6 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={flowData} margin={{ top: 18, right: 20, left: 0, bottom: 8 }} barGap={10} barCategoryGap={groupBy === 'daily' ? 12 : 28}>
                <CartesianGrid strokeDasharray="4 6" stroke={gridColor} vertical={false} />
                <XAxis dataKey="month" interval={volumeXAxisInterval} minTickGap={4} tickLine={false} axisLine={false} tick={volumeAxisTick} angle={groupBy === 'daily' ? -18 : 0} textAnchor={groupBy === 'daily' ? 'end' : 'middle'} height={groupBy === 'daily' ? 48 : 30} />
                <YAxis allowDecimals={false} domain={[0, volumeUpper]} ticks={volumeTicks} width={38} tickLine={false} axisLine={false} tick={axisTick} />
                <Tooltip content={<FlowTooltip />} />
                <Legend content={<FlowLegend />} />
                <Bar name="Total Letters Received" dataKey="incoming" fill={CHART.blue} radius={[8, 8, 0, 0]} maxBarSize={42} />
                <Bar name="Letters Sent" dataKey="dispatchedExternally" fill={CHART.red} radius={[8, 8, 0, 0]} maxBarSize={42} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* ── Charts 2 & 3 side-by-side, equal height ── */}
        <div className="grid gap-6 xl:grid-cols-2 xl:items-stretch">

          {/* Directorate Workload */}
          <section className={`${panelClass} flex flex-col p-6`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-ink dark:text-white">Directorate Workload</h2>
                <p className={`mt-1 text-xs font-medium ${mutedText}`}>
                  Total letters handled per directorate in the selected period.
                </p>
              </div>
              <ChartExport
                getNode={() => deptChartRef.current}
                baseName="directorate-workload"
                excel={{ title: 'Directorate Workload', periodLabel, columns: deptExportColumns, rows: data.departments }}
              />
            </div>
            <div ref={deptChartRef} className="mt-5 flex-1" style={{ minHeight: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.departments} margin={{ top: 30, right: 12, left: 0, bottom: 12 }}>
                  <CartesianGrid strokeDasharray="4 6" stroke={gridColor} vertical={false} />
                  <XAxis dataKey="code" tickLine={false} axisLine={false} interval={0} height={38} tick={axisTick} />
                  <YAxis allowDecimals={false} domain={[0, yUpper]} ticks={yTicks} width={32} tickLine={false} axisLine={false} tick={axisTick} />
                  <Tooltip content={<DepartmentTooltip />} cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(70,91,168,0.06)' }} />
                  <Bar dataKey="workload" name="Total Letters" radius={[8, 8, 0, 0]} barSize={46}>
                    {data.departments.map((entry, index) => (
                      <Cell key={entry.code} fill={entry.workload > 0 ? departmentColors[index % departmentColors.length] : (isDark ? '#334155' : '#E2E8F0')} />
                    ))}
                    <LabelList dataKey="workload" position="top" style={{ fill: isDark ? '#CBD5E1' : '#374151', fontSize: 12, fontWeight: 700 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600 dark:bg-white/5 dark:text-slate-300">
              {busiestDepartment
                ? <>Highest active load: <span className="font-bold text-ink dark:text-white">{busiestDepartment.name} ({busiestDepartment.workload} letters)</span></>
                : 'No active directorate load recorded for this period.'}
            </div>
          </section>

          {/* Letter Priority Distribution */}
          <section className={`${panelClass} flex flex-col p-6`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h2 className="text-base font-bold text-ink dark:text-white">Letter Priority Distribution</h2>
              <ChartExport
                getNode={() => priorityChartRef.current}
                baseName="letter-priority-distribution"
                excel={{ title: 'Letter Priority Distribution', periodLabel, columns: priorityExportColumns, rows: priority }}
              />
            </div>
            {/* Chart + legend — side-by-side, chart fills remaining vertical space */}
            <div className="mt-5 flex flex-1 flex-col items-center gap-6 sm:flex-row sm:items-center">
              {/* Fixed square container guarantees a perfectly circular donut */}
              <div ref={priorityChartRef} className="shrink-0" style={{ width: 240, height: 240 }}>
                <PieChart width={240} height={240}>
                  <Pie
                    data={priority}
                    dataKey="value"
                    nameKey="name"
                    cx={120}
                    cy={120}
                    innerRadius={58}
                    outerRadius={108}
                    paddingAngle={2}
                    startAngle={90}
                    endAngle={-270}
                    stroke="none"
                    isAnimationActive={false}
                    labelLine={false}
                    label={PieLabel}
                  >
                    {priority.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                  </Pie>
                  <Tooltip content={<PriorityTooltip />} />
                </PieChart>
              </div>
              {/* Legend — vertically centred */}
              <div className="flex flex-1 flex-col justify-center gap-3">
                {priority.map((item) => (
                  <div key={item.name} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white/70 px-3 py-2.5 text-xs dark:border-white/10 dark:bg-white/5">
                    <span className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-100">
                      <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                      {item.name}
                    </span>
                    <span className="ml-3 font-bold text-ink dark:text-white">{item.value}%</span>
                  </div>
                ))}
                <p className={`text-center text-[11px] font-medium ${mutedText}`}>
                  {priority.reduce((s, i) => s + i.count, 0)} letter records in the selected period
                </p>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
