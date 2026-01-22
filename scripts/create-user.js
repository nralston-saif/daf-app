const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createUser() {
  const email = 'andrea@rocketmail.com'
  const password = 'ralston'

  // First, get or create the foundation
  let { data: foundation, error: foundationError } = await supabase
    .from('foundations')
    .select('id')
    .eq('name', 'Ralston DAF')
    .single()

  if (!foundation) {
    // Create the foundation
    const { data: newFoundation, error: createFoundationError } = await supabase
      .from('foundations')
      .insert({
        name: 'Ralston DAF',
        mission: 'Supporting charitable causes'
      })
      .select()
      .single()

    if (createFoundationError) {
      console.error('Error creating foundation:', createFoundationError)
      return
    }
    foundation = newFoundation
    console.log('Created foundation:', foundation.id)
  } else {
    console.log('Found existing foundation:', foundation.id)
  }

  // Try to create the auth user using admin API, or get existing one
  let authUserId
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true // Auto-confirm the email
  })

  if (authError) {
    if (authError.code === 'email_exists') {
      // User already exists, find them
      const { data: listData, error: listError } = await supabase.auth.admin.listUsers()
      if (listError) {
        console.error('Error listing users:', listError)
        return
      }
      const existingUser = listData.users.find(u => u.email === email)
      if (!existingUser) {
        console.error('Could not find existing user')
        return
      }
      authUserId = existingUser.id
      console.log('Found existing auth user:', authUserId)

      // Update their password
      const { error: updateError } = await supabase.auth.admin.updateUserById(authUserId, {
        password,
        email_confirm: true
      })
      if (updateError) {
        console.error('Error updating password:', updateError)
      } else {
        console.log('Updated password for user')
      }
    } else {
      console.error('Error creating auth user:', authError)
      return
    }
  } else {
    authUserId = authData.user.id
    console.log('Created auth user:', authUserId)
  }

  // Check if user profile already exists
  const { data: existingProfile } = await supabase
    .from('users')
    .select('*')
    .eq('auth_id', authUserId)
    .single()

  if (existingProfile) {
    console.log('User profile already exists:', existingProfile)
    console.log('\n✅ User ready!')
    console.log('Email:', email)
    console.log('Password:', password)
    return
  }

  // Create the user profile in users table
  const { data: userData, error: userError } = await supabase
    .from('users')
    .insert({
      auth_id: authUserId,
      foundation_id: foundation.id,
      email: email,
      name: 'Andrea Ralston',
      role: 'primary_advisor'
    })
    .select()
    .single()

  if (userError) {
    console.error('Error creating user profile:', userError)
    return
  }

  console.log('Created user profile:', userData)
  console.log('\n✅ User created successfully!')
  console.log('Email:', email)
  console.log('Password:', password)
}

createUser()
