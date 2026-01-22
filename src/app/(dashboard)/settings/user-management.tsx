'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Plus, Mail, Trash2, UserCog } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import type { User, Invitation, UserRole } from '@/types/database'

interface UserManagementProps {
  users: User[]
  invitations: Invitation[]
  foundationId: string
  currentUserId: string
}

const roleLabels: Record<UserRole, string> = {
  primary_advisor: 'Primary Advisor',
  advisor: 'Advisor',
  contributor: 'Contributor',
  observer: 'Observer',
}

const roleColors: Record<UserRole, string> = {
  primary_advisor: 'bg-purple-100 text-purple-800',
  advisor: 'bg-blue-100 text-blue-800',
  contributor: 'bg-green-100 text-green-800',
  observer: 'bg-gray-100 text-gray-800',
}

export function UserManagement({
  users,
  invitations,
  foundationId,
  currentUserId,
}: UserManagementProps) {
  const router = useRouter()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<UserRole>('observer')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    // Check if email already exists
    if (users.some(u => u.email === inviteEmail)) {
      setError('This email is already a member')
      setLoading(false)
      return
    }

    if (invitations.some(i => i.email === inviteEmail)) {
      setError('An invitation has already been sent to this email')
      setLoading(false)
      return
    }

    const supabase = createClient()

    // Get current user id for invited_by
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Not authenticated')
      setLoading(false)
      return
    }

    const { data: profile } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .single()

    if (!profile) {
      setError('Profile not found')
      setLoading(false)
      return
    }

    const { data: invitation, error: inviteError } = await supabase
      .from('invitations')
      .insert({
        foundation_id: foundationId,
        email: inviteEmail,
        role: inviteRole,
        invited_by: profile.id,
      })
      .select()
      .single()

    if (inviteError) {
      setError(inviteError.message)
      setLoading(false)
      return
    }

    // In a real app, you would send an email here
    // For now, we'll just show the invite link
    const inviteUrl = `${window.location.origin}/invite?token=${invitation.token}`

    toast.success(
      <div>
        <p>Invitation created!</p>
        <p className="text-xs mt-1">Share this link: {inviteUrl}</p>
      </div>,
      { duration: 10000 }
    )

    setInviteEmail('')
    setInviteRole('observer')
    setInviteOpen(false)
    setLoading(false)
    router.refresh()
  }

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    const supabase = createClient()

    const { error } = await supabase
      .from('users')
      .update({ role: newRole })
      .eq('id', userId)

    if (error) {
      toast.error('Failed to update role')
      return
    }

    toast.success('Role updated')
    router.refresh()
  }

  const handleCancelInvite = async (invitationId: string) => {
    const supabase = createClient()

    const { error } = await supabase
      .from('invitations')
      .delete()
      .eq('id', invitationId)

    if (error) {
      toast.error('Failed to cancel invitation')
      return
    }

    toast.success('Invitation cancelled')
    router.refresh()
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Current users */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>{users.length} members</CardDescription>
          </div>
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Invite Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleInvite}>
                <DialogHeader>
                  <DialogTitle>Invite Team Member</DialogTitle>
                  <DialogDescription>
                    Send an invitation to join your foundation
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="email@example.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select
                      value={inviteRole}
                      onValueChange={(v) => setInviteRole(v as UserRole)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="advisor">Advisor</SelectItem>
                        <SelectItem value="contributor">Contributor</SelectItem>
                        <SelectItem value="observer">Observer</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {inviteRole === 'advisor' && 'Full access to grants and organizations'}
                      {inviteRole === 'contributor' && 'Can suggest organizations and discuss'}
                      {inviteRole === 'observer' && 'Read-only access, can comment'}
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Sending...' : 'Send Invitation'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 rounded-lg border"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {user.id === currentUserId ? (
                    <Badge className={roleColors[user.role]}>
                      {roleLabels[user.role]} (You)
                    </Badge>
                  ) : user.role === 'primary_advisor' ? (
                    <Badge className={roleColors[user.role]}>
                      {roleLabels[user.role]}
                    </Badge>
                  ) : (
                    <Select
                      value={user.role}
                      onValueChange={(v) => handleRoleChange(user.id, v as UserRole)}
                    >
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="advisor">Advisor</SelectItem>
                        <SelectItem value="contributor">Contributor</SelectItem>
                        <SelectItem value="observer">Observer</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pending invitations */}
      {invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Invitations</CardTitle>
            <CardDescription>{invitations.length} pending</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-yellow-50 border-yellow-200"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-yellow-200 flex items-center justify-center">
                      <Mail className="h-5 w-5 text-yellow-700" />
                    </div>
                    <div>
                      <p className="font-medium">{invitation.email}</p>
                      <p className="text-sm text-muted-foreground">
                        Invited as {roleLabels[invitation.role]} ·
                        Expires {format(new Date(invitation.expires_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => handleCancelInvite(invitation.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
