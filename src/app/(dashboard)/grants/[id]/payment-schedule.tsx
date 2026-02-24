'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { format } from 'date-fns'
import type { GrantPayment } from '@/types/database'

const formatCurrency = (value: number) => `$${value.toLocaleString()}`

type PaymentScheduleProps = {
  grantId: string
  payments: GrantPayment[]
}

export function PaymentSchedule({ grantId, payments }: PaymentScheduleProps) {
  const router = useRouter()
  const supabase = createClient()
  const [addOpen, setAddOpen] = useState(false)
  const [addAmount, setAddAmount] = useState('')
  const [addDate, setAddDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [amounts, setAmounts] = useState<Record<string, string>>({})

  useEffect(() => {
    setAmounts(
      payments.reduce<Record<string, string>>((acc, payment) => {
        acc[payment.id] = payment.amount.toString()
        return acc
      }, {})
    )
  }, [payments])

  const totals = useMemo(() => {
    const committed = payments.reduce((sum, p) => sum + (p.amount || 0), 0)
    const paid = payments
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + (p.amount || 0), 0)
    return {
      committed,
      paid,
      remaining: committed - paid,
    }
  }, [payments])

  const handleMarkPaid = async (paymentId: string) => {
    const { error } = await supabase
      .from('grant_payments')
      .update({ status: 'paid' })
      .eq('id', paymentId)

    if (error) {
      toast.error(error.message)
      return
    }

    // Check if this was the last scheduled payment
    const remainingScheduled = payments.filter(
      (p) => p.status === 'scheduled' && p.id !== paymentId
    )

    if (remainingScheduled.length === 0) {
      const { error: statusError } = await supabase
        .from('grants')
        .update({ status: 'paid' })
        .eq('id', grantId)

      if (statusError) {
        toast.error('Payment saved but failed to update grant status')
      } else {
        toast.success('All payments complete — grant marked as paid')
        router.refresh()
        return
      }
    }

    toast.success('Payment marked as paid')
    router.refresh()
  }

  const handleAmountBlur = async (paymentId: string) => {
    const payment = payments.find(p => p.id === paymentId)
    const nextValue = parseFloat(amounts[paymentId])

    if (!payment || Number.isNaN(nextValue) || nextValue <= 0) {
      setAmounts(prev => ({ ...prev, [paymentId]: payment?.amount.toString() || '' }))
      return
    }

    if (nextValue === payment.amount) return

    const { error } = await supabase
      .from('grant_payments')
      .update({ amount: nextValue })
      .eq('id', paymentId)

    if (error) {
      toast.error(error.message)
      setAmounts(prev => ({ ...prev, [paymentId]: payment.amount.toString() }))
      return
    }

    toast.success('Payment amount updated')
    router.refresh()
  }

  const handleAddPayment = async () => {
    const amountValue = parseFloat(addAmount)
    if (!addDate || Number.isNaN(amountValue) || amountValue <= 0) {
      toast.error('Enter a valid date and amount')
      return
    }

    setSaving(true)
    const { error } = await supabase.from('grant_payments').insert({
      grant_id: grantId,
      amount: amountValue,
      payment_date: addDate,
      status: 'scheduled',
    })

    setSaving(false)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('Payment added')
    setAddOpen(false)
    setAddAmount('')
    setAddDate('')
    router.refresh()
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Payment Schedule</CardTitle>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm">Add Payment</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Payment</DialogTitle>
              <DialogDescription>Schedule an additional payment.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Payment Date</label>
                <Input
                  type="date"
                  value={addDate}
                  onChange={(e) => setAddDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Amount</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={addAmount}
                  onChange={(e) => setAddAmount(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setAddOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddPayment} disabled={saving}>
                  {saving ? 'Saving...' : 'Add Payment'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Total Committed</p>
            <p className="text-lg font-semibold">{formatCurrency(totals.committed)}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Total Paid</p>
            <p className="text-lg font-semibold">{formatCurrency(totals.paid)}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Remaining</p>
            <p className="text-lg font-semibold">{formatCurrency(totals.remaining)}</p>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                  No payments scheduled yet.
                </TableCell>
              </TableRow>
            ) : (
              payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>
                    {format(new Date(payment.payment_date), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="w-[160px]">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">$</span>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={amounts[payment.id] ?? payment.amount.toString()}
                        onChange={(e) =>
                          setAmounts(prev => ({ ...prev, [payment.id]: e.target.value }))
                        }
                        onBlur={() => handleAmountBlur(payment.id)}
                        className="h-8"
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        payment.status === 'paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-gray-100 text-gray-800'
                      }
                    >
                      {payment.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {payment.status === 'scheduled' ? (
                      <Button size="sm" variant="outline" onClick={() => handleMarkPaid(payment.id)}>
                        Mark as Paid
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">Paid</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
