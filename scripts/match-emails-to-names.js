const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  // Get applications with founder names and emails
  const { data: apps, error } = await supabase
    .from('saifcrm_applications')
    .select('company_name, founder_names, primary_email');

  if (error) {
    console.log('Error:', error.message);
    return;
  }

  // Multi-email cases to check
  const multiEmails = [
    'alexis@deepresponse.ai, zainab@deepresponse.ai',
    'tim@freestyleresearch.com,rick@freestyleresearch.com',
    'cyril@ctgt.ai, trevor@ctgt.ai',
    'kristian@lucidcomputing.ai, greg@lucidcomputing.ai',
    'david@lionheart.vc, brandon@lionheart.vc',
    'izzy@aethra-labs.com, andriy@aethra-labs.com',
    'rajashree@theoremlabs.com, jason@theoremlabs.com',
    'gordon.crovitz@newsguardtech.com, steven.brill@newsguardtech.com, matt.skibinski@newsguardtech.com',
    'eric@goodfire.ai, dan@goodfire.ai',
    'ed@smet.ai, dani@smet.ai, jer@dyneanalytics.com',
    'rune@aiuc.com, rajiv@aiuc.com, brandon@aiuc.com',
    'ghary4s@gmail.com, andrew@archia.io',
    'founders@agenthublabs.com, youssef@tryagenthub.com',
    'rez@generalanalysis.com, alan@generalanalysis.com, rex@generalanalysis.com',
    'jon@locunity.com, dev@locunity.com'
  ];

  console.log('=== Matching emails to founder names ===\n');

  for (const emailGroup of multiEmails) {
    // Find matching application by email
    const app = apps.find(a => a.primary_email && a.primary_email.includes(emailGroup.split(',')[0].split('@')[1].replace(/\s/g, '')));

    if (app) {
      console.log('Company:', app.company_name);
      console.log('Founders:', app.founder_names);
      console.log('Emails:', emailGroup);
      console.log('---');
    } else {
      // Try matching by domain
      const domain = emailGroup.split('@')[1]?.split(',')[0]?.trim();
      const appByDomain = apps.find(a => a.primary_email && a.primary_email.includes(domain));
      if (appByDomain) {
        console.log('Company:', appByDomain.company_name);
        console.log('Founders:', appByDomain.founder_names);
        console.log('Emails:', emailGroup);
        console.log('---');
      } else {
        console.log('NO MATCH for:', emailGroup);
        console.log('---');
      }
    }
  }
}
check();
