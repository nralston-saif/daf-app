const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
const Papa = require('papaparse')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const FOUNDATION_ID = 'afa69d95-cb28-4d1f-bd73-15d179dbb4c2'

// Map Schwab "Submitted By" names to user IDs
const USER_MAP = {
  'Andrea Gayle Ralston': 'd776593f-8634-4ba9-add9-ff31b8fd169a',
  'Geoffrey David Ralston': 'ad6a3f0b-15bc-483d-a334-1382754b483b',
}

function normalizeForLookup(name) {
  return name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim()
}

function normalizeEin(ein) {
  return ein ? ein.replace(/-/g, '') : null
}

async function main() {
  // 1. Read the EIN lookup CSV
  const einCsvPath = path.join(__dirname, '..', 'daf-docs', 'Charities EIN & Types - Schwab_EIN_Lookup.csv')
  const einCsvContent = fs.readFileSync(einCsvPath, 'utf-8')
  const einResult = Papa.parse(einCsvContent, { header: true, skipEmptyLines: true })

  // Build lookup map: normalized name -> { name, ein, type }
  const einLookup = new Map()
  for (const row of einResult.data) {
    const name = row['Charity Name']?.trim()
    if (!name) continue
    const ein = row['EIN']?.trim() || null
    const type = row['Type']?.trim() || null
    einLookup.set(normalizeForLookup(name), { name, ein, type })
  }

  console.log(`Loaded ${einLookup.size} EIN lookup entries`)

  // 2. Read the Schwab grants CSV
  const schwabCsvPath = path.join(__dirname, '..', 'daf-docs', 'Schwab DAF History - grants_history.csv.csv')
  const schwabCsvContent = fs.readFileSync(schwabCsvPath, 'utf-8')
  const schwabResult = Papa.parse(schwabCsvContent, { header: true, skipEmptyLines: true })

  console.log(`Parsed ${schwabResult.data.length} rows from Schwab CSV`)

  // 3. Fetch existing organizations by EIN
  const { data: existingOrgs } = await supabase
    .from('organizations')
    .select('id, name, ein')
    .eq('foundation_id', FOUNDATION_ID)

  // Build EIN -> org map and name -> org map
  const orgByEin = new Map()
  const orgByNormalizedName = new Map()
  for (const org of existingOrgs || []) {
    if (org.ein) {
      orgByEin.set(normalizeEin(org.ein), org)
    }
    orgByNormalizedName.set(normalizeForLookup(org.name), org)
  }

  console.log(`Found ${existingOrgs?.length || 0} existing organizations`)

  // 4. Process each Schwab grant
  let skippedCanceled = 0
  let skippedBadAmount = 0
  let orgsCreated = 0
  let orgsReused = 0
  let grantsCreated = 0
  let einMatched = 0
  let noEin = 0
  const errors = []

  // Track orgs we create in this run to avoid duplicates
  const createdOrgsByEin = new Map()
  const createdOrgsByName = new Map()

  for (const record of schwabResult.data) {
    const status = record['Status']?.trim()
    if (status && status.toLowerCase() === 'canceled') {
      skippedCanceled++
      continue
    }

    const charityName = record['Charity Name']?.trim()
    if (!charityName) continue

    const amountStr = record['Amount']?.replace(/[$,]/g, '') || '0'
    const amount = parseFloat(amountStr)
    if (!amount || amount <= 0) {
      skippedBadAmount++
      continue
    }

    // Parse date MM/DD/YYYY -> YYYY-MM-DD
    const dateParts = (record['Requested Date'] || '').trim().split('/')
    let datePaid = null
    if (dateParts.length === 3) {
      const [month, day, year] = dateParts
      datePaid = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    }

    const submittedBy = record['Submitted By']?.trim()
    const userId = USER_MAP[submittedBy] || USER_MAP['Andrea Gayle Ralston']

    // Look up EIN from the lookup CSV
    const normalized = normalizeForLookup(charityName)
    let einEntry = einLookup.get(normalized)

    // Try prefix matching if exact didn't work
    if (!einEntry) {
      for (const [key, entry] of einLookup) {
        if (normalized.startsWith(key) || key.startsWith(normalized)) {
          einEntry = entry
          break
        }
      }
    }

    const ein = einEntry?.ein || null
    if (ein) {
      einMatched++
    } else {
      noEin++
    }

    // Find or create organization
    let orgId = null

    // Check by EIN first
    if (ein) {
      const normEin = normalizeEin(ein)
      const existing = orgByEin.get(normEin) || createdOrgsByEin.get(normEin)
      if (existing) {
        orgId = existing.id
        orgsReused++
      }
    }

    // Check by name
    if (!orgId) {
      const existing = orgByNormalizedName.get(normalized) || createdOrgsByName.get(normalized)
      if (existing) {
        orgId = existing.id
        orgsReused++
      }
    }

    // Create new org if needed
    if (!orgId) {
      const { data: newOrg, error: orgError } = await supabase
        .from('organizations')
        .insert({
          foundation_id: FOUNDATION_ID,
          name: charityName,
          ein: ein,
          created_by: userId,
        })
        .select('id')
        .single()

      if (orgError) {
        errors.push(`Org create failed for "${charityName}": ${orgError.message}`)
        continue
      }

      orgId = newOrg.id
      orgsCreated++

      const orgRecord = { id: orgId, name: charityName, ein }
      if (ein) createdOrgsByEin.set(normalizeEin(ein), orgRecord)
      createdOrgsByName.set(normalized, orgRecord)

      // Also add to our main maps for future lookups in this batch
      if (ein) orgByEin.set(normalizeEin(ein), orgRecord)
      orgByNormalizedName.set(normalized, orgRecord)
    }

    // Create the grant
    const { error: grantError } = await supabase
      .from('grants')
      .insert({
        foundation_id: FOUNDATION_ID,
        organization_id: orgId,
        status: 'paid',
        amount: amount,
        recurrence_type: 'one_time',
        proposed_by: userId,
        start_date: datePaid,
      })

    if (grantError) {
      errors.push(`Grant create failed for "${charityName}" $${amount}: ${grantError.message}`)
    } else {
      grantsCreated++
    }
  }

  console.log('\n=== Import Summary ===')
  console.log(`Grants created: ${grantsCreated}`)
  console.log(`Organizations created: ${orgsCreated}`)
  console.log(`Organizations reused: ${orgsReused}`)
  console.log(`EINs matched from lookup: ${einMatched}`)
  console.log(`No EIN found: ${noEin}`)
  console.log(`Skipped (canceled): ${skippedCanceled}`)
  console.log(`Skipped (bad amount): ${skippedBadAmount}`)

  if (errors.length > 0) {
    console.log(`\nErrors (${errors.length}):`)
    errors.forEach((e) => console.log(`  - ${e}`))
  }

  console.log('\nDone!')
}

main().catch(console.error)
