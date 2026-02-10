import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ImportClient } from './import-client'
import { promises as fs } from 'fs'
import path from 'path'
import { parseEinLookupCsv } from '@/lib/csv-import/parse-schwab-csv'

export default async function ImportPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('id, foundation_id, role')
    .eq('auth_id', user.id)
    .single()

  if (!profile) redirect('/login')

  if (!['primary_advisor', 'advisor'].includes(profile.role)) {
    redirect('/grants')
  }

  // Fetch all organizations for this foundation
  const { data: orgs } = await supabase
    .from('organizations')
    .select('id, name, ein')
    .eq('foundation_id', profile.foundation_id)

  // Fetch all approved grants with org info
  const { data: approvedGrants } = await supabase
    .from('grants')
    .select('id, organization_id, amount, status')
    .eq('foundation_id', profile.foundation_id)
    .eq('status', 'approved')

  // Load the Schwab EIN lookup CSV
  const einLookupPath = path.join(
    process.cwd(),
    'daf-docs',
    'Charities EIN & Types - Schwab_EIN_Lookup.csv'
  )
  const einLookupContent = await fs.readFile(einLookupPath, 'utf-8')
  const { entries: einLookupEntries } = parseEinLookupCsv(einLookupContent)

  return (
    <ImportClient
      orgs={orgs || []}
      approvedGrants={approvedGrants || []}
      userId={profile.id}
      foundationId={profile.foundation_id}
      einLookupEntries={einLookupEntries}
    />
  )
}
