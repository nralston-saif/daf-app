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
import { ExternalLink, Star } from 'lucide-react'
import type { Organization } from '@/types/database'

interface OrganizationsTableProps {
  organizations: (Organization & { created_by_user?: { name: string } })[]
}

export function OrganizationsTable({ organizations }: OrganizationsTableProps) {
  const formatBudget = (budget: number | null) => {
    if (!budget) return '-'
    if (budget >= 1000000) return `$${(budget / 1000000).toFixed(1)}M`
    if (budget >= 1000) return `$${(budget / 1000).toFixed(0)}K`
    return `$${budget}`
  }

  return (
    <div className="rounded-lg border bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Organization</TableHead>
            <TableHead>Focus Areas</TableHead>
            <TableHead>Budget</TableHead>
            <TableHead>Rating</TableHead>
            <TableHead>Added By</TableHead>
            <TableHead className="w-[100px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {organizations.map((org) => (
            <TableRow key={org.id}>
              <TableCell>
                <Link href={`/organizations/${org.id}`} className="hover:underline">
                  <div>
                    <p className="font-medium">{org.name}</p>
                    {org.ein && (
                      <p className="text-sm text-muted-foreground">EIN: {org.ein}</p>
                    )}
                  </div>
                </Link>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {org.tags?.slice(0, 3).map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {org.tags && org.tags.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{org.tags.length - 3}
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>{formatBudget(org.annual_budget)}</TableCell>
              <TableCell>
                {org.overall_rating ? (
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span>{org.overall_rating.toFixed(1)}</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>
                <span className="text-sm text-muted-foreground">
                  {org.created_by_user?.name || '-'}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {org.website && (
                    <a
                      href={org.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                  <Link href={`/organizations/${org.id}`}>
                    <Button variant="ghost" size="sm">
                      View
                    </Button>
                  </Link>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
