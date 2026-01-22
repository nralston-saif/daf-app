const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  // Check saif_people table
  const { data: people, error } = await supabase.from('saif_people').select('*');

  if (error) {
    console.log('Error:', error.message);
    return;
  }

  console.log('Total people:', people.length);
  console.log('\n--- All people ---');
  people.forEach(p => {
    console.log('ID:', p.id, '| Name:', p.name, '| Email:', p.email);
  });

  // Find entries with multiple emails
  const multiEmail = people.filter(p => {
    if (!p.email) return false;
    return p.email.includes(',') || p.email.includes(';') || p.email.includes('\n') || (p.email.match(/@/g) || []).length > 1;
  });

  if (multiEmail.length > 0) {
    console.log('\n--- People with multiple emails in one field ---');
    multiEmail.forEach(p => {
      console.log('ID:', p.id);
      console.log('Name:', p.name);
      console.log('Email:', p.email);
      console.log('---');
    });
    console.log('\nTotal needing split:', multiEmail.length);
  } else {
    console.log('\nNo multi-email entries found in saif_people');
  }
}
check();
