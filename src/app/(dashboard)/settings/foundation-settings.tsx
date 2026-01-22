'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import type { Foundation } from '@/types/database'

interface FoundationSettingsProps {
  foundation: Foundation
}

export function FoundationSettings({ foundation }: FoundationSettingsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState(foundation.name)
  const [mission, setMission] = useState(foundation.mission || '')
  const [focusAreas, setFocusAreas] = useState(foundation.focus_areas?.join(', ') || '')
  const [geographicScope, setGeographicScope] = useState(foundation.geographic_scope || '')
  const [annualBudget, setAnnualBudget] = useState(foundation.annual_budget?.toString() || '')
  const [dafBalance, setDafBalance] = useState(foundation.daf_balance?.toString() || '')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()

    const { error } = await supabase
      .from('foundations')
      .update({
        name,
        mission: mission || null,
        focus_areas: focusAreas.split(',').map(s => s.trim()).filter(Boolean),
        geographic_scope: geographicScope || null,
        annual_budget: annualBudget ? parseFloat(annualBudget) : null,
        daf_balance: dafBalance ? parseFloat(dafBalance) : null,
      })
      .eq('id', foundation.id)

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    toast.success('Foundation settings updated')
    setLoading(false)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Foundation Profile</CardTitle>
          <CardDescription>Basic information about your foundation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Foundation Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mission">Mission Statement</Label>
            <Textarea
              id="mission"
              value={mission}
              onChange={(e) => setMission(e.target.value)}
              placeholder="Describe your foundation's philanthropic mission..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="focusAreas">Focus Areas</Label>
            <Input
              id="focusAreas"
              value={focusAreas}
              onChange={(e) => setFocusAreas(e.target.value)}
              placeholder="Education, Healthcare, Environment"
            />
            <p className="text-xs text-muted-foreground">Separate with commas</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="geographicScope">Geographic Scope</Label>
            <Input
              id="geographicScope"
              value={geographicScope}
              onChange={(e) => setGeographicScope(e.target.value)}
              placeholder="Local, National, International"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Financial Information</CardTitle>
          <CardDescription>Track your DAF balance and budget</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="dafBalance">Current DAF Balance</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="dafBalance"
                  type="number"
                  value={dafBalance}
                  onChange={(e) => setDafBalance(e.target.value)}
                  placeholder="0"
                  className="pl-7"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="annualBudget">Annual Grant Budget</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="annualBudget"
                  type="number"
                  value={annualBudget}
                  onChange={(e) => setAnnualBudget(e.target.value)}
                  placeholder="0"
                  className="pl-7"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={loading}>
        {loading ? 'Saving...' : 'Save Changes'}
      </Button>
    </form>
  )
}
