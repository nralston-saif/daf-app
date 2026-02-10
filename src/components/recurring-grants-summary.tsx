import Link from 'next/link'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { GrantRecurrence, GrantPaymentStatus } from '@/types/database'

type RecurringGrantPayment = {
  amount: number
  status: GrantPaymentStatus
  payment_date: string
}

type RecurringGrant = {
  id: string
  amount: number
  recurrence_type: GrantRecurrence
  end_date: string | null
  organization: { name: string } | null
  grant_payments: RecurringGrantPayment[]
}

type RecurringGrantsSummaryProps = {
  grants: RecurringGrant[]
  totalCommitted: number
  totalPaid: number
  dueThisYear: number
  paidThisYear: number
  lastCommitmentEnd: string | null
}

const formatCurrency = (value: number) => `$${value.toLocaleString()}`

const recurrenceLabels: Record<GrantRecurrence, string> = {
  one_time: 'One-time',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  semi_annual: 'Semi-Annual',
  annual: 'Annual',
}

const getNextPaymentDate = (payments: RecurringGrantPayment[]) => {
  const upcoming = payments
    .filter(payment => payment.status === 'scheduled')
    .sort((a, b) => a.payment_date.localeCompare(b.payment_date))
  return upcoming.length > 0 ? upcoming[0].payment_date : null
}

export function RecurringGrantsSummary({
  grants,
  totalCommitted,
  totalPaid,
  dueThisYear,
  paidThisYear,
  lastCommitmentEnd,
}: RecurringGrantsSummaryProps) {
  if (grants.length === 0) return null

  const sortedGrants = [...grants].sort((a, b) => {
    const aNext = getNextPaymentDate(a.grant_payments)
    const bNext = getNextPaymentDate(b.grant_payments)
    if (!aNext && !bNext) return 0
    if (!aNext) return 1
    if (!bNext) return -1
    return aNext.localeCompare(bNext)
  })

  return (
    <Card>
      <CardHeader className="space-y-3">
        <CardTitle>Recurring Grants</CardTitle>
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Total Committed</p>
            <p className="text-lg font-semibold">{formatCurrency(totalCommitted)}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Total Paid</p>
            <p className="text-lg font-semibold">{formatCurrency(totalPaid)}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Due This Year</p>
            <p className="text-lg font-semibold">{formatCurrency(dueThisYear)}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Paid This Year</p>
            <p className="text-lg font-semibold">{formatCurrency(paidThisYear)}</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Last commitment ends:{' '}
          {lastCommitmentEnd ? format(new Date(lastCommitmentEnd), 'MMM d, yyyy') : 'N/A'}
        </p>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Organization</TableHead>
              <TableHead>Frequency</TableHead>
              <TableHead>Per Payment</TableHead>
              <TableHead>Total Committed</TableHead>
              <TableHead>Paid</TableHead>
              <TableHead>Next Payment</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedGrants.map((grant) => {
              const committed = grant.grant_payments.reduce(
                (sum, payment) => sum + (payment.amount || 0),
                0
              )
              const paid = grant.grant_payments
                .filter(payment => payment.status === 'paid')
                .reduce((sum, payment) => sum + (payment.amount || 0), 0)
              const nextPayment = getNextPaymentDate(grant.grant_payments)

              return (
                <TableRow key={grant.id}>
                  <TableCell>
                    <Link href={`/grants/${grant.id}`} className="font-medium hover:underline">
                      {grant.organization?.name || 'Unknown'}
                    </Link>
                  </TableCell>
                  <TableCell>{recurrenceLabels[grant.recurrence_type]}</TableCell>
                  <TableCell>{formatCurrency(grant.amount || 0)}</TableCell>
                  <TableCell>{formatCurrency(committed)}</TableCell>
                  <TableCell>{formatCurrency(paid)}</TableCell>
                  <TableCell>
                    {nextPayment ? format(new Date(nextPayment), 'MMM d, yyyy') : '—'}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
