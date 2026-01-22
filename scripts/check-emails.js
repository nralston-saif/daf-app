const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  // Check for people table with multiple emails
  const { data: people, error } = await supabase.from('saifcrm_people').select('id, name, email, company_id');

  if (error) {
    console.log('Error:', error.message);
    return;
  }

  // Find entries with multiple emails (containing comma, semicolon, or multiple @)
  const multiEmail = people.filter(p => {
    if (!p.email) return false;
    return p.email.includes(',') || p.email.includes(';') || (p.email.match(/@/g) || []).length > 1;
  });

  console.log('People with multiple emails in one field:\n');
  multiEmail.forEach(p => {
    console.log('ID:', p.id);
    console.log('Name:', p.name);
    console.log('Email:', p.email);
    console.log('Company ID:', p.company_id);
    console.log('---');
  });
  console.log('\nTotal:', multiEmail.length, 'records need splitting');
}
check();
