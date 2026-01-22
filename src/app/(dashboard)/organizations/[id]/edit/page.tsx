import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { OrganizationForm } from '../../organization-form'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function EditOrganizationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
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
  if (!['primary_advisor', 'advisor'].includes(profile.role)) {
    redirect(`/organizations/${id}`)
  }

  // Get organization
  const { data: organization, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', id)
    .eq('foundation_id', profile.foundation_id)
    .single()

  if (error || !organization) {
    notFound()
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/organizations/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Organization</h1>
          <p className="text-gray-500 mt-1">{organization.name}</p>
        </div>
      </div>

      <OrganizationForm
        organization={organization}
        userId={profile.id}
        foundationId={profile.foundation_id}
      />
    </div>
  )
}
