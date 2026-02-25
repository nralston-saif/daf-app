import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Plus, Building2, HandCoins, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import type { Foundation, User, Grant, GrantStatus, GrantPaymentStatus } from '@/types/database'
import { GoalProgressChart } from '@/components/charts/goal-progress-chart'
import { AnnualGoalEditor } from './annual-goal-editor'
import { DashboardClient } from './dashboard-client'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type ProfileWithFoundation = User & { foundation: Foundation }

type DashboardGrant = {
  id: string
  status: GrantStatus
  amount: number | null
  organization: { name: string; tags?: string[] } | null
  start_date: string | null
  created_at: string
}

type RecurringGrant = {
  id: string
  amount: number | null
  recurrence_type: Grant['recurrence_type']
  start_date: string | null
  end_date: string | null
  status: GrantStatus
  organization: { name: string } | null
  grant_payments: { amount: number; status: GrantPaymentStatus; payment_date: string }[]
}

const statusColors: Record<string, string> = {
  review: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  paid: 'bg-emerald-100 text-emerald-800',
  declined: 'bg-red-100 text-red-800',
  closed: 'bg-gray-100 text-gray-800',
}

export default async function DashboardPage() {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('users')
    .select('*, foundation:foundations(*)')
    .eq('auth_id', user!.id)
    .single() as { data: ProfileWithFoundation | null }

  if (!profile?.foundation) {
    return <div>Loading...</div>
  }

  const foundation = profile.foundation

  // Fetch all data in parallel
  const [grantsResult, recurringResult, upcomingPaymentsResult] = await Promise.all([
    // All grants
    supabase
      .from('grants')
      .select('id, status, amount, organization:organizations(name, tags), start_date, created_at')
      .eq('foundation_id', foundation.id)
      .order('created_at', { ascending: false }),
    // Recurring grants with payments
    supabase
      .from('grants')
      .select('id, amount, recurrence_type, start_date, end_date, status, organization:organizations(name), grant_payments(*)')
      .eq('foundation_id', foundation.id)
      .neq('recurrence_type', 'one_time')
      .in('status', ['approved', 'paid']),
    // Upcoming scheduled payments
    supabase
      .from('grant_payments')
      .select('id, amount, payment_date, status, grant:grants(id, organization:organizations(name))')
      .eq('status', 'scheduled')
      .order('payment_date', { ascending: true })
      .limit(10),
  ])

  const grants = (grantsResult.data || []) as unknown as DashboardGrant[]
  const recurringGrants = (recurringResult.data || []) as unknown as RecurringGrant[]
  const upcomingPayments = (upcomingPaymentsResult.data || []) as unknown as {
    id: string
    amount: number
    payment_date: string
    status: string
    grant: { id: string; organization: { name: string } | null } | null
  }[]

  // Calculate stats — YTD only includes current year grants
  const currentYearStart = `${new Date().getFullYear()}-01-01`
  const ytdGrants = grants.filter(g => {
    if (!['approved', 'paid'].includes(g.status)) return false
    const grantDate = g.start_date || g.created_at
    return grantDate >= currentYearStart
  })
  const ytdGranted = ytdGrants.reduce((sum, g) => sum + (g.amount || 0), 0)
  const annualGoal = (foundation as Foundation & { annual_giving_goal?: number }).annual_giving_goal || 0

  // Future section: Committed grants (approved but not yet paid)
  const committedGrants = grants.filter(g => g.status === 'approved')
  const committedTotal = committedGrants.reduce((sum, g) => sum + (g.amount || 0), 0)

  return (
    <div className="space-y-8">
      {/* Header with quick actions */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome back, {profile.name}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/grants/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Grant
            </Button>
          </Link>
          <Link href="/organizations/new">
            <Button variant="outline">
              <Building2 className="h-4 w-4 mr-2" />
              Add Organization
            </Button>
          </Link>
        </div>
      </div>

      {/* ── FUTURE SECTION ── */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Future</h2>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Committed grants */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HandCoins className="h-5 w-5" />
                Committed
              </CardTitle>
              <CardDescription>
                {committedGrants.length} approved grant{committedGrants.length !== 1 ? 's' : ''} awaiting payment
                {committedTotal > 0 && ` · $${committedTotal.toLocaleString()}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {committedGrants.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No committed grants
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organization</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {committedGrants.slice(0, 5).map((g) => (
                      <TableRow key={g.id}>
                        <TableCell>
                          <Link href={`/grants/${g.id}`} className="font-medium hover:underline">
                            {g.organization?.name || 'Unknown'}
                          </Link>
                        </TableCell>
                        <TableCell className="font-semibold">
                          {g.amount != null ? `$${g.amount.toLocaleString()}` : 'TBD'}
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[g.status]}>
                            {g.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {committedGrants.length > 5 && (
                <div className="mt-2 text-center">
                  <Link href="/grants?view=list">
                    <Button variant="ghost" size="sm">
                      View all {committedGrants.length} committed grants
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recurring / Upcoming payments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Recurring
              </CardTitle>
              <CardDescription>
                {recurringGrants.length} active recurring grant{recurringGrants.length !== 1 ? 's' : ''}
                {upcomingPayments.length > 0 && ` · ${upcomingPayments.length} upcoming payments`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingPayments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No upcoming scheduled payments
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organization</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Due Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {upcomingPayments.slice(0, 5).map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <Link
                            href={`/grants/${p.grant?.id}`}
                            className="font-medium hover:underline"
                          >
                            {p.grant?.organization?.name || 'Unknown'}
                          </Link>
                        </TableCell>
                        <TableCell className="font-semibold">
                          ${p.amount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(p.payment_date), 'MMM d, yyyy')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {upcomingPayments.length > 5 && (
                <div className="mt-2 text-center">
                  <Link href="/grants">
                    <Button variant="ghost" size="sm">
                      View all upcoming payments
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── PAST SECTION ── */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Past</h2>
        <DashboardClient
          grants={grants}
          ytdGranted={ytdGranted}
          annualGoal={annualGoal}
          goalProgressChart={<GoalProgressChart key="goal-progress" granted={ytdGranted} goal={annualGoal} />}
          annualGoalEditor={
            <AnnualGoalEditor key="annual-goal-editor" foundationId={foundation.id} currentGoal={annualGoal} />
          }
        />
      </div>
    </div>
  )
}
