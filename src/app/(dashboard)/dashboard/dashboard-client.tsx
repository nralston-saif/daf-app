'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { GivingHistoryChart } from '@/components/charts/giving-history-chart'
import { FocusAreaChart } from '@/components/charts/focus-area-chart'
import { format, parseISO, startOfYear } from 'date-fns'
import type { GrantStatus } from '@/types/database'

interface DashboardGrant {
  id: string
  status: GrantStatus
  amount: number | null
  start_date: string | null
  created_at: string
  organization: { name: string; tags?: string[] } | null
}

interface DashboardClientProps {
  grants: DashboardGrant[]
  ytdGranted: number
  annualGoal: number
  goalProgressChart: React.ReactNode
  annualGoalEditor: React.ReactNode
}

export function DashboardClient({
  grants,
  ytdGranted,
  annualGoal,
  goalProgressChart,
  annualGoalEditor,
}: DashboardClientProps) {
  const currentYear = new Date().getFullYear()
  const [rangeStart, setRangeStart] = useState(
    format(startOfYear(new Date()), 'yyyy-MM-dd')
  )
  const [rangeEnd, setRangeEnd] = useState(
    format(new Date(), 'yyyy-MM-dd')
  )

  const startDate = useMemo(() => parseISO(rangeStart), [rangeStart])
  const endDate = useMemo(() => parseISO(rangeEnd), [rangeEnd])

  // Filter grants within the date range
  const rangeGrants = useMemo(() => {
    return grants.filter(g => {
      if (!['approved', 'paid'].includes(g.status)) return false
      const d = g.start_date ? parseISO(g.start_date) : parseISO(g.created_at)
      return d >= startDate && d <= endDate
    })
  }, [grants, startDate, endDate])

  // Summary stats for the range
  const rangeTotalGranted = useMemo(
    () => rangeGrants.reduce((sum, g) => sum + (g.amount || 0), 0),
    [rangeGrants]
  )
  const rangeGrantCount = rangeGrants.length
  const rangeOrgCount = useMemo(
    () => new Set(rangeGrants.map(g => g.organization?.name).filter(Boolean)).size,
    [rangeGrants]
  )

  // Focus area breakdown for range
  const focusAreaData = useMemo(() => {
    const totals: Record<string, number> = {}
    rangeGrants.forEach(g => {
      const tags = g.organization?.tags || []
      const amountPerTag = tags.length > 0 ? (g.amount || 0) / tags.length : 0
      tags.forEach(tag => {
        totals[tag] = (totals[tag] || 0) + amountPerTag
      })
    })
    return Object.entries(totals)
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
  }, [rangeGrants])

  return (
    <div className="space-y-6">
      {/* Summary stats + date range picker */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Total Granted</p>
            <p className="text-2xl font-bold">${rangeTotalGranted.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Grants</p>
            <p className="text-2xl font-bold">{rangeGrantCount}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Organizations</p>
            <p className="text-2xl font-bold">{rangeOrgCount}</p>
          </div>
        </div>
        <div className="flex items-end gap-2">
          <div className="space-y-1">
            <Label className="text-xs">From</Label>
            <Input
              type="date"
              value={rangeStart}
              onChange={(e) => setRangeStart(e.target.value)}
              className="w-[140px] h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">To</Label>
            <Input
              type="date"
              value={rangeEnd}
              onChange={(e) => setRangeEnd(e.target.value)}
              className="w-[140px] h-8 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Giving History</CardTitle>
            <CardDescription>Monthly grant payments</CardDescription>
          </CardHeader>
          <CardContent>
            <GivingHistoryChart
              grants={grants}
              startDate={startDate}
              endDate={endDate}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Focus Area Breakdown</CardTitle>
            <CardDescription>Grant distribution by focus area</CardDescription>
          </CardHeader>
          <CardContent>
            <FocusAreaChart data={focusAreaData} />
          </CardContent>
        </Card>
      </div>

      {/* Annual Goal Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Annual Goal Progress</CardTitle>
          <CardDescription>
            ${ytdGranted.toLocaleString()} of ${annualGoal.toLocaleString()} goal
          </CardDescription>
          {annualGoalEditor}
        </CardHeader>
        <CardContent>
          {goalProgressChart}
          {annualGoal > 0 && ytdGranted < annualGoal && (
            <p className="text-center text-sm text-muted-foreground mt-2">
              ${(annualGoal - ytdGranted).toLocaleString()} remaining to reach goal
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
