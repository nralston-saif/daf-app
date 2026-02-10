'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { format } from 'date-fns'
import { ArrowUpDown, ArrowUp, ArrowDown, Search } from 'lucide-react'
import type { Grant, Organization, User } from '@/types/database'

type GrantWithRelations = Grant & {
  organization: Pick<Organization, 'id' | 'name' | 'tags'>
  proposed_by_user: Pick<User, 'name'>
}

interface GrantsTableProps {
  grants: GrantWithRelations[]
}

type SortField = 'organization' | 'amount' | 'status' | 'date'
type SortDirection = 'asc' | 'desc'

const statusColors: Record<string, string> = {
  review: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  paid: 'bg-emerald-100 text-emerald-800',
  declined: 'bg-red-100 text-red-800',
  closed: 'bg-gray-100 text-gray-800',
}

const statusOrder: Record<string, number> = {
  review: 0,
  approved: 1,
  paid: 2,
  declined: 3,
  closed: 4,
}

export function GrantsTable({ grants }: GrantsTableProps) {
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [searchQuery, setSearchQuery] = useState('')

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />
    return sortDirection === 'asc'
      ? <ArrowUp className="h-3 w-3 ml-1" />
      : <ArrowDown className="h-3 w-3 ml-1" />
  }

  const filteredAndSorted = useMemo(() => {
    let result = [...grants]

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(g =>
        g.organization?.name?.toLowerCase().includes(q) ||
        g.purpose?.toLowerCase().includes(q)
      )
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'organization':
          cmp = (a.organization?.name || '').localeCompare(b.organization?.name || '')
          break
        case 'amount': {
          // Nulls sort last regardless of direction
          if (a.amount == null && b.amount == null) cmp = 0
          else if (a.amount == null) return 1
          else if (b.amount == null) return -1
          else cmp = a.amount - b.amount
          break
        }
        case 'status':
          cmp = (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99)
          break
        case 'date': {
          const aDate = a.start_date || a.created_at
          const bDate = b.start_date || b.created_at
          cmp = new Date(aDate).getTime() - new Date(bDate).getTime()
          break
        }
      }
      return sortDirection === 'asc' ? cmp : -cmp
    })

    return result
  }, [grants, sortField, sortDirection, searchQuery])

  return (
    <div className="space-y-4">
      {/* Search input */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search organizations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <button
                  onClick={() => handleSort('organization')}
                  className="flex items-center font-medium hover:text-foreground transition-colors"
                >
                  Organization
                  <SortIcon field="organization" />
                </button>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => handleSort('amount')}
                  className="flex items-center font-medium hover:text-foreground transition-colors"
                >
                  Amount
                  <SortIcon field="amount" />
                </button>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => handleSort('status')}
                  className="flex items-center font-medium hover:text-foreground transition-colors"
                >
                  Status
                  <SortIcon field="status" />
                </button>
              </TableHead>
              <TableHead>Focus Areas</TableHead>
              <TableHead>Proposed By</TableHead>
              <TableHead>
                <button
                  onClick={() => handleSort('date')}
                  className="flex items-center font-medium hover:text-foreground transition-colors"
                >
                  Date
                  <SortIcon field="date" />
                </button>
              </TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  {searchQuery ? 'No grants match your search' : 'No grants'}
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSorted.map((grant) => (
                <TableRow key={grant.id}>
                  <TableCell>
                    <Link
                      href={`/organizations/${grant.organization?.id}`}
                      className="font-medium hover:underline"
                    >
                      {grant.organization?.name || 'Unknown'}
                    </Link>
                  </TableCell>
                  <TableCell className="font-semibold">
                    {grant.amount != null ? `$${grant.amount.toLocaleString()}` : 'TBD'}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[grant.status] || 'bg-gray-100'}>
                      {grant.status.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {grant.focus_areas?.slice(0, 2).map((area) => (
                        <Badge key={area} variant="outline" className="text-xs">
                          {area}
                        </Badge>
                      ))}
                      {grant.focus_areas && grant.focus_areas.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{grant.focus_areas.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {grant.proposed_by_user?.name || 'Unknown'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(grant.start_date || grant.created_at), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell>
                    <Link href={`/grants/${grant.id}`}>
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
