'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'

interface GrantsPipelineProps {
  grantsByStatus: Record<string, any[]>
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  idea: { label: 'Ideas', color: 'text-gray-600', bgColor: 'bg-gray-50' },
  research: { label: 'Research', color: 'text-blue-600', bgColor: 'bg-blue-50' },
  review: { label: 'Review', color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
  pending_vote: { label: 'Pending Vote', color: 'text-orange-600', bgColor: 'bg-orange-50' },
  approved: { label: 'Approved', color: 'text-green-600', bgColor: 'bg-green-50' },
  submitted: { label: 'Submitted', color: 'text-purple-600', bgColor: 'bg-purple-50' },
  paid: { label: 'Paid', color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
  declined: { label: 'Declined', color: 'text-red-600', bgColor: 'bg-red-50' },
  closed: { label: 'Closed', color: 'text-gray-600', bgColor: 'bg-gray-50' },
}

// Active pipeline stages (excluding terminal states)
const pipelineStages = ['idea', 'research', 'review', 'pending_vote', 'approved', 'submitted', 'paid']

export function GrantsPipeline({ grantsByStatus }: GrantsPipelineProps) {
  return (
    <ScrollArea className="w-full">
      <div className="flex gap-4 pb-4 min-w-max">
        {pipelineStages.map((status) => {
          const config = statusConfig[status]
          const grants = grantsByStatus[status] || []
          const totalAmount = grants.reduce((sum, g) => sum + (g.amount || 0), 0)

          return (
            <div
              key={status}
              className={`w-72 flex-shrink-0 rounded-lg ${config.bgColor}`}
            >
              <div className="p-3 border-b border-white/50">
                <div className="flex items-center justify-between">
                  <h3 className={`font-semibold ${config.color}`}>{config.label}</h3>
                  <Badge variant="secondary" className="font-normal">
                    {grants.length}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  ${totalAmount.toLocaleString()}
                </p>
              </div>
              <div className="p-2 space-y-2 min-h-[200px]">
                {grants.map((grant) => (
                  <GrantCard key={grant.id} grant={grant} />
                ))}
                {grants.length === 0 && (
                  <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
                    No grants
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  )
}

function GrantCard({ grant }: { grant: any }) {
  return (
    <Link href={`/grants/${grant.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-3">
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-medium text-sm line-clamp-1">
                {grant.organization?.name || 'Unknown Organization'}
              </h4>
            </div>
            <p className="text-lg font-semibold">
              ${grant.amount.toLocaleString()}
            </p>
            {grant.purpose && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {grant.purpose}
              </p>
            )}
            {grant.focus_areas && grant.focus_areas.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {grant.focus_areas.slice(0, 2).map((area: string) => (
                  <Badge key={area} variant="outline" className="text-xs">
                    {area}
                  </Badge>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              by {grant.proposed_by_user?.name || 'Unknown'}
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
