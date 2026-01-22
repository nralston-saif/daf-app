import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { OrganizationForm } from '../organization-form'

export default async function NewOrganizationPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('id, foundation_id, role')
    .eq('auth_id', user.id)
    .single()

  if (!profile) redirect('/login')

  // Check permissions
  if (!['primary_advisor', 'advisor', 'contributor'].includes(profile.role)) {
    redirect('/organizations')
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Add Organization</h1>
        <p className="text-gray-500 mt-1">Add a new organization to your foundation&apos;s portfolio</p>
      </div>

      <OrganizationForm
        userId={profile.id}
        foundationId={profile.foundation_id}
      />
    </div>
  )
}
