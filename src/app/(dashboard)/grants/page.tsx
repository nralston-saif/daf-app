import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from 'next/link'
import { Plus, HandCoins } from 'lucide-react'
import { GrantsPipeline } from './grants-pipeline'
import { GrantsTable } from './grants-table'

export default async function GrantsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; status?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('id, foundation_id, role')
    .eq('auth_id', user.id)
    .single()

  if (!profile) redirect('/login')

  // Get grants with organization info
  let query = supabase
    .from('grants')
    .select(`
      *,
      organization:organizations(id, name, tags),
      proposed_by_user:users!grants_proposed_by_fkey(name)
    `)
    .eq('foundation_id', profile.foundation_id)
    .order('created_at', { ascending: false })

  if (params.status) {
    query = query.eq('status', params.status)
  }

  const { data: grants } = await query

  // Group grants by status for pipeline view
  const statuses = ['idea', 'research', 'review', 'pending_vote', 'approved', 'submitted', 'paid', 'declined', 'closed']
  const grantsByStatus: Record<string, any[]> = {}
  statuses.forEach(status => {
    grantsByStatus[status] = grants?.filter((g: any) => g.status === status) || []
  })

  // Calculate stats
  const pipelineStats = {
    total: grants?.length || 0,
    totalValue: grants?.reduce((sum, g) => sum + (g.amount || 0), 0) || 0,
    pending: grants?.filter(g => ['idea', 'research', 'review', 'pending_vote'].includes(g.status)).length || 0,
    approved: grants?.filter(g => ['approved', 'submitted', 'paid'].includes(g.status)).length || 0,
  }

  const view = params.view || 'pipeline'
  const canCreate = ['primary_advisor', 'advisor'].includes(profile.role)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Grants</h1>
          <p className="text-gray-500 mt-1">
            {pipelineStats.total} grants · ${pipelineStats.totalValue.toLocaleString()} total
          </p>
        </div>
        {canCreate && (
          <Link href="/grants/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Grant
            </Button>
          </Link>
        )}
      </div>

      {/* Stats summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{pipelineStats.pending}</div>
            <p className="text-sm text-muted-foreground">In Pipeline</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{pipelineStats.approved}</div>
            <p className="text-sm text-muted-foreground">Approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {grants?.filter(g => g.status === 'pending_vote').length || 0}
            </div>
            <p className="text-sm text-muted-foreground">Pending Vote</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {grants?.filter(g => g.status === 'review').length || 0}
            </div>
            <p className="text-sm text-muted-foreground">Under Review</p>
          </CardContent>
        </Card>
      </div>

      {/* View toggle */}
      <Tabs defaultValue={view} className="w-full">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="pipeline">
              <Link href="/grants?view=pipeline">Pipeline</Link>
            </TabsTrigger>
            <TabsTrigger value="list">
              <Link href="/grants?view=list">List</Link>
            </TabsTrigger>
          </TabsList>

          {/* Status filter badges */}
          <div className="flex gap-2 flex-wrap">
            {params.status && (
              <Link href="/grants">
                <Badge variant="secondary" className="cursor-pointer">
                  {params.status.replace('_', ' ')} ×
                </Badge>
              </Link>
            )}
          </div>
        </div>

        <TabsContent value="pipeline" className="mt-6">
          {grants && grants.length > 0 ? (
            <GrantsPipeline grantsByStatus={grantsByStatus} />
          ) : (
            <EmptyState canCreate={canCreate} />
          )}
        </TabsContent>

        <TabsContent value="list" className="mt-6">
          {grants && grants.length > 0 ? (
            <GrantsTable grants={grants} />
          ) : (
            <EmptyState canCreate={canCreate} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function EmptyState({ canCreate }: { canCreate: boolean }) {
  return (
    <Card>
      <CardContent className="py-12">
        <div className="text-center">
          <HandCoins className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No grants yet</h3>
          <p className="text-gray-500 mb-4">
            Create your first grant to start tracking your giving.
          </p>
          {canCreate && (
            <Link href="/grants/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Grant
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
