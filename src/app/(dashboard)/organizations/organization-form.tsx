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
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MultiSelect } from '@/components/ui/multi-select'
import { toast } from 'sonner'
import type { Organization } from '@/types/database'

const FOCUS_AREA_OPTIONS = [
  'Education',
  'Healthcare',
  'Environment',
  'Poverty Alleviation',
  'Arts & Culture',
  'Human Rights',
  'Animal Welfare',
  'Community Development',
  'Disaster Relief',
  'Scientific Research',
  'Youth Development',
  'Senior Services',
  'Mental Health',
  'Housing',
  'Food Security',
]

interface OrganizationFormProps {
  organization?: Organization
  userId: string
  foundationId: string
}

export function OrganizationForm({ organization, userId, foundationId }: OrganizationFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState(organization?.name || '')
  const [ein, setEin] = useState(organization?.ein || '')
  const [website, setWebsite] = useState(organization?.website || '')
  const [mission, setMission] = useState(organization?.mission || '')
  const [annualBudget, setAnnualBudget] = useState(organization?.annual_budget?.toString() || '')
  const [taxStatus, setTaxStatus] = useState(organization?.tax_status || '')
  const [tags, setTags] = useState<string[]>(organization?.tags || [])
  const [contactName, setContactName] = useState(organization?.contact_name || '')
  const [contactEmail, setContactEmail] = useState(organization?.contact_email || '')
  const [contactPhone, setContactPhone] = useState(organization?.contact_phone || '')
  const [address, setAddress] = useState(organization?.address || '')
  const [notes, setNotes] = useState(organization?.notes || '')
  const [recommender, setRecommender] = useState(organization?.recommender || '')
  const [personalInvolvement, setPersonalInvolvement] = useState(organization?.personal_involvement || false)
  const [impactGoals, setImpactGoals] = useState(organization?.impact_goals || '')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()

    const orgData = {
      name,
      ein: ein || null,
      website: website || null,
      mission: mission || null,
      annual_budget: annualBudget ? parseFloat(annualBudget) : null,
      tax_status: taxStatus || null,
      tags,
      contact_name: contactName || null,
      contact_email: contactEmail || null,
      contact_phone: contactPhone || null,
      address: address || null,
      notes: notes || null,
      recommender: recommender || null,
      personal_involvement: personalInvolvement,
      impact_goals: impactGoals || null,
      foundation_id: foundationId,
      created_by: userId,
    }

    if (organization) {
      // Update
      const { error } = await supabase
        .from('organizations')
        .update(orgData)
        .eq('id', organization.id)

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }
      toast.success('Organization updated')
    } else {
      // Create
      const { data, error } = await supabase
        .from('organizations')
        .insert(orgData)
        .select()
        .single()

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      // Log activity
      await supabase.from('activity_log').insert({
        foundation_id: foundationId,
        user_id: userId,
        action: 'organization_created',
        entity_type: 'organization',
        entity_id: data.id,
        details: { name },
      })

      toast.success('Organization created')
      router.push(`/organizations/${data.id}`)
      return
    }

    setLoading(false)
    router.push(`/organizations/${organization?.id}`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>General information about the organization</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Organization Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Organization name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ein">EIN (Tax ID)</Label>
              <Input
                id="ein"
                value={ein}
                onChange={(e) => setEin(e.target.value)}
                placeholder="XX-XXXXXXX"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxStatus">Tax Status</Label>
              <Select value={taxStatus} onValueChange={setTaxStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="501c3">501(c)(3)</SelectItem>
                  <SelectItem value="501c4">501(c)(4)</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mission">Mission Statement</Label>
            <Textarea
              id="mission"
              value={mission}
              onChange={(e) => setMission(e.target.value)}
              placeholder="Describe the organization's mission..."
              rows={3}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="annualBudget">Annual Budget</Label>
              <Input
                id="annualBudget"
                type="number"
                value={annualBudget}
                onChange={(e) => setAnnualBudget(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Tags / Focus Areas</Label>
              <MultiSelect
                options={FOCUS_AREA_OPTIONS}
                selected={tags}
                onChange={setTags}
                placeholder="Select focus areas..."
                allowCustom
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Relationship</CardTitle>
          <CardDescription>Your connection to this organization</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="recommender">Recommender</Label>
              <Input
                id="recommender"
                value={recommender}
                onChange={(e) => setRecommender(e.target.value)}
                placeholder="Who recommended this organization?"
              />
              <p className="text-xs text-muted-foreground">Person who introduced you to this org</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="personalInvolvement">Personal Involvement</Label>
              <div className="flex items-center space-x-2 pt-2">
                <Switch
                  id="personalInvolvement"
                  checked={personalInvolvement}
                  onCheckedChange={setPersonalInvolvement}
                />
                <Label htmlFor="personalInvolvement" className="text-sm font-normal">
                  {personalInvolvement ? 'Yes, personally involved' : 'No personal involvement'}
                </Label>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="impactGoals">Impact Goals</Label>
            <Textarea
              id="impactGoals"
              value={impactGoals}
              onChange={(e) => setImpactGoals(e.target.value)}
              placeholder="What impact do you hope to achieve with this organization?"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
          <CardDescription>Primary contact at the organization</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contactName">Contact Name</Label>
              <Input
                id="contactName"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="John Smith"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactEmail">Contact Email</Label>
              <Input
                id="contactEmail"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="contact@org.com"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contactPhone">Contact Phone</Label>
              <Input
                id="contactPhone"
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="(555) 555-5555"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Main St, City, State"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
          <CardDescription>Internal notes about this organization</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any notes or observations..."
            rows={4}
          />
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : organization ? 'Update Organization' : 'Create Organization'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
