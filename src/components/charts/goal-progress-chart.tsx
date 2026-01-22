'use client'

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

interface GoalProgressChartProps {
  granted: number
  goal: number
}

export function GoalProgressChart({ granted, goal }: GoalProgressChartProps) {
  const percentage = goal > 0 ? Math.min((granted / goal) * 100, 100) : 0
  const remaining = Math.max(goal - granted, 0)

  const data = [
    { name: 'Granted', value: granted },
    { name: 'Remaining', value: remaining },
  ]

  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--muted))']

  return (
    <div className="relative h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
            startAngle={90}
            endAngle={-270}
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold">{percentage.toFixed(0)}%</span>
        <span className="text-xs text-muted-foreground">of goal</span>
      </div>
    </div>
  )
}
