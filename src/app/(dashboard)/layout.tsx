import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { Toaster } from '@/components/ui/sonner'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user profile with foundation
  const { data: profile } = await supabase
    .from('users')
    .select('*, foundation:foundations(*)')
    .eq('auth_id', user.id)
    .single()

  if (!profile) {
    // User exists in auth but no profile - redirect to setup
    redirect('/login?error=no_profile')
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        foundationName={profile.foundation?.name}
        userName={profile.name}
      />
      <main className="flex-1 overflow-auto">
        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>
      <Toaster />
    </div>
  )
}
