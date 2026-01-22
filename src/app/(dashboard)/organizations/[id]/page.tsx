import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import {
  ArrowLeft,
  Edit,
  ExternalLink,
  Mail,
  Phone,
  MapPin,
  Star,
  DollarSign,
  Calendar,
  Building2,
} from 'lucide-react'
import { format } from 'date-fns'
import { DeleteOrganizationButton } from './delete-button'

export default async function OrganizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('id, foundation_id, role')
    .eq('auth_id', user.id)
    .single()

  if (!profile) redirect('/login')

  // Get organization
  const { data: organization, error } = await supabase
    .from('organizations')
    .select('*, created_by_user:users!organizations_created_by_fkey(name)')
    .eq('id', id)
    .eq('foundation_id', profile.foundation_id)
    .single()

  if (error || !organization) {
    notFound()
  }

  // Get grants for this organization
  const { data: grants } = await supabase
    .from('grants')
    .select('id, status, amount, purpose, created_at')
    .eq('organization_id', id)
    .order('created_at', { ascending: false })

  // Get documents
  const { data: documents } = await supabase
    .from('documents')
    .select('*')
    .eq('entity_type', 'organization')
    .eq('entity_id', id)
    .order('created_at', { ascending: false })

  const canEdit = ['primary_advisor', 'advisor'].includes(profile.role)
  const canDelete = profile.role === 'primary_advisor'

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

  const formatBudget = (budget: number | null) => {
    if (!budget) return 'Not specified'
    return `$${budget.toLocaleString()}`
  }

  const totalGranted = grants?.reduce((sum, g) => {
    if (['approved', 'submitted', 'paid'].includes(g.status)) {
      return sum + (g.amount || 0)
    }
    return sum
  }, 0) || 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/organizations">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{organization.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              {organization.ein && (
                <span className="text-sm text-muted-foreground">EIN: {organization.ein}</span>
              )}
              {organization.tax_status && (
                <Badge variant="secondary">{organization.tax_status}</Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {organization.website && (
            <a
              href={organization.website}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm">
                <ExternalLink className="h-4 w-4 mr-2" />
                Website
              </Button>
            </a>
          )}
          {canEdit && (
            <Link href={`/organizations/${id}/edit`}>
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </Link>
          )}
          {canDelete && (
            <DeleteOrganizationButton
              organizationId={id}
              organizationName={organization.name}
            />
          )}
        </div>
      </div>

      {/* Tags */}
      {organization.tags && organization.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {organization.tags.map((tag: string) => (
            <Badge key={tag} variant="outline">{tag}</Badge>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Annual Budget</p>
                <p className="text-lg font-semibold">{formatBudget(organization.annual_budget)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Granted</p>
                <p className="text-lg font-semibold">${totalGranted.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Star className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rating</p>
                <p className="text-lg font-semibold">
                  {organization.overall_rating
                    ? `${organization.overall_rating.toFixed(1)} / 5`
                    : 'Not rated'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Mission & Info */}
        <Card>
          <CardHeader>
            <CardTitle>About</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {organization.mission && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Mission</h4>
                <p className="text-sm">{organization.mission}</p>
              </div>
            )}
            <div className="pt-2 border-t">
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Contact</h4>
              <div className="space-y-2 text-sm">
                {organization.contact_name && (
                  <p className="font-medium">{organization.contact_name}</p>
                )}
                {organization.contact_email && (
                  <a
                    href={`mailto:${organization.contact_email}`}
                    className="flex items-center gap-2 text-blue-600 hover:underline"
                  >
                    <Mail className="h-4 w-4" />
                    {organization.contact_email}
                  </a>
                )}
                {organization.contact_phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    {organization.contact_phone}
                  </div>
                )}
                {organization.address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    {organization.address}
                  </div>
                )}
              </div>
            </div>
            {organization.notes && (
              <div className="pt-2 border-t">
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Notes</h4>
                <p className="text-sm whitespace-pre-wrap">{organization.notes}</p>
              </div>
            )}
            <div className="pt-2 border-t text-xs text-muted-foreground">
              Added by {(organization as { created_by_user?: { name: string } }).created_by_user?.name || 'Unknown'} on{' '}
              {format(new Date(organization.created_at), 'MMM d, yyyy')}
            </div>
          </CardContent>
        </Card>

        {/* Grants */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Grant History</CardTitle>
              <CardDescription>{grants?.length || 0} grants</CardDescription>
            </div>
            <Link href={`/grants/new?organization=${id}`}>
              <Button size="sm">New Grant</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {grants && grants.length > 0 ? (
              <div className="space-y-3">
                {grants.map((grant: any) => (
                  <Link
                    key={grant.id}
                    href={`/grants/${grant.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors border"
                  >
                    <div>
                      <p className="font-medium text-sm">${grant.amount.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">
                        {grant.purpose?.substring(0, 50) || 'No purpose specified'}
                        {grant.purpose && grant.purpose.length > 50 ? '...' : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge className={statusColors[grant.status] || 'bg-gray-100'}>
                        {grant.status.replace('_', ' ')}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(grant.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Building2 className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No grants yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Documents */}
      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
          <CardDescription>Files and documents related to this organization</CardDescription>
        </CardHeader>
        <CardContent>
          {documents && documents.length > 0 ? (
            <div className="space-y-2">
              {documents.map((doc: any) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded">
                      <Calendar className="h-4 w-4 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{doc.file_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(doc.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">Download</Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No documents uploaded
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
