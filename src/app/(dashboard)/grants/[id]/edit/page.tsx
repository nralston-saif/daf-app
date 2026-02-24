import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { GrantForm } from '../../grant-form'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function EditGrantPage({
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
    redirect(`/grants/${id}`)
  }

  // Get grant
  const { data: grant, error } = await supabase
    .from('grants')
    .select('*')
    .eq('id', id)
    .eq('foundation_id', profile.foundation_id)
    .single()

  if (error || !grant) {
    notFound()
  }

  // Get organizations for the dropdown
  const { data: organizations } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('foundation_id', profile.foundation_id)
    .order('name', { ascending: true })

  const orgName = organizations?.find(o => o.id === grant.organization_id)?.name

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/grants/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Grant</h1>
          {orgName && <p className="text-gray-500 mt-1">{orgName}</p>}
        </div>
      </div>

      <GrantForm
        grant={grant}
        organizations={organizations || []}
        userId={profile.id}
        foundationId={profile.foundation_id}
      />
    </div>
  )
}
