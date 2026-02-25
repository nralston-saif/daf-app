import type { CsvRow, OrgMatch, GrantMatch, ImportRow } from './types'

type ExistingOrg = { id: string; name: string; ein: string | null }
type ExistingGrant = {
  id: string
  organization_id: string
  amount: number
  status: string
}

const STRIP_SUFFIXES =
  /\b(inc\.?|incorporated|llc|corp\.?|corporation|foundation|fund|trust|org\.?|organization|co\.?|company|ltd\.?|limited|assoc\.?|association|the)\b/gi

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(STRIP_SUFFIXES, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function jaccardSimilarity(a: string, b: string): number {
  const setA = new Set(normalizeName(a).split(' ').filter(Boolean))
  const setB = new Set(normalizeName(b).split(' ').filter(Boolean))
  if (setA.size === 0 && setB.size === 0) return 0

  let intersection = 0
  for (const word of setA) {
    if (setB.has(word)) intersection++
  }
  const union = setA.size + setB.size - intersection
  return union === 0 ? 0 : intersection / union
}

export function matchOrganizations(
  csvRows: CsvRow[],
  existingOrgs: ExistingOrg[]
): OrgMatch[] {
  const einIndex = new Map<string, ExistingOrg>()
  for (const org of existingOrgs) {
    if (org.ein) {
      einIndex.set(org.ein.replace(/-/g, ''), org)
    }
  }

  // Track the first "new" org per EIN within this batch so duplicates
  // in the same CSV file are grouped together instead of creating
  // multiple organizations with the same EIN.
  const batchEinFirstOrg = new Map<string, { index: number; orgName: string }>()

  return csvRows.map((row, rowIndex) => {
    // 1. Try EIN exact match against existing DB orgs
    if (row.ein) {
      const normalizedEin = row.ein.replace(/-/g, '')
      const match = einIndex.get(normalizedEin)
      if (match) {
        const nameChanged =
          match.name.toLowerCase().trim() !== row.orgName.toLowerCase().trim()
        return {
          type: 'exact_ein' as const,
          confidence: 'high' as const,
          existingOrg: match,
          nameChanged,
        }
      }

      // 2. Check if an earlier row in this batch already introduced this EIN.
      //    Mark as medium confidence so it's included by default — the commit
      //    step will reuse the org created for the first row with this EIN.
      const batchFirst = batchEinFirstOrg.get(normalizedEin)
      if (batchFirst) {
        return {
          type: 'new' as const,
          confidence: 'medium' as const,
          existingOrg: null,
          nameChanged: false,
        }
      }

      // Record this row as the first with this EIN
      batchEinFirstOrg.set(normalizedEin, { index: rowIndex, orgName: row.orgName })
    }

    // 3. Try fuzzy name match
    let bestMatch: ExistingOrg | null = null
    let bestScore = 0
    for (const org of existingOrgs) {
      const score = jaccardSimilarity(row.orgName, org.name)
      if (score > bestScore) {
        bestScore = score
        bestMatch = org
      }
    }

    if (bestMatch && bestScore >= 0.7) {
      return {
        type: 'fuzzy_name' as const,
        confidence: 'medium' as const,
        existingOrg: bestMatch,
        nameChanged:
          bestMatch.name.toLowerCase().trim() !==
          row.orgName.toLowerCase().trim(),
      }
    }

    // 4. No match
    return {
      type: 'new' as const,
      confidence: 'low' as const,
      existingOrg: null,
      nameChanged: false,
    }
  })
}

export function matchGrants(
  importRows: { csv: CsvRow; orgMatch: OrgMatch }[],
  existingApprovedGrants: ExistingGrant[]
): GrantMatch[] {
  return importRows.map(({ orgMatch, csv }) => {
    if (orgMatch.existingOrg) {
      // Find all approved grants for this org (match on org only, not amount)
      const candidates = existingApprovedGrants.filter(
        (g) =>
          g.organization_id === orgMatch.existingOrg!.id &&
          g.status === 'approved'
      )

      if (candidates.length === 1) {
        return {
          type: 'transition' as const,
          existingGrant: candidates[0],
        }
      }

      if (candidates.length > 1) {
        // Disambiguate: pick the grant with the closest amount to the CSV row
        const best = candidates.reduce((prev, curr) =>
          Math.abs(curr.amount - csv.amount) <
          Math.abs(prev.amount - csv.amount)
            ? curr
            : prev
        )
        return {
          type: 'transition' as const,
          existingGrant: best,
        }
      }
    }

    return {
      type: 'new' as const,
      existingGrant: null,
    }
  })
}

export function buildImportRows(
  csvRows: CsvRow[],
  existingOrgs: ExistingOrg[],
  existingApprovedGrants: ExistingGrant[]
): ImportRow[] {
  const orgMatches = matchOrganizations(csvRows, existingOrgs)

  const intermediate = csvRows.map((csv, i) => ({
    csv,
    orgMatch: orgMatches[i],
  }))

  const grantMatches = matchGrants(intermediate, existingApprovedGrants)

  return csvRows.map((csv, i) => ({
    csv,
    orgMatch: orgMatches[i],
    grantMatch: grantMatches[i],
    included: orgMatches[i].confidence !== 'low',
  }))
}
