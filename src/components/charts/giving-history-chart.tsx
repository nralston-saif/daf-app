'use client'

import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { format, parseISO, startOfMonth, eachMonthOfInterval } from 'date-fns'

interface Grant {
  id: string
  amount: number | null
  status: string
  start_date: string | null
  created_at: string
}

interface GivingHistoryChartProps {
  grants: Grant[]
  startDate: Date
  endDate: Date
}

export function GivingHistoryChart({ grants, startDate, endDate }: GivingHistoryChartProps) {
  const data = useMemo(() => {
    // Generate all months in the range
    const months = eachMonthOfInterval({ start: startDate, end: endDate })

    // Filter to paid grants within the date range
    const paidGrants = grants.filter(g => {
      if (g.status !== 'paid' || g.amount == null) return false
      const grantDate = g.start_date ? parseISO(g.start_date) : parseISO(g.created_at)
      return grantDate >= startDate && grantDate <= endDate
    })

    // Group by month
    const monthMap = new Map<string, number>()
    months.forEach(m => {
      monthMap.set(format(m, 'yyyy-MM'), 0)
    })

    paidGrants.forEach(g => {
      const grantDate = g.start_date ? parseISO(g.start_date) : parseISO(g.created_at)
      const key = format(startOfMonth(grantDate), 'yyyy-MM')
      if (monthMap.has(key)) {
        monthMap.set(key, (monthMap.get(key) || 0) + (g.amount || 0))
      }
    })

    return Array.from(monthMap.entries()).map(([key, amount]) => ({
      month: format(parseISO(`${key}-01`), 'MMM yyyy'),
      amount,
    }))
  }, [grants, startDate, endDate])

  if (data.every(d => d.amount === 0)) {
    return (
      <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
        No paid grants in this period
      </div>
    )
  }

  return (
    <div className="h-[250px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip
            formatter={(value) => [`$${(value as number).toLocaleString()}`, 'Amount']}
            contentStyle={{ fontSize: 12 }}
          />
          <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
