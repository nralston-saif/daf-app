import Papa from 'papaparse'
import type { CsvRow } from './types'

const REQUIRED_HEADERS = ['Grant Recipient', 'Tax ID', 'Amount', 'Date Paid']

function parseAmount(raw: string): number {
  return parseFloat(raw.replace(/[$,]/g, '')) || 0
}

function parseDate(raw: string): string {
  // Parse M/D/YYYY → ISO date string
  const parts = raw.trim().split('/')
  if (parts.length !== 3) return raw
  const [month, day, year] = parts
  const m = month.padStart(2, '0')
  const d = day.padStart(2, '0')
  return `${year}-${m}-${d}`
}

export function parseMorganStanleyCsv(
  fileContent: string
): { rows: CsvRow[]; errors: string[] } {
  const errors: string[] = []

  const result = Papa.parse<Record<string, string>>(fileContent, {
    header: true,
    skipEmptyLines: true,
  })

  if (result.errors.length > 0) {
    errors.push(
      ...result.errors.map(
        (e) => `Row ${e.row ?? '?'}: ${e.message}`
      )
    )
  }

  // Validate headers
  const headers = result.meta.fields || []
  for (const required of REQUIRED_HEADERS) {
    if (!headers.includes(required)) {
      errors.push(`Missing required column: "${required}"`)
    }
  }

  if (errors.length > 0 && !headers.includes('Grant Recipient')) {
    return { rows: [], errors }
  }

  const rows: CsvRow[] = []

  for (const record of result.data) {
    // Skip non-grant rows if a "Type" column exists
    if (record['Type'] && record['Type'].trim().toLowerCase() !== 'grant') {
      continue
    }

    const orgName = record['Grant Recipient']?.trim()
    if (!orgName) continue

    const amount = parseAmount(record['Amount'] || '0')
    if (amount <= 0) {
      errors.push(`Skipped "${orgName}": invalid amount`)
      continue
    }

    rows.push({
      orgName,
      ein: record['Tax ID']?.trim() || null,
      amount,
      datePaid: parseDate(record['Date Paid'] || ''),
      purpose: record['Purpose']?.trim() || null,
      address: record['Address 1']?.trim() || null,
      city: record['City']?.trim() || null,
      state: record['State']?.trim() || null,
      postalCode: record['Postal Code']?.trim() || null,
    })
  }

  return { rows, errors }
}
