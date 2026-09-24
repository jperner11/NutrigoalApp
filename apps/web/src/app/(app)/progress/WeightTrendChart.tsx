'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'

type ChartPoint = {
  date: string
  label: string
  weight: number
  bodyFat: number | null
}

type WeightTrendChartProps = {
  chartData: ChartPoint[]
  yMin: number
  yMax: number
  targetWeight: number | null | undefined
  formatTooltipLabel: (dateStr: string) => string
}

export default function WeightTrendChart({
  chartData,
  yMin,
  yMax,
  targetWeight,
  formatTooltipLabel,
}: WeightTrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--acc)" stopOpacity={0.32} />
            <stop offset="95%" stopColor="var(--acc)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--fg-4)' }} stroke="var(--line-strong)" />
        <YAxis domain={[yMin, yMax]} tick={{ fontSize: 11, fill: 'var(--fg-4)' }} unit="kg" stroke="var(--line-strong)" />
        <Tooltip
          contentStyle={{
            borderRadius: '12px',
            border: '1px solid var(--line-strong)',
            background: 'var(--panel-strong)',
            color: 'var(--fg)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.28)',
            fontSize: 12,
          }}
          formatter={(value) => [`${value}kg`, 'Weight']}
          labelFormatter={(_, payload) => {
            if (payload?.[0]?.payload?.date) return formatTooltipLabel(payload[0].payload.date)
            return ''
          }}
        />
        {targetWeight && (
          <ReferenceLine
            y={targetWeight}
            stroke="var(--acc)"
            strokeDasharray="6 4"
            strokeOpacity={0.55}
            label={{ value: `Target: ${targetWeight}kg`, position: 'right', fill: 'var(--acc-text)', fontSize: 11 }}
          />
        )}
        <Area
          type="monotone"
          dataKey="weight"
          stroke="var(--acc)"
          strokeWidth={2.5}
          fill="url(#weightGradient)"
          dot={{ r: 4, fill: 'var(--acc)', stroke: 'var(--panel-strong)', strokeWidth: 2 }}
          activeDot={{ r: 6, fill: 'var(--fg)', stroke: 'var(--panel-strong)', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
