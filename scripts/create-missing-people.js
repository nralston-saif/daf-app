const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// People that need new records (failed due to role constraint)
const newPeople = [
  { email: 'trevor@ctgt.ai', first_name: 'Trevor', last_name: 'Tuttle', role: 'founder' },
  { email: 'brandon@lionheart.vc', first_name: 'Brandon', last_name: 'Langer', role: 'founder' },
  { email: 'steven.brill@newsguardtech.com', first_name: 'Steven', last_name: 'Brill', role: 'founder' },
  { email: 'matt.skibinski@newsguardtech.com', first_name: 'Matt', last_name: 'Skibinski', role: 'founder' },
  { email: 'rune@aiuc.com', first_name: 'Rune', last_name: 'Kvist', role: 'founder' },
  { email: 'brandon@aiuc.com', first_name: 'Brandon', last_name: 'Kent', role: 'founder' },
  { email: 'alan@generalanalysis.com', first_name: 'Alan', last_name: 'Wu', role: 'founder' },
  { email: 'rex@generalanalysis.com', first_name: 'Rex', last_name: 'Liu', role: 'founder' },
];

async function createPeople() {
  for (const person of newPeople) {
    const { error } = await supabase
      .from('saif_people')
      .insert(person);

    if (error) {
      console.log('Error creating', person.email, ':', error.message);
    } else {
      console.log('Created:', person.first_name, person.last_name, '-', person.email);
    }
  }
  console.log('\nDone!');
}

createPeople();
