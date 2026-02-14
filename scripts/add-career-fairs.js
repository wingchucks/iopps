/**
 * Add Creating Connections Career Fair events to IOPPS
 */

require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');

// Parse credentials
function getCredentials() {
  const base64Str = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (base64Str) {
    try {
      const jsonStr = Buffer.from(base64Str, 'base64').toString('utf-8');
      const parsed = JSON.parse(jsonStr);
      return {
        projectId: parsed.project_id,
        clientEmail: parsed.client_email,
        privateKey: parsed.private_key,
      };
    } catch (e) {
      console.error('Failed to parse base64:', e);
    }
  }
  let privateKey = process.env.FIREBASE_PRIVATE_KEY || '';
  privateKey = privateKey.replace(/\\n/g, '\n');
  return {
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: privateKey,
  };
}

const creds = getCredentials();
if (!creds.projectId || !creds.clientEmail || !creds.privateKey) {
  console.error('Missing Firebase credentials');
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(creds) });
const db = admin.firestore();

const EVENTS = [
  {
    title: 'Creating Connections Job Career Fair - La Ronge',
    description: `Meet & greet with potential employers at the Creating Connections Job Career Fair!

Please bring:
• Resumes & Credentials
• Printing & resume updating services available on site

Hosted by Woodland Cree Ent Inc, LLRIB – Post Sec/Education, and PAGC Labour Force Development.

Thursday, February 26, 2026
10:00 AM - 3:00 PM

Contact: Jude Ratt 306-420-5056`,
    location: 'Jonas Roberts Memorial Community Centre (JRMCC), 409 Far Reserve Road, La Ronge, SK',
    startDate: new Date('2026-02-26T10:00:00-06:00'),
    endDate: new Date('2026-02-26T15:00:00-06:00'),
    organizer: 'Woodland Cree Ent Inc, LLRIB & PAGC Labour Force Development',
    eventType: 'career_fair',
    region: 'Saskatchewan',
    registrationStatus: 'free',
    contactPhone: '306-420-5056',
    contactName: 'Jude Ratt',
  },
  {
    title: 'Creating Connections Job Career Fair - Prince Albert',
    description: `Meet & greet with potential employers at the Creating Connections Job Career Fair!

Please bring:
• Resumes & Credentials
• Printing & resume updating services available on site

Hosted by PAGC Labour Force Development, Woodland Cree, Eastside Limb, PAGC Urban, Pelican Lake First Nation, and Sturgeon Lake First Nation.

Thursday, March 19, 2026
9:00 AM - 3:00 PM

Phone: 306-765-5300`,
    location: 'Prince Albert Grand Council Urban Centre, 1211 1st Ave West, Prince Albert, SK',
    startDate: new Date('2026-03-19T09:00:00-06:00'),
    endDate: new Date('2026-03-19T15:00:00-06:00'),
    organizer: 'PAGC Labour Force Development, Woodland Cree, Eastside Limb & Partners',
    eventType: 'career_fair',
    region: 'Saskatchewan',
    registrationStatus: 'free',
    contactPhone: '306-765-5300',
  },
];

async function addEvents() {
  console.log('Adding career fair events...\n');

  for (const event of EVENTS) {
    // Check if event already exists
    const existing = await db.collection('events')
      .where('title', '==', event.title)
      .limit(1)
      .get();

    if (!existing.empty) {
      console.log(`⏭ Skipped (exists): ${event.title}`);
      continue;
    }

    const eventData = {
      title: event.title,
      name: event.title,
      description: event.description,
      location: event.location,
      startDate: admin.firestore.Timestamp.fromDate(event.startDate),
      endDate: admin.firestore.Timestamp.fromDate(event.endDate),
      organizerName: event.organizer,
      organization: event.organizer,
      eventType: event.eventType,
      type: 'career_fair',
      category: 'Career Fair',
      region: event.region,
      province: 'Saskatchewan',
      registrationStatus: event.registrationStatus,
      contactPhone: event.contactPhone,
      contactName: event.contactName || '',
      active: true,
      featured: false,
      isVirtual: false,
      isFree: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      // Posted by IOPPS JR org
      organizerId: 'osQ9E5wOVPVpCMcL09V7YSm0J0E2',
    };

    const ref = await db.collection('events').add(eventData);
    await ref.update({ id: ref.id });
    console.log(`✅ Added: ${event.title}`);
  }

  console.log('\nDone!');
  process.exit(0);
}

addEvents().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
