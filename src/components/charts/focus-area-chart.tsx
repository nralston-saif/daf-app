'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

interface FocusAreaData {
  name: string
  value: number
}

interface FocusAreaChartProps {
  data: FocusAreaData[]
}

const COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
]

export function FocusAreaChart({ data }: FocusAreaChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
        No grant data to display
      </div>
    )
  }

  const total = data.reduce((sum, item) => sum + item.value, 0)

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="40%"
            outerRadius={70}
            dataKey="value"
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => [`$${(value as number).toLocaleString()}`, 'Amount']}
          />
          <Legend
            layout="horizontal"
            verticalAlign="bottom"
            align="center"
            formatter={(value, entry) => {
              const item = data.find(d => d.name === value)
              const percent = item ? ((item.value / total) * 100).toFixed(0) : 0
              return <span style={{ color: '#374151', fontSize: '12px' }}>{value} ({percent}%)</span>
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
