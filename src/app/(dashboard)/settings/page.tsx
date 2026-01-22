import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FoundationSettings } from './foundation-settings'
import { UserManagement } from './user-management'
import { ProfileSettings } from './profile-settings'

export default async function SettingsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('*, foundation:foundations(*)')
    .eq('auth_id', user.id)
    .single()

  if (!profile) redirect('/login')

  // Get all users in foundation (for user management)
  const { data: foundationUsers } = await supabase
    .from('users')
    .select('*')
    .eq('foundation_id', profile.foundation_id)
    .order('name', { ascending: true })

  // Get pending invitations
  const { data: invitations } = await supabase
    .from('invitations')
    .select('*')
    .eq('foundation_id', profile.foundation_id)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  const isPrimaryAdvisor = profile.role === 'primary_advisor'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your foundation and account settings</p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          {isPrimaryAdvisor && <TabsTrigger value="foundation">Foundation</TabsTrigger>}
          {isPrimaryAdvisor && <TabsTrigger value="users">Users</TabsTrigger>}
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <ProfileSettings profile={profile} />
        </TabsContent>

        {isPrimaryAdvisor && (
          <TabsContent value="foundation" className="mt-6">
            <FoundationSettings foundation={profile.foundation} />
          </TabsContent>
        )}

        {isPrimaryAdvisor && (
          <TabsContent value="users" className="mt-6">
            <UserManagement
              users={foundationUsers || []}
              invitations={invitations || []}
              foundationId={profile.foundation_id}
              currentUserId={profile.id}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
