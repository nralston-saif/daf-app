const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: people } = await supabase.from('saif_people').select('id, email, first_name, last_name');

  // Find entries with multiple emails
  const multiEmail = people.filter(p => {
    if (!p.email) return false;
    return p.email.includes(',') || p.email.includes(';') || (p.email.match(/@/g) || []).length > 1;
  });

  if (multiEmail.length === 0) {
    console.log('✅ SUCCESS! No more multi-email records found.');
  } else {
    console.log('Still have', multiEmail.length, 'multi-email records:\n');
    multiEmail.forEach(p => {
      console.log('ID:', p.id);
      console.log('Name:', p.first_name, p.last_name);
      console.log('Email:', p.email);
      console.log('---');
    });
  }
}
check();
