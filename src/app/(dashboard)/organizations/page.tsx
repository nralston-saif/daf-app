import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { Plus, Search, Building2, ExternalLink } from 'lucide-react'
import { OrganizationsTable } from './organizations-table'

export default async function OrganizationsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; tag?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('users')
    .select('foundation_id')
    .eq('auth_id', user!.id)
    .single()

  if (!profile) {
    return <div>Loading...</div>
  }

  // Build query
  let query = supabase
    .from('organizations')
    .select('*, created_by_user:users!organizations_created_by_fkey(name)')
    .eq('foundation_id', profile.foundation_id)
    .order('name', { ascending: true })

  // Apply search filter
  if (params.search) {
    query = query.or(`name.ilike.%${params.search}%,ein.ilike.%${params.search}%`)
  }

  // Apply tag filter
  if (params.tag) {
    query = query.contains('tags', [params.tag])
  }

  const { data: organizations } = await query

  // Get unique tags
  const allTags = new Set<string>()
  organizations?.forEach((org: any) => {
    org.tags?.forEach((tag: string) => allTags.add(tag))
  })
  const tags = Array.from(allTags).sort()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Organizations</h1>
          <p className="text-gray-500 mt-1">Manage your grantee organizations</p>
        </div>
        <Link href="/organizations/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Organization
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <form className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="search"
                  name="search"
                  placeholder="Search organizations..."
                  defaultValue={params.search}
                  className="pl-10"
                />
              </div>
            </form>
            <div className="flex flex-wrap gap-2">
              {params.tag && (
                <Link href="/organizations">
                  <Badge variant="secondary" className="cursor-pointer">
                    {params.tag} ×
                  </Badge>
                </Link>
              )}
              {!params.tag && tags.slice(0, 5).map(tag => (
                <Link key={tag} href={`/organizations?tag=${encodeURIComponent(tag)}`}>
                  <Badge variant="outline" className="cursor-pointer hover:bg-gray-100">
                    {tag}
                  </Badge>
                </Link>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Organizations list */}
      {organizations && organizations.length > 0 ? (
        <OrganizationsTable organizations={organizations} />
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No organizations yet</h3>
              <p className="text-gray-500 mb-4">
                Add your first organization to start tracking potential grantees.
              </p>
              <Link href="/organizations/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Organization
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
