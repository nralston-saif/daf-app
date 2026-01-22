const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Mapping of emails to their corresponding person (by first_name match)
const emailMappings = [
  // deepresponse.ai
  { multiEmailId: '8c975009-bbbf-4f66-8af4-fe06e7927c36', keepEmail: 'alexis@deepresponse.ai',
    assignEmail: 'zainab@deepresponse.ai', assignToFirst: 'Zainab' },

  // freestyleresearch.com
  { multiEmailId: '68b92330-c04f-48d0-98be-f3e5a9249853', keepEmail: 'tim@freestyleresearch.com',
    assignEmail: 'rick@freestyleresearch.com', assignToFirst: 'Rick' },

  // ctgt.ai - has "Gorlia and Trevor Tuttle" in last_name, need to split
  { multiEmailId: '327858bb-50a6-440e-8542-86e511ece887', keepEmail: 'cyril@ctgt.ai',
    assignEmail: 'trevor@ctgt.ai', assignToFirst: 'Trevor', needsNewRecord: true,
    newFirst: 'Trevor', newLast: 'Tuttle', fixLastName: 'Gorlla' },

  // lucidcomputing.ai
  { multiEmailId: '0ad4a212-763a-4723-907b-ebc1ebc62eb3', keepEmail: 'kristian@lucidcomputing.ai',
    assignEmail: 'greg@lucidcomputing.ai', assignToFirst: 'Gregory' },

  // lionheart.vc - need to find Brandon
  { multiEmailId: 'ea840614-ef7f-4092-8e70-aa6c2e8c2d7b', keepEmail: 'david@lionheart.vc',
    assignEmail: 'brandon@lionheart.vc', assignToFirst: 'Brandon', needsNewRecord: true,
    newFirst: 'Brandon', newLast: 'Langer' },

  // aethra-labs.com
  { multiEmailId: '8356bcea-afa8-4ed3-8776-5406244d796e', keepEmail: 'izzy@aethra-labs.com',
    assignEmail: 'andriy@aethra-labs.com', assignToFirst: 'Andriy' },

  // theoremlabs.com
  { multiEmailId: '4ee29810-6bfc-4ea3-a92a-daf218ad6a9c', keepEmail: 'rajashree@theoremlabs.com',
    assignEmail: 'jason@theoremlabs.com', assignToFirst: 'Jason' },

  // newsguardtech.com - has 3 emails
  { multiEmailId: '01adea19-0041-414f-b1e8-6bf20af898ed', keepEmail: 'gordon.crovitz@newsguardtech.com',
    emails: [
      { email: 'steven.brill@newsguardtech.com', firstName: 'Steven', needsNew: true, lastName: 'Brill' },
      { email: 'matt.skibinski@newsguardtech.com', firstName: 'Matt', needsNew: true, lastName: 'Skibinski' }
    ], fixLastName: 'Crovitz' },

  // goodfire.ai
  { multiEmailId: '673399c7-7e96-40c6-999e-0a184b2a584c', keepEmail: 'eric@goodfire.ai',
    assignEmail: 'dan@goodfire.ai', assignToFirst: 'Daniel' },

  // smet.ai - has 3 emails
  { multiEmailId: '7263cf8e-3184-4d13-8b42-f8a60642ccdc', keepEmail: 'dani@smet.ai',
    emails: [
      { email: 'ed@smet.ai', firstName: 'Edouard' },
      { email: 'jer@dyneanalytics.com', firstName: 'Jeremie' }
    ] },

  // aiuc.com - has 3 emails, names in last_name field
  { multiEmailId: '43c96cd3-2ac1-46de-93c0-cd5652a92ee4', keepEmail: 'rajiv@aiuc.com',
    emails: [
      { email: 'rune@aiuc.com', firstName: 'Rune', needsNew: true, lastName: 'Kvist' },
      { email: 'brandon@aiuc.com', firstName: 'Brandon', needsNew: true, lastName: 'Kent' }
    ], fixLastName: 'Dattani' },

  // archia.io
  { multiEmailId: 'e738f906-b7d3-4e29-8aae-5e5d923e33d1', keepEmail: 'ghary4s@gmail.com',
    assignEmail: 'andrew@archia.io', assignToFirst: 'Andrew' },

  // agenthublabs.com
  { multiEmailId: '3cf4b62e-7bc8-4b6b-a6e6-56a915454266', keepEmail: 'youssef@tryagenthub.com',
    assignEmail: 'founders@agenthublabs.com', assignToFirst: 'Sandra', fixLastName: 'Kallal' },

  // generalanalysis.com - names in last_name
  { multiEmailId: 'df9c138b-fd85-4c8d-98d6-442f1e989958', keepEmail: 'rez@generalanalysis.com',
    emails: [
      { email: 'alan@generalanalysis.com', firstName: 'Alan', needsNew: true, lastName: 'Wu' },
      { email: 'rex@generalanalysis.com', firstName: 'Rex', needsNew: true, lastName: 'Liu' }
    ], fixLastName: 'Havaei' },

  // locunity.com
  { multiEmailId: 'cdded870-7bf7-4aaa-a3bb-2b3289084bcf', keepEmail: 'jon@locunity.com',
    assignEmail: 'dev@locunity.com', assignToFirst: 'Dev' },
];

async function fixEmails() {
  const { data: allPeople } = await supabase.from('saif_people').select('*');

  for (const mapping of emailMappings) {
    console.log('\n--- Processing:', mapping.keepEmail, '---');

    // Update the main record to keep only the first email
    const { error: updateError } = await supabase
      .from('saif_people')
      .update({
        email: mapping.keepEmail,
        ...(mapping.fixLastName ? { last_name: mapping.fixLastName } : {})
      })
      .eq('id', mapping.multiEmailId);

    if (updateError) {
      console.log('Error updating main record:', updateError.message);
      continue;
    }
    console.log('Updated main record with email:', mapping.keepEmail);

    // Handle single assignment
    if (mapping.assignEmail) {
      if (mapping.needsNewRecord) {
        // Create new record
        const { error: insertError } = await supabase
          .from('saif_people')
          .insert({
            email: mapping.assignEmail,
            first_name: mapping.newFirst,
            last_name: mapping.newLast
          });
        if (insertError) {
          console.log('Error creating new record:', insertError.message);
        } else {
          console.log('Created new record for:', mapping.newFirst, mapping.newLast);
        }
      } else {
        // Find existing record with null email and matching first_name
        const person = allPeople.find(p =>
          p.first_name === mapping.assignToFirst && !p.email
        );
        if (person) {
          const { error } = await supabase
            .from('saif_people')
            .update({ email: mapping.assignEmail })
            .eq('id', person.id);
          if (error) {
            console.log('Error assigning email:', error.message);
          } else {
            console.log('Assigned', mapping.assignEmail, 'to', person.first_name, person.last_name);
          }
        } else {
          console.log('Could not find person with first_name:', mapping.assignToFirst);
        }
      }
    }

    // Handle multiple assignments
    if (mapping.emails) {
      for (const emailInfo of mapping.emails) {
        if (emailInfo.needsNew) {
          const { error } = await supabase
            .from('saif_people')
            .insert({
              email: emailInfo.email,
              first_name: emailInfo.firstName,
              last_name: emailInfo.lastName
            });
          if (error) {
            console.log('Error creating record for', emailInfo.email, ':', error.message);
          } else {
            console.log('Created new record:', emailInfo.firstName, emailInfo.lastName, emailInfo.email);
          }
        } else {
          const person = allPeople.find(p =>
            p.first_name === emailInfo.firstName && !p.email
          );
          if (person) {
            const { error } = await supabase
              .from('saif_people')
              .update({ email: emailInfo.email })
              .eq('id', person.id);
            if (error) {
              console.log('Error assigning', emailInfo.email, ':', error.message);
            } else {
              console.log('Assigned', emailInfo.email, 'to', person.first_name, person.last_name);
            }
          } else {
            console.log('Could not find person with first_name:', emailInfo.firstName);
          }
        }
      }
    }
  }

  console.log('\n\n=== DONE ===');
}

fixEmails();
