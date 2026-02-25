'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { subMonths } from 'date-fns'

interface GrantsPipelineProps {
  grantsByStatus: Record<string, any[]>
}

const statusConfig: Record<string, { label: string; color: string; headerBorder: string; bgColor: string }> = {
  review: { label: 'Review', color: 'text-yellow-700', headerBorder: 'border-yellow-300', bgColor: 'bg-yellow-50/60' },
  approved: { label: 'Approved', color: 'text-green-700', headerBorder: 'border-green-300', bgColor: 'bg-green-50/60' },
  paid: { label: 'Paid', color: 'text-emerald-700', headerBorder: 'border-emerald-300', bgColor: 'bg-emerald-50/60' },
  declined: { label: 'Declined', color: 'text-red-700', headerBorder: 'border-red-300', bgColor: 'bg-red-50/60' },
  closed: { label: 'Closed', color: 'text-gray-600', headerBorder: 'border-gray-300', bgColor: 'bg-gray-50/60' },
}

const pipelineStages = ['review', 'approved', 'paid']

type PaidFilter = 'recent' | 'all'

export function GrantsPipeline({ grantsByStatus }: GrantsPipelineProps) {
  const [paidFilter, setPaidFilter] = useState<PaidFilter>('recent')

  const twoMonthsAgo = useMemo(() => subMonths(new Date(), 2), [])

  const getFilteredGrants = (status: string, allGrants: any[]) => {
    if (status !== 'paid' || paidFilter === 'all') return allGrants
    return allGrants.filter((g: any) => {
      const d = new Date(g.start_date || g.created_at)
      return d >= twoMonthsAgo
    })
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      {pipelineStages.map((status) => {
        const config = statusConfig[status]
        const allGrants = grantsByStatus[status] || []
        const grants = getFilteredGrants(status, allGrants)
        const totalAmount = grants.reduce((sum: number, g: any) => sum + (g.amount || 0), 0)

        return (
          <div
            key={status}
            className={`rounded-lg border ${config.bgColor} flex flex-col`}
          >
            {/* Column header */}
            <div className={`p-3 border-b ${config.headerBorder}`}>
              <div className="flex items-center justify-between">
                <h3 className={`font-semibold text-sm ${config.color}`}>
                  {config.label}
                </h3>
                <div className="flex items-center gap-1.5">
                  {status === 'paid' && (
                    <Select value={paidFilter} onValueChange={(v) => setPaidFilter(v as PaidFilter)}>
                      <SelectTrigger className="h-6 text-xs w-[110px] border-none bg-white/60">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="recent">Last 2 months</SelectItem>
                        <SelectItem value="all">All time</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  <Badge variant="secondary" className="font-normal text-xs">
                    {grants.length}
                  </Badge>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                ${totalAmount.toLocaleString()}
              </p>
            </div>

            {/* Scrollable grant list */}
            <div className="p-2 space-y-1.5 overflow-y-auto max-h-[calc(100vh-360px)] min-h-[120px]">
              {grants.map((grant: any) => (
                <GrantRow key={grant.id} grant={grant} />
              ))}
              {grants.length === 0 && (
                <div className="flex items-center justify-center h-20 text-sm text-muted-foreground">
                  No grants
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function GrantRow({ grant }: { grant: any }) {
  return (
    <Link href={`/grants/${grant.id}`}>
      <div className="flex items-center justify-between gap-2 p-2 rounded-md bg-white border border-gray-100 hover:shadow-sm hover:border-gray-200 transition-all cursor-pointer">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm truncate">
            {grant.organization?.name || 'Unknown'}
          </p>
          {grant.purpose && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {grant.purpose}
            </p>
          )}
        </div>
        <p className="text-sm font-semibold tabular-nums whitespace-nowrap">
          {grant.amount != null ? `$${grant.amount.toLocaleString()}` : 'TBD'}
        </p>
      </div>
    </Link>
  )
}
