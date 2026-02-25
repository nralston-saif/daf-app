export type CsvRow = {
  orgName: string
  ein: string | null
  amount: number
  datePaid: string // ISO date string
  purpose: string | null
  address: string | null
  city: string | null
  state: string | null
  postalCode: string | null
}

export type MatchConfidence = 'high' | 'medium' | 'low'

export type OrgMatch = {
  type: 'exact_ein' | 'fuzzy_name' | 'new'
  confidence: MatchConfidence
  existingOrg: { id: string; name: string; ein: string | null } | null
  nameChanged: boolean
}

export type GrantMatch = {
  type: 'transition' | 'new'
  existingGrant: {
    id: string
    organization_id: string
    amount: number
    status: string
  } | null
}

export type ImportRow = {
  csv: CsvRow
  orgMatch: OrgMatch
  grantMatch: GrantMatch
  included: boolean
}
