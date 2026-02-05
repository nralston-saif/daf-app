import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import Link from 'next/link'
import {
  ArrowLeft,
  Edit,
  Building2,
  Calendar,
  User,
  Star,
  MessageSquare,
  FileText,
  DollarSign,
} from 'lucide-react'
import { format } from 'date-fns'
import { GrantStatusSelect } from './grant-status-select'
import { GrantComments } from './grant-comments'
import { PaymentSchedule } from './payment-schedule'
import type { GrantStatus } from '@/types/database'

const statusColors: Record<string, string> = {
  review: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  paid: 'bg-emerald-100 text-emerald-800',
  declined: 'bg-red-100 text-red-800',
  closed: 'bg-gray-100 text-gray-800',
}

export default async function GrantDetailPage({
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

  // Get grant with all relations
  const { data: grant, error } = await supabase
    .from('grants')
    .select(`
      *,
      organization:organizations(*),
      proposed_by_user:users!grants_proposed_by_fkey(id, name, email),
      approved_by_user:users!grants_approved_by_fkey(id, name)
    `)
    .eq('id', id)
    .eq('foundation_id', profile.foundation_id)
    .single()

  if (error || !grant) {
    notFound()
  }

  // Get reviews
  const { data: reviews } = await supabase
    .from('grant_reviews')
    .select('*, reviewer:users(id, name)')
    .eq('grant_id', id)
    .order('created_at', { ascending: false })

  // Get comments
  const { data: comments } = await supabase
    .from('grant_comments')
    .select('*, user:users(id, name)')
    .eq('grant_id', id)
    .order('created_at', { ascending: true })

  // Get payment schedule
  const { data: payments } = await supabase
    .from('grant_payments')
    .select('*')
    .eq('grant_id', id)
    .order('payment_date', { ascending: true })

  // Get documents
  const { data: documents } = await supabase
    .from('documents')
    .select('*')
    .eq('entity_type', 'grant')
    .eq('entity_id', id)
    .order('created_at', { ascending: false })

  const canEdit = ['primary_advisor', 'advisor'].includes(profile.role)
  const canReview = ['primary_advisor', 'advisor'].includes(profile.role)
  const hasReviewed = reviews?.some(r => (r.reviewer as { id: string })?.id === profile.id)

  // Calculate average scores
  const avgScores = reviews && reviews.length > 0
    ? {
        mission_alignment: reviews.reduce((sum, r) => sum + (r.mission_alignment || 0), 0) / reviews.length,
        impact: reviews.reduce((sum, r) => sum + (r.impact || 0), 0) / reviews.length,
        capacity: reviews.reduce((sum, r) => sum + (r.capacity || 0), 0) / reviews.length,
        financial_health: reviews.reduce((sum, r) => sum + (r.financial_health || 0), 0) / reviews.length,
      }
    : null

  const overallAvg = avgScores
    ? (avgScores.mission_alignment + avgScores.impact + avgScores.capacity + avgScores.financial_health) / 4
    : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/grants">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                {grant.amount != null ? `$${grant.amount.toLocaleString()}` : 'TBD'}
              </h1>
              <Badge className={statusColors[grant.status] || 'bg-gray-100'}>
                {grant.status.replace('_', ' ')}
              </Badge>
            </div>
            <Link
              href={`/organizations/${grant.organization?.id}`}
              className="text-muted-foreground hover:underline mt-1 inline-block"
            >
              {(grant.organization as { name: string })?.name || 'Unknown Organization'}
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canReview && !hasReviewed && (
            <Link href={`/grants/${id}/review`}>
              <Button variant="outline">
                <Star className="h-4 w-4 mr-2" />
                Add Review
              </Button>
            </Link>
          )}
          {canEdit && (
            <>
              <GrantStatusSelect
                grantId={id}
                currentStatus={grant.status as GrantStatus}
                userId={profile.id}
              />
              <Link href={`/grants/${id}/edit`}>
                <Button variant="outline" size="icon">
                  <Edit className="h-4 w-4" />
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Focus areas */}
      {grant.focus_areas && grant.focus_areas.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {grant.focus_areas.map((area: string) => (
            <Badge key={area} variant="outline">{area}</Badge>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Grant info */}
          <Card>
            <CardHeader>
              <CardTitle>Grant Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {grant.purpose && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Purpose</h4>
                  <p className="text-sm whitespace-pre-wrap">{grant.purpose}</p>
                </div>
              )}

              <Separator />

              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Calendar className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Timeline</p>
                    <p className="text-sm font-medium">
                      {grant.start_date && grant.end_date
                        ? `${format(new Date(grant.start_date), 'MMM d, yyyy')} - ${format(new Date(grant.end_date), 'MMM d, yyyy')}`
                        : grant.start_date
                          ? `Starting ${format(new Date(grant.start_date), 'MMM d, yyyy')}`
                          : 'Not specified'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <User className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Proposed by</p>
                    <p className="text-sm font-medium">
                      {(grant.proposed_by_user as { name: string })?.name || 'Unknown'}
                    </p>
                  </div>
                </div>
              </div>

              {grant.approved_by && (
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <User className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Approved by</p>
                    <p className="text-sm font-medium">
                      {(grant.approved_by_user as { name: string })?.name || 'Unknown'}
                    </p>
                  </div>
                </div>
              )}

              <Separator />

              <p className="text-xs text-muted-foreground">
                Created {format(new Date(grant.created_at), 'MMM d, yyyy h:mm a')}
                {grant.updated_at !== grant.created_at && (
                  <> · Updated {format(new Date(grant.updated_at), 'MMM d, yyyy h:mm a')}</>
                )}
              </p>
            </CardContent>
          </Card>

          {grant.recurrence_type !== 'one_time' && (
            <PaymentSchedule
              grantId={id}
              payments={payments || []}
            />
          )}

          {/* Reviews */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Reviews</CardTitle>
                <CardDescription>
                  {reviews?.length || 0} reviews
                  {overallAvg && ` · ${overallAvg.toFixed(1)} avg`}
                </CardDescription>
              </div>
              {canReview && !hasReviewed && (
                <Link href={`/grants/${id}/review`}>
                  <Button size="sm">Add Review</Button>
                </Link>
              )}
            </CardHeader>
            <CardContent>
              {avgScores && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                  <ScoreDisplay label="Mission" value={avgScores.mission_alignment} />
                  <ScoreDisplay label="Impact" value={avgScores.impact} />
                  <ScoreDisplay label="Capacity" value={avgScores.capacity} />
                  <ScoreDisplay label="Financial" value={avgScores.financial_health} />
                </div>
              )}

              {reviews && reviews.length > 0 ? (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div key={review.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {(review.reviewer as { name: string })?.name || 'Unknown'}
                          </span>
                          <Badge variant={
                            review.recommendation === 'approve' ? 'default' :
                            review.recommendation === 'decline' ? 'destructive' : 'secondary'
                          }>
                            {review.recommendation}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(review.created_at), 'MMM d, yyyy')}
                        </span>
                      </div>
                      {review.comments && (
                        <p className="text-sm text-muted-foreground">{review.comments}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No reviews yet
                </p>
              )}
            </CardContent>
          </Card>

          {/* Comments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Discussion
              </CardTitle>
              <CardDescription>{comments?.length || 0} comments</CardDescription>
            </CardHeader>
            <CardContent>
              <GrantComments
                grantId={id}
                comments={comments || []}
                userId={profile.id}
              />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Organization card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Organization
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Link
                href={`/organizations/${grant.organization?.id}`}
                className="block hover:bg-gray-50 -mx-6 -mb-6 p-6 pt-0"
              >
                <h4 className="font-semibold">
                  {(grant.organization as { name: string })?.name}
                </h4>
                {(grant.organization as { mission?: string })?.mission && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {(grant.organization as { mission?: string }).mission}
                  </p>
                )}
                {(grant.organization as { tags?: string[] })?.tags && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {((grant.organization as { tags?: string[] }).tags || []).slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </Link>
            </CardContent>
          </Card>

          {/* Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              {documents && documents.length > 0 ? (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-2 rounded hover:bg-gray-50"
                    >
                      <span className="text-sm truncate">{doc.file_name}</span>
                      <Button variant="ghost" size="sm">Download</Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">
                  No documents
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function ScoreDisplay({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value.toFixed(1)}</p>
    </div>
  )
}
