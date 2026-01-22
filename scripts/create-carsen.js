const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function setup() {
  // Check foundations
  const { data: foundations, error: fErr } = await supabase.from('foundations').select('*');
  console.log('Foundations:', foundations);
  if (fErr) console.log('Foundation error:', fErr.message);

  // Check users
  const { data: users, error: uErr } = await supabase.from('users').select('*');
  console.log('Users:', users);
  if (uErr) console.log('Users error:', uErr.message);

  let foundationId;

  // If no foundation, create one
  if (!foundations || foundations.length === 0) {
    console.log('\nCreating foundation...');
    const { data: newFoundation, error: createErr } = await supabase.from('foundations').insert({
      name: 'Ralston Family Foundation',
      mission: 'Supporting charitable causes'
    }).select().single();

    if (createErr) {
      console.log('Error creating foundation:', createErr.message);
      return;
    }
    console.log('Created foundation:', newFoundation);
    foundationId = newFoundation.id;
  } else {
    foundationId = foundations[0].id;
  }

  // Create auth user
  console.log('\nCreating auth user...');
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: 'Carsen1023@gmail.com',
    password: 'Carsenpblake',
    email_confirm: true
  });

  if (authError) {
    console.log('Auth error:', authError.message);
    return;
  }
  console.log('Created auth user:', authUser.user.id, authUser.user.email);

  // Create profile in users table
  console.log('\nCreating user profile...');
  const { data: profile, error: profileError } = await supabase.from('users').insert({
    auth_id: authUser.user.id,
    email: 'Carsen1023@gmail.com',
    name: 'Carsen',
    role: 'advisor',
    foundation_id: foundationId
  }).select().single();

  if (profileError) {
    console.log('Profile error:', profileError.message);
  } else {
    console.log('Created profile:', profile);
  }

  console.log('\n✅ Done! Carsen can now log in with:');
  console.log('Email: Carsen1023@gmail.com');
  console.log('Password: Carsenpblake');
}

setup();
