'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Upload,
  ArrowLeft,
  Check,
  AlertTriangle,
  FileUp,
  ArrowRight,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { parseMorganStanleyCsv } from '@/lib/csv-import/parse-csv'
import { parseSchwabCsv } from '@/lib/csv-import/parse-schwab-csv'
import { buildImportRows } from '@/lib/csv-import/matching'
import type { ImportRow } from '@/lib/csv-import/types'

type Phase = 'upload' | 'review' | 'commit'
type CsvFormat = 'morgan_stanley' | 'schwab'

interface EinLookupEntry {
  name: string
  ein: string | null
  type: string | null
}

interface ImportClientProps {
  orgs: { id: string; name: string; ein: string | null }[]
  approvedGrants: {
    id: string
    organization_id: string
    amount: number
    status: string
  }[]
  userId: string
  foundationId: string
  einLookupEntries: EinLookupEntry[]
}

export function ImportClient({
  orgs,
  approvedGrants,
  userId,
  foundationId,
  einLookupEntries,
}: ImportClientProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [phase, setPhase] = useState<Phase>('upload')
  const [csvFormat, setCsvFormat] = useState<CsvFormat>('morgan_stanley')
  const [rows, setRows] = useState<ImportRow[]>([])
  const [parseErrors, setParseErrors] = useState<string[]>([])
  const [unmatchedCharities, setUnmatchedCharities] = useState<string[]>([])
  const [commitProgress, setCommitProgress] = useState(0)
  const [commitTotal, setCommitTotal] = useState(0)
  const [committing, setCommitting] = useState(false)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string

      let csvRows
      let errors: string[]

      if (csvFormat === 'schwab') {
        const result = parseSchwabCsv(content, einLookupEntries)
        csvRows = result.rows
        errors = result.errors
        setUnmatchedCharities(result.unmatchedCharities)
      } else {
        const result = parseMorganStanleyCsv(content)
        csvRows = result.rows
        errors = result.errors
        setUnmatchedCharities([])
      }

      if (csvRows.length === 0) {
        setParseErrors(
          errors.length > 0 ? errors : ['No valid rows found in CSV']
        )
        return
      }

      setParseErrors(errors)
      const importRows = buildImportRows(csvRows, orgs, approvedGrants)
      setRows(importRows)
      setPhase('review')
    }
    reader.readAsText(file)
  }

  const toggleRow = (index: number) => {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, included: !r.included } : r))
    )
  }

  const toggleAll = (included: boolean) => {
    setRows((prev) => prev.map((r) => ({ ...r, included })))
  }

  const includedRows = rows.filter((r) => r.included)
  const transitionCount = includedRows.filter(
    (r) => r.grantMatch.type === 'transition'
  ).length
  const newGrantCount = includedRows.filter(
    (r) => r.grantMatch.type === 'new'
  ).length
  const newOrgCount = includedRows.filter(
    (r) => r.orgMatch.type === 'new'
  ).length
  const lowConfidenceCount = rows.filter(
    (r) => r.orgMatch.confidence === 'low'
  ).length

  const handleCommit = async () => {
    const toProcess = rows.filter((r) => r.included)
    if (toProcess.length === 0) return

    setPhase('commit')
    setCommitting(true)
    setCommitTotal(toProcess.length)
    setCommitProgress(0)

    const supabase = createClient()
    let transitioned = 0
    let created = 0
    let orgErrors = 0

    // Build a map for newly created orgs so we can reference them
    const newOrgIdMap = new Map<number, string>()

    for (let i = 0; i < toProcess.length; i++) {
      const row = toProcess[i]
      const rowIndex = rows.indexOf(row)

      try {
        let orgId: string

        if (row.orgMatch.existingOrg) {
          orgId = row.orgMatch.existingOrg.id

          // Update org name if changed and high confidence
          if (
            row.orgMatch.nameChanged &&
            row.orgMatch.confidence === 'high'
          ) {
            await supabase
              .from('organizations')
              .update({ name: row.csv.orgName })
              .eq('id', orgId)
          }
        } else {
          // Check if we already created this org in a previous row (same EIN or name)
          const existingNewOrgIndex = toProcess.findIndex(
            (r, j) =>
              j < i &&
              r.orgMatch.type === 'new' &&
              r.csv.orgName === row.csv.orgName
          )

          if (existingNewOrgIndex >= 0 && newOrgIdMap.has(existingNewOrgIndex)) {
            orgId = newOrgIdMap.get(existingNewOrgIndex)!
          } else {
            // Build address string from parts
            const addressParts = [
              row.csv.address,
              row.csv.city,
              row.csv.state,
              row.csv.postalCode,
            ].filter(Boolean)
            const fullAddress =
              addressParts.length > 0 ? addressParts.join(', ') : null

            const { data: newOrg, error: orgError } = await supabase
              .from('organizations')
              .insert({
                foundation_id: foundationId,
                name: row.csv.orgName,
                ein: row.csv.ein,
                address: fullAddress,
                created_by: userId,
              })
              .select('id')
              .single()

            if (orgError || !newOrg) {
              orgErrors++
              setCommitProgress(i + 1)
              continue
            }

            orgId = newOrg.id
            newOrgIdMap.set(i, orgId)

            // Log org creation
            await supabase.from('activity_log').insert({
              foundation_id: foundationId,
              user_id: userId,
              action: 'organization_created',
              entity_type: 'organization',
              entity_id: orgId,
              details: { name: row.csv.orgName, source: 'csv_import' },
            })
          }
        }

        if (row.grantMatch.type === 'transition' && row.grantMatch.existingGrant) {
          // Transition existing grant to paid
          const { error } = await supabase
            .from('grants')
            .update({ status: 'paid', updated_at: new Date().toISOString() })
            .eq('id', row.grantMatch.existingGrant.id)

          if (!error) {
            transitioned++

            await supabase.from('activity_log').insert({
              foundation_id: foundationId,
              user_id: userId,
              action: 'grant_status_changed',
              entity_type: 'grant',
              entity_id: row.grantMatch.existingGrant.id,
              details: {
                from: 'approved',
                to: 'paid',
                source: 'csv_import',
              },
            })
          }
        } else {
          // Create new grant as paid
          const { data: newGrant, error } = await supabase
            .from('grants')
            .insert({
              foundation_id: foundationId,
              organization_id: orgId,
              status: 'paid',
              amount: row.csv.amount,
              purpose: row.csv.purpose,
              recurrence_type: 'one_time',
              proposed_by: userId,
              start_date: row.csv.datePaid || null,
            })
            .select('id')
            .single()

          if (!error && newGrant) {
            created++

            await supabase.from('activity_log').insert({
              foundation_id: foundationId,
              user_id: userId,
              action: 'grant_created',
              entity_type: 'grant',
              entity_id: newGrant.id,
              details: {
                amount: row.csv.amount,
                organization: row.csv.orgName,
                source: 'csv_import',
              },
            })
          }
        }
      } catch {
        // Continue processing remaining rows
      }

      setCommitProgress(i + 1)
    }

    setCommitting(false)

    const parts: string[] = []
    if (transitioned > 0) parts.push(`${transitioned} transitioned to Paid`)
    if (created > 0) parts.push(`${created} created`)
    if (orgErrors > 0) parts.push(`${orgErrors} failed`)

    toast.success(
      `Imported ${transitioned + created} grants: ${parts.join(', ')}`
    )

    router.push('/grants')
    router.refresh()
  }

  // --- Phase: Upload ---
  if (phase === 'upload') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/grants">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Import DAF History
            </h1>
            <p className="text-gray-500 mt-1">
              Upload a CSV export to import grant history
            </p>
          </div>
        </div>

        {parseErrors.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc pl-4 space-y-1">
                {parseErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Format selector */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">DAF Provider</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Button
                variant={csvFormat === 'schwab' ? 'default' : 'outline'}
                onClick={() => setCsvFormat('schwab')}
              >
                Schwab Charitable
              </Button>
              <Button
                variant={csvFormat === 'morgan_stanley' ? 'default' : 'outline'}
                onClick={() => setCsvFormat('morgan_stanley')}
              >
                Morgan Stanley
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-12">
            <div className="relative">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center text-center">
                <div className="p-4 bg-gray-100 rounded-full mb-4">
                  <Upload className="h-8 w-8 text-gray-500" />
                </div>
                <p className="text-lg font-medium">
                  Click to upload or drag and drop
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {csvFormat === 'schwab'
                    ? 'Schwab Charitable Grants History CSV'
                    : 'Morgan Stanley DAF History CSV'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // --- Phase: Review ---
  if (phase === 'review') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setPhase('upload')
              setRows([])
              setParseErrors([])
              setUnmatchedCharities([])
              if (fileInputRef.current) fileInputRef.current.value = ''
            }}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Review Import
            </h1>
            <p className="text-gray-500 mt-1">
              {rows.length} rows parsed from CSV
            </p>
          </div>
        </div>

        {parseErrors.length > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {parseErrors.length} warning(s) during parsing. Check rows below.
            </AlertDescription>
          </Alert>
        )}

        {unmatchedCharities.length > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-medium mb-1">
                {unmatchedCharities.length} charities had no EIN match in the
                lookup file:
              </p>
              <ul className="list-disc pl-4 space-y-0.5 text-sm">
                {unmatchedCharities.map((name, i) => (
                  <li key={i}>{name}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Summary cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{transitionCount}</div>
              <p className="text-sm text-muted-foreground">
                Transition to Paid
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{newGrantCount}</div>
              <p className="text-sm text-muted-foreground">New Grants</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{newOrgCount}</div>
              <p className="text-sm text-muted-foreground">
                New Organizations
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-amber-600">
                {lowConfidenceCount}
              </div>
              <p className="text-sm text-muted-foreground">Need Review</p>
            </CardContent>
          </Card>
        </div>

        {/* Review table */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Import Rows</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleAll(true)}
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleAll(false)}
                >
                  Deselect All
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="max-h-[500px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Include</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>EIN</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Org Match</TableHead>
                    <TableHead>Grant Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, i) => (
                    <TableRow
                      key={i}
                      className={!row.included ? 'opacity-50' : undefined}
                    >
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={row.included}
                          onChange={() => toggleRow(i)}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">
                          {row.csv.orgName}
                        </div>
                        {row.orgMatch.nameChanged &&
                          row.orgMatch.existingOrg && (
                            <div className="text-xs text-muted-foreground mt-0.5">
                              DB: {row.orgMatch.existingOrg.name}{' '}
                              <ArrowRight className="inline h-3 w-3" />{' '}
                              {row.csv.orgName}
                            </div>
                          )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {row.csv.ein || '—'}
                      </TableCell>
                      <TableCell className="text-right font-medium text-sm">
                        ${row.csv.amount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {row.csv.datePaid}
                      </TableCell>
                      <TableCell>
                        <OrgMatchBadge match={row.orgMatch} />
                      </TableCell>
                      <TableCell>
                        <GrantActionBadge match={row.grantMatch} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {includedRows.length} of {rows.length} rows selected
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setPhase('upload')
                setRows([])
                setParseErrors([])
                if (fileInputRef.current) fileInputRef.current.value = ''
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCommit}
              disabled={includedRows.length === 0}
            >
              <FileUp className="h-4 w-4 mr-2" />
              Confirm Import ({includedRows.length})
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // --- Phase: Commit ---
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Importing...</h1>
        <p className="text-gray-500 mt-1">
          Processing {commitTotal} rows
        </p>
      </div>

      <Card>
        <CardContent className="py-8">
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span>
                {committing ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing row {commitProgress} of {commitTotal}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    Complete
                  </span>
                )}
              </span>
              <span className="text-muted-foreground">
                {commitTotal > 0
                  ? Math.round((commitProgress / commitTotal) * 100)
                  : 0}
                %
              </span>
            </div>
            <Progress
              value={
                commitTotal > 0
                  ? (commitProgress / commitTotal) * 100
                  : 0
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function OrgMatchBadge({ match }: { match: ImportRow['orgMatch'] }) {
  if (match.type === 'exact_ein') {
    return (
      <Badge className="bg-green-100 text-green-800 border-green-200">
        EIN Match
      </Badge>
    )
  }
  if (match.type === 'fuzzy_name') {
    return (
      <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
        Name Match
      </Badge>
    )
  }
  return (
    <Badge className="bg-red-100 text-red-800 border-red-200">
      New Org
    </Badge>
  )
}

function GrantActionBadge({ match }: { match: ImportRow['grantMatch'] }) {
  if (match.type === 'transition') {
    return (
      <Badge variant="outline" className="text-blue-700 border-blue-200">
        Transition to Paid
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="text-gray-600">
      Create as Paid
    </Badge>
  )
}
