const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  // Get all columns from applications
  const { data: apps } = await supabase
    .from('saifcrm_applications')
    .select('*')
    .limit(5);

  if (apps && apps.length > 0) {
    console.log('Application columns:', Object.keys(apps[0]).join(', '));
  }

  // Search for alexis across all text fields
  const { data: allApps } = await supabase
    .from('saifcrm_applications')
    .select('*');

  console.log('\nSearching all', allApps.length, 'applications for "alexis"...');

  allApps.forEach(app => {
    const jsonStr = JSON.stringify(app).toLowerCase();
    if (jsonStr.includes('alexis') || jsonStr.includes('deepresponse')) {
      console.log('\nFOUND IN APP:');
      console.log(JSON.stringify(app, null, 2));
    }
  });

  // Also check saif_people for any name field
  const { data: people } = await supabase
    .from('saif_people')
    .select('*')
    .limit(5);

  if (people && people.length > 0) {
    console.log('\n\nPeople columns:', Object.keys(people[0]).join(', '));
  }
}
check();
