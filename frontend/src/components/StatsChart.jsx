import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass p-3 rounded-lg border border-border" style={{ padding: '12px', borderRadius: '8px' }}>
        <p className="text-xs text-text-dim mb-1">{label}</p>
        <p className="text-sm font-bold text-primary">
          NDVI: {payload[0].value.toFixed(4)}
        </p>
      </div>
    );
  }
  return null;
};

export default function StatsChart({ data }) {
  // Use a fallback to empty array if data is null/undefined
  const chartData = data || [];

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px] text-text-dim italic border border-dashed border-border rounded-xl">
        No analysis data available. Select a region and run analysis.
      </div>
    );
  }

  return (
    <div className="stats-chart-container" style={{ height: '320px', width: '100%', position: 'relative' }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorNdvi" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4ade80" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#4ade80" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis 
            dataKey="time" 
            stroke="var(--text-dim)" 
            fontSize={10} 
            tickLine={false} 
            axisLine={false}
            tickFormatter={(str) => {
              try {
                const date = new Date(str);
                return date.toLocaleDateString('en-US', { month: 'short', year: '2y' });
              } catch (e) {
                return str;
              }
            }}
          />
          <YAxis 
            stroke="var(--text-dim)" 
            fontSize={10} 
            tickLine={false} 
            axisLine={false} 
            domain={[0, 1]}
            tickFormatter={(val) => val.toFixed(1)}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area 
            animationDuration={1500}
            type="monotone" 
            dataKey="NDVI" 
            stroke="#4ade80" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorNdvi)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
