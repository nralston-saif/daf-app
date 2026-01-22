const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  // Get all people with first_name or last_name
  const { data: people } = await supabase
    .from('saif_people')
    .select('id, email, name, first_name, last_name');

  // Find people with names
  const withNames = people.filter(p => p.first_name || p.last_name || p.name);
  console.log('People with names:', withNames.length);
  console.log('\n--- People with names ---');
  withNames.forEach(p => {
    console.log('ID:', p.id);
    console.log('Email:', p.email);
    console.log('Name:', p.name, '| First:', p.first_name, '| Last:', p.last_name);
    console.log('---');
  });

  // Now check for alexis specifically
  console.log('\n\n--- Searching for Alexis ---');
  const alexis = people.filter(p =>
    (p.first_name && p.first_name.toLowerCase().includes('alexis')) ||
    (p.last_name && p.last_name.toLowerCase().includes('carlier')) ||
    (p.email && p.email.toLowerCase().includes('alexis'))
  );
  alexis.forEach(p => {
    console.log('Found:', p);
  });

  // Show multi-email records
  console.log('\n\n--- Multi-email records ---');
  const multiEmail = people.filter(p => {
    if (!p.email) return false;
    return p.email.includes(',') || p.email.includes(';') || (p.email.match(/@/g) || []).length > 1;
  });
  multiEmail.forEach(p => {
    console.log('ID:', p.id, '| Email:', p.email);
  });
}
check();
