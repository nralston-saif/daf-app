import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Plus, Building2, HandCoins, Calendar, TrendingUp, Clock, DollarSign, Target } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import type { Foundation, User, Grant, GrantStatus, Meeting } from '@/types/database'
import { GoalProgressChart } from '@/components/charts/goal-progress-chart'
import { FocusAreaChart } from '@/components/charts/focus-area-chart'
import { AnnualGoalEditor } from './annual-goal-editor'

type ProfileWithFoundation = User & { foundation: Foundation }

type DashboardGrant = {
  id: string
  status: GrantStatus
  amount: number
  organization: { name: string; tags?: string[] } | null
  created_at: string
}

type ActivityLog = {
  id: string
  action: string
  created_at: string
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

  // Fetch stats
  const [grantsResult, orgsResult, meetingsResult, activityResult] = await Promise.all([
    // Grants by status
    supabase
      .from('grants')
      .select('id, status, amount, organization:organizations(name, tags), created_at')
      .eq('foundation_id', foundation.id)
      .order('created_at', { ascending: false }),
    // Organizations count
    supabase
      .from('organizations')
      .select('id', { count: 'exact' })
      .eq('foundation_id', foundation.id),
    // Upcoming meetings
    supabase
      .from('meetings')
      .select('*')
      .eq('foundation_id', foundation.id)
      .gte('date_time', new Date().toISOString())
      .order('date_time', { ascending: true })
      .limit(3),
    // Recent activity
    supabase
      .from('activity_log')
      .select('*')
      .eq('foundation_id', foundation.id)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const grants = (grantsResult.data || []) as unknown as DashboardGrant[]
  const orgCount = orgsResult.count || 0
  const meetings = (meetingsResult.data || []) as unknown as Meeting[]
  const activities = (activityResult.data || []) as unknown as ActivityLog[]

  // Calculate stats
  const pendingGrants = grants.filter(g =>
    ['idea', 'research', 'review', 'pending_vote'].includes(g.status)
  )
  const approvedGrants = grants.filter(g =>
    ['approved', 'submitted', 'paid'].includes(g.status)
  )
  const ytdGranted = approvedGrants.reduce((sum, g) => sum + (g.amount || 0), 0)
  const pendingAmount = pendingGrants.reduce((sum, g) => sum + (g.amount || 0), 0)
  const annualGoal = (foundation as Foundation & { annual_giving_goal?: number }).annual_giving_goal || 0

  // Calculate focus area breakdown from approved grants
  const focusAreaTotals: Record<string, number> = {}
  approvedGrants.forEach(grant => {
    const tags = grant.organization?.tags || []
    const amountPerTag = tags.length > 0 ? grant.amount / tags.length : 0
    tags.forEach(tag => {
      focusAreaTotals[tag] = (focusAreaTotals[tag] || 0) + amountPerTag
    })
  })
  const focusAreaData = Object.entries(focusAreaTotals)
    .map(([name, value]) => ({ name, value: Math.round(value) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)

  const statusColors: Record<string, string> = {
    idea: 'bg-gray-100 text-gray-800',
    research: 'bg-blue-100 text-blue-800',
    review: 'bg-yellow-100 text-yellow-800',
    pending_vote: 'bg-orange-100 text-orange-800',
    approved: 'bg-green-100 text-green-800',
    submitted: 'bg-purple-100 text-purple-800',
    paid: 'bg-emerald-100 text-emerald-800',
    declined: 'bg-red-100 text-red-800',
    closed: 'bg-gray-100 text-gray-800',
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome back, {profile.name}</p>
      </div>

      {/* Quick stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">DAF Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold truncate">
              ${(foundation.daf_balance || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Available for grants
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">YTD Granted</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold truncate">
              ${ytdGranted.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {approvedGrants.length} grants approved
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Annual Giving Goal</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold truncate">
              ${annualGoal.toLocaleString()}
            </div>
            <AnnualGoalEditor
              foundationId={foundation.id}
              currentGoal={annualGoal}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Grants</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">{pendingGrants.length}</div>
            <p className="text-xs text-muted-foreground truncate">
              ${pendingAmount.toLocaleString()} in pipeline
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Organizations</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">{orgCount}</div>
            <p className="text-xs text-muted-foreground">
              In your portfolio
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Annual Goal Progress</CardTitle>
            <CardDescription>
              ${ytdGranted.toLocaleString()} of ${annualGoal.toLocaleString()} goal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GoalProgressChart granted={ytdGranted} goal={annualGoal} />
            {annualGoal > 0 && ytdGranted < annualGoal && (
              <p className="text-center text-sm text-muted-foreground mt-2">
                ${(annualGoal - ytdGranted).toLocaleString()} remaining to reach goal
              </p>
            )}
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

      {/* Quick actions */}
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
        <Link href="/meetings/new">
          <Button variant="outline">
            <Calendar className="h-4 w-4 mr-2" />
            Schedule Meeting
          </Button>
        </Link>
      </div>

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent grants */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Recent Grants
              <Link href="/grants">
                <Button variant="ghost" size="sm">View all</Button>
              </Link>
            </CardTitle>
            <CardDescription>Latest grant activity</CardDescription>
          </CardHeader>
          <CardContent>
            {grants.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No grants yet. Create your first grant to get started.
              </p>
            ) : (
              <div className="space-y-4">
                {grants.slice(0, 5).map((grant) => (
                  <Link
                    key={grant.id}
                    href={`/grants/${grant.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="space-y-1">
                      <p className="font-medium text-sm">
                        {(grant.organization as { name: string })?.name || 'Unknown Org'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        ${(grant.amount || 0).toLocaleString()}
                      </p>
                    </div>
                    <Badge className={statusColors[grant.status] || 'bg-gray-100'}>
                      {grant.status.replace('_', ' ')}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming meetings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Upcoming Meetings
              <Link href="/meetings">
                <Button variant="ghost" size="sm">View all</Button>
              </Link>
            </CardTitle>
            <CardDescription>Scheduled meetings</CardDescription>
          </CardHeader>
          <CardContent>
            {meetings.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No upcoming meetings scheduled.
              </p>
            ) : (
              <div className="space-y-4">
                {meetings.map((meeting) => (
                  <Link
                    key={meeting.id}
                    href={`/meetings/${meeting.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="space-y-1">
                      <p className="font-medium text-sm">{meeting.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(meeting.date_time), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                    <Badge variant="outline">{meeting.type}</Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activity feed */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest updates from your foundation</CardDescription>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No recent activity.
            </p>
          ) : (
            <div className="space-y-4">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-4 p-3 rounded-lg">
                  <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                    {activity.action.includes('grant') && <HandCoins className="h-4 w-4 text-gray-600" />}
                    {activity.action.includes('org') && <Building2 className="h-4 w-4 text-gray-600" />}
                    {activity.action.includes('meeting') && <Calendar className="h-4 w-4 text-gray-600" />}
                    {activity.action.includes('user') && <Building2 className="h-4 w-4 text-gray-600" />}
                    {activity.action.includes('foundation') && <Building2 className="h-4 w-4 text-gray-600" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {activity.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
