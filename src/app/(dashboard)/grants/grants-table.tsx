'use client'

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
import { format } from 'date-fns'
import type { Grant, Organization, User } from '@/types/database'

type GrantWithRelations = Grant & {
  organization: Pick<Organization, 'id' | 'name' | 'tags'>
  proposed_by_user: Pick<User, 'name'>
}

interface GrantsTableProps {
  grants: GrantWithRelations[]
}

const statusColors: Record<string, string> = {
  idea: 'bg-gray-100 text-gray-800',
  research: 'bg-blue-100 text-blue-800',
  review: 'bg-yellow-100 text-yellow-800',
  pending_vote: 'bg-orange-100 text-orange-800',
  approved: 'bg-green-100 text-green-800',
  submitted: 'bg-purple-100 text-purple-800',
  paid: 'bg-emerald-100 text-emerald-800',
  declined: 'bg-red-100 text-red-800',
  closed: 'bg-gray-100 text-gray-800',
}

export function GrantsTable({ grants }: GrantsTableProps) {
  return (
    <div className="rounded-lg border bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Organization</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Focus Areas</TableHead>
            <TableHead>Proposed By</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="w-[100px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {grants.map((grant) => (
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
                ${grant.amount.toLocaleString()}
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
                {format(new Date(grant.created_at), 'MMM d, yyyy')}
              </TableCell>
              <TableCell>
                <Link href={`/grants/${grant.id}`}>
                  <Button variant="ghost" size="sm">
                    View
                  </Button>
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
