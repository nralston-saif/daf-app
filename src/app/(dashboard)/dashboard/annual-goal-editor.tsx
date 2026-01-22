'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Edit2 } from 'lucide-react'

interface AnnualGoalEditorProps {
  foundationId: string
  currentGoal: number
}

export function AnnualGoalEditor({ foundationId, currentGoal }: AnnualGoalEditorProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [goal, setGoal] = useState(currentGoal.toString())
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    setLoading(true)
    const supabase = createClient()

    const { error } = await supabase
      .from('foundations')
      .update({ annual_giving_goal: parseFloat(goal) || 0 })
      .eq('id', foundationId)

    if (error) {
      toast.error('Failed to update goal')
    } else {
      toast.success('Annual giving goal updated')
      setOpen(false)
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="link" size="sm" className="h-auto p-0 text-xs text-muted-foreground">
          <Edit2 className="h-3 w-3 mr-1" />
          Edit goal
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set Annual Giving Goal</DialogTitle>
          <DialogDescription>
            Set your target giving amount for the year
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              type="number"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="0"
              className="pl-7"
              min="0"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? 'Saving...' : 'Save Goal'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
