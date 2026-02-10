import Papa from 'papaparse'
import type { CsvRow } from './types'

const SCHWAB_REQUIRED_HEADERS = ['Requested Date', 'Status', 'Charity Name', 'Amount']

type EinLookupEntry = {
  name: string
  ein: string | null
  type: string | null
}

/**
 * Parse the Schwab EIN lookup CSV (Charities EIN & Types) into a lookup map.
 * Returns a map keyed by normalized charity name → { ein, type }.
 */
export function parseEinLookupCsv(
  fileContent: string
): { entries: EinLookupEntry[]; errors: string[] } {
  const errors: string[] = []

  const result = Papa.parse<Record<string, string>>(fileContent, {
    header: true,
    skipEmptyLines: true,
  })

  if (result.errors.length > 0) {
    errors.push(
      ...result.errors.map((e) => `EIN lookup row ${e.row ?? '?'}: ${e.message}`)
    )
  }

  const entries: EinLookupEntry[] = []

  for (const record of result.data) {
    const name = record['Charity Name']?.trim()
    if (!name) continue

    const ein = record['EIN']?.trim() || null
    const type = record['Type']?.trim() || null

    entries.push({ name, ein, type })
  }

  return { entries, errors }
}

function normalizeForLookup(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildEinLookupMap(
  entries: EinLookupEntry[]
): Map<string, EinLookupEntry> {
  const map = new Map<string, EinLookupEntry>()
  for (const entry of entries) {
    map.set(normalizeForLookup(entry.name), entry)
  }
  return map
}

function lookupEin(
  charityName: string,
  lookupMap: Map<string, EinLookupEntry>
): EinLookupEntry | null {
  const normalized = normalizeForLookup(charityName)

  // Exact normalized match
  const exact = lookupMap.get(normalized)
  if (exact) return exact

  // Try matching with common variations
  // e.g., "Partners In Health A Nonprofit Corporation" vs "Partners In Health"
  for (const [key, entry] of lookupMap) {
    if (normalized.startsWith(key) || key.startsWith(normalized)) {
      return entry
    }
  }

  return null
}

function parseAmount(raw: string): number {
  return parseFloat(raw.replace(/[$,]/g, '')) || 0
}

function parseDate(raw: string): string {
  // Parse MM/DD/YYYY → ISO date string
  const parts = raw.trim().split('/')
  if (parts.length !== 3) return raw
  const [month, day, year] = parts
  const m = month.padStart(2, '0')
  const d = day.padStart(2, '0')
  return `${year}-${m}-${d}`
}

export function parseSchwabCsv(
  fileContent: string,
  einLookupEntries: EinLookupEntry[]
): { rows: CsvRow[]; errors: string[]; unmatchedCharities: string[] } {
  const errors: string[] = []
  const unmatchedCharities: string[] = []

  const result = Papa.parse<Record<string, string>>(fileContent, {
    header: true,
    skipEmptyLines: true,
  })

  if (result.errors.length > 0) {
    errors.push(
      ...result.errors.map((e) => `Row ${e.row ?? '?'}: ${e.message}`)
    )
  }

  // Validate headers
  const headers = result.meta.fields || []
  for (const required of SCHWAB_REQUIRED_HEADERS) {
    if (!headers.includes(required)) {
      errors.push(`Missing required column: "${required}"`)
    }
  }

  if (errors.length > 0 && !headers.includes('Charity Name')) {
    return { rows: [], errors, unmatchedCharities }
  }

  const lookupMap = buildEinLookupMap(einLookupEntries)
  const rows: CsvRow[] = []
  const seenUnmatched = new Set<string>()

  for (const record of result.data) {
    // Skip canceled grants
    const status = record['Status']?.trim()
    if (status && status.toLowerCase() === 'canceled') {
      continue
    }

    const charityName = record['Charity Name']?.trim()
    if (!charityName) continue

    const amount = parseAmount(record['Amount'] || '0')
    if (amount <= 0) {
      errors.push(`Skipped "${charityName}": invalid amount`)
      continue
    }

    // Look up EIN from the lookup CSV
    const einEntry = lookupEin(charityName, lookupMap)
    const ein = einEntry?.ein || null

    if (!ein && !seenUnmatched.has(charityName)) {
      seenUnmatched.add(charityName)
      unmatchedCharities.push(charityName)
    }

    rows.push({
      orgName: charityName,
      ein,
      amount,
      datePaid: parseDate(record['Requested Date'] || ''),
      purpose: null,
      address: null,
      city: null,
      state: null,
      postalCode: null,
    })
  }

  return { rows, errors, unmatchedCharities }
}
