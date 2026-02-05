'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import Link from 'next/link'
import { ArrowLeft, Star } from 'lucide-react'
import { toast } from 'sonner'
import type { Grant, Organization, Recommendation } from '@/types/database'

// We need to add the RadioGroup component
// For now, I'll create a simple score selector

const scoreLabels = ['Poor', 'Below Average', 'Average', 'Good', 'Excellent']

interface ScoreSelectorProps {
  label: string
  description: string
  value: number
  onChange: (value: number) => void
}

function ScoreSelector({ label, description, value, onChange }: ScoreSelectorProps) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-base">{label}</Label>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((score) => (
          <button
            key={score}
            type="button"
            onClick={() => onChange(score)}
            className={`flex-1 p-3 rounded-lg border-2 transition-colors ${
              value === score
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className="text-lg font-semibold">{score}</div>
            <div className="text-xs">{scoreLabels[score - 1]}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

export default function GrantReviewPage() {
  const router = useRouter()
  const params = useParams()
  const grantId = params.id as string

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [grant, setGrant] = useState<(Grant & { organization: Organization }) | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [existingReview, setExistingReview] = useState<boolean>(false)

  // Review scores
  const [missionAlignment, setMissionAlignment] = useState(3)
  const [impact, setImpact] = useState(3)
  const [capacity, setCapacity] = useState(3)
  const [financialHealth, setFinancialHealth] = useState(3)
  const [comments, setComments] = useState('')
  const [recommendation, setRecommendation] = useState<Recommendation>('abstain')

  useEffect(() => {
    async function loadData() {
      const supabase = createClient()

      // Get user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Get profile
      const { data: profile } = await supabase
        .from('users')
        .select('id, foundation_id, role')
        .eq('auth_id', user.id)
        .single()

      if (!profile || !['primary_advisor', 'advisor'].includes(profile.role)) {
        router.push(`/grants/${grantId}`)
        return
      }

      setUserId(profile.id)

      // Get grant
      const { data: grantData, error: grantError } = await supabase
        .from('grants')
        .select('*, organization:organizations(*)')
        .eq('id', grantId)
        .eq('foundation_id', profile.foundation_id)
        .single()

      if (grantError || !grantData) {
        setError('Grant not found')
        setLoading(false)
        return
      }

      setGrant(grantData as Grant & { organization: Organization })

      // Check for existing review
      const { data: existingReviewData } = await supabase
        .from('grant_reviews')
        .select('*')
        .eq('grant_id', grantId)
        .eq('reviewer_id', profile.id)
        .single()

      if (existingReviewData) {
        setExistingReview(true)
        setMissionAlignment(existingReviewData.mission_alignment)
        setImpact(existingReviewData.impact)
        setCapacity(existingReviewData.capacity)
        setFinancialHealth(existingReviewData.financial_health)
        setComments(existingReviewData.comments || '')
        setRecommendation(existingReviewData.recommendation)
      }

      setLoading(false)
    }

    loadData()
  }, [grantId, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId || !grant) return

    setSubmitting(true)
    setError(null)

    const supabase = createClient()

    const reviewData = {
      grant_id: grantId,
      reviewer_id: userId,
      mission_alignment: missionAlignment,
      impact,
      capacity,
      financial_health: financialHealth,
      comments: comments || null,
      recommendation,
    }

    if (existingReview) {
      // Update
      const { error } = await supabase
        .from('grant_reviews')
        .update(reviewData)
        .eq('grant_id', grantId)
        .eq('reviewer_id', userId)

      if (error) {
        setError(error.message)
        setSubmitting(false)
        return
      }
      toast.success('Review updated')
    } else {
      // Create
      const { error } = await supabase
        .from('grant_reviews')
        .insert(reviewData)

      if (error) {
        setError(error.message)
        setSubmitting(false)
        return
      }

      // Log activity
      await supabase.from('activity_log').insert({
        foundation_id: grant.foundation_id,
        user_id: userId,
        action: 'grant_reviewed',
        entity_type: 'grant',
        entity_id: grantId,
        details: { recommendation },
      })

      toast.success('Review submitted')
    }

    router.push(`/grants/${grantId}`)
    router.refresh()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (error && !grant) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/grants/${grantId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {existingReview ? 'Edit Review' : 'Review Grant'}
          </h1>
          <p className="text-muted-foreground">
            {grant?.amount != null ? `$${grant.amount.toLocaleString()}` : 'TBD'} to {(grant?.organization as Organization)?.name}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Grant summary */}
        <Card>
          <CardHeader>
            <CardTitle>Grant Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Organization</p>
                <p className="font-medium">{(grant?.organization as Organization)?.name}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Amount</p>
                <p className="font-medium">{grant?.amount != null ? `$${grant.amount.toLocaleString()}` : 'TBD'}</p>
              </div>
            </div>
            {grant?.purpose && (
              <div className="pt-2">
                <p className="text-muted-foreground text-sm">Purpose</p>
                <p className="text-sm">{grant.purpose}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Scoring */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Evaluation Criteria
            </CardTitle>
            <CardDescription>
              Rate each criterion from 1 (Poor) to 5 (Excellent)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <ScoreSelector
              label="Mission Alignment"
              description="How well does this grant align with our foundation's mission and focus areas?"
              value={missionAlignment}
              onChange={setMissionAlignment}
            />

            <Separator />

            <ScoreSelector
              label="Expected Impact"
              description="What is the potential impact of this grant on the target population or cause?"
              value={impact}
              onChange={setImpact}
            />

            <Separator />

            <ScoreSelector
              label="Organizational Capacity"
              description="Does the organization have the capacity to effectively use these funds?"
              value={capacity}
              onChange={setCapacity}
            />

            <Separator />

            <ScoreSelector
              label="Financial Health"
              description="Is the organization financially stable and well-managed?"
              value={financialHealth}
              onChange={setFinancialHealth}
            />
          </CardContent>
        </Card>

        {/* Recommendation */}
        <Card>
          <CardHeader>
            <CardTitle>Recommendation</CardTitle>
            <CardDescription>What is your recommendation for this grant?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              {(['approve', 'abstain', 'decline'] as const).map((rec) => (
                <button
                  key={rec}
                  type="button"
                  onClick={() => setRecommendation(rec)}
                  className={`flex-1 p-4 rounded-lg border-2 transition-colors ${
                    recommendation === rec
                      ? rec === 'approve'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : rec === 'decline'
                          ? 'border-red-500 bg-red-50 text-red-700'
                          : 'border-gray-500 bg-gray-50 text-gray-700'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="font-semibold capitalize">{rec}</div>
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="comments">Comments</Label>
              <Textarea
                id="comments"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Share your thoughts on this grant proposal..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex gap-4">
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Submitting...' : existingReview ? 'Update Review' : 'Submit Review'}
          </Button>
          <Link href={`/grants/${grantId}`}>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  )
}
