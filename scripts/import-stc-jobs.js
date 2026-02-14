/**
 * Import Saskatoon Tribal Council Jobs into IOPPS
 * Run from web directory: cd web && node ../scripts/import-stc-jobs.js
 */

require('dotenv').config({ path: '.env.local' });

const admin = require('firebase-admin');

// Parse service account from env
function getCredentials() {
  // Try base64 first
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

  // Fall back to individual vars
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
  console.error('Missing Firebase credentials. Make sure .env.local is configured.');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(creds)
});

const db = admin.firestore();

// STC Employer Info
const STC_EMPLOYER = {
  id: 'stc-saskatoon-tribal-council',
  name: 'Saskatoon Tribal Council',
  logo: 'https://sktc.sk.ca/wp-content/uploads/2023/01/stc-logo.png',
  website: 'https://sktc.sk.ca',
  applyBaseUrl: 'https://workforcenow.adp.com/mascsr/default/mdf/recruitment/recruitment.html?cid=a76445e7-5b3c-4a1b-95c0-2ab1f96ab518&ccId=19000101_000001&source=CC2&lang=en_CA&selectedMenuKey=CareerCenter',
  description: 'Saskatoon Tribal Council is committed to improving the quality of life for members of our seven First Nations. With almost 500 employees, STC delivers health, justice, education, child and family services, mental health supports, housing, training & skills development across Treaty 6 Territory.'
};

// Jobs from STC ADP portal (scraped Feb 9, 2026)
const STC_JOBS = [
  {
    title: 'Early Learning Program Mentor',
    location: 'Saskatoon, SK',
    type: 'Full-Time Term',
    description: 'The Early Learning Program Mentor assists STC member Nations in developing and maintaining programs and services that support early childhood and family development needs. Program support for staff development and program development – cultural, land based and play based consistent with "Play and Exploration" approaches.',
    category: 'Education',
  },
  {
    title: 'KidsFirst Home Visitor',
    location: 'Saskatoon, SK',
    type: 'Full Time',
    description: 'Provide home visiting services to families with young children, supporting early childhood development and family wellness through culturally appropriate programming.',
    category: 'Social Services',
  },
  {
    title: 'Administrative Support, H&FS',
    location: 'Saskatoon, SK',
    type: 'Full Time',
    description: 'Provide administrative support to the Health & Family Services department, including scheduling, correspondence, file management, and general office duties.',
    category: 'Administration',
  },
  {
    title: 'Post Majority Care Supervisor',
    location: 'Saskatoon, SK',
    type: 'Full-Time Term',
    description: 'Supervise and support Post Majority Care services for youth aging out of care, ensuring they receive appropriate supports and resources for independent living.',
    category: 'Social Services',
  },
  {
    title: 'Summer Students',
    location: 'Saskatoon, SK',
    type: 'Full-Time Term',
    description: 'Summer employment opportunities for students across various STC departments. Gain valuable work experience while contributing to programs serving First Nations communities.',
    category: 'General',
  },
  {
    title: 'Director (In Training), Well-being Services',
    location: 'Saskatoon, SK',
    type: 'Full-Time Term',
    description: 'Leadership development position preparing for Director role in Well-being Services. Oversee programs supporting mental health, addictions, and wellness for First Nations communities.',
    category: 'Leadership',
  },
  {
    title: 'Post Majority Care Navigator',
    location: 'Saskatoon, SK',
    type: 'Full-Time Term',
    description: 'Navigate and coordinate services for youth transitioning out of care, connecting them with housing, education, employment, and community resources.',
    category: 'Social Services',
  },
  {
    title: 'First Contact Coordinator',
    location: 'Saskatoon, SK',
    type: 'Full-Time Term',
    description: 'Coordinate first contact and intake services, ensuring families receive appropriate referrals and supports when connecting with STC services.',
    category: 'Social Services',
  },
  {
    title: 'Well-Being Services Child/Youth Support Worker',
    location: 'Saskatoon, SK',
    type: 'Full Time',
    description: 'Provide direct support services to children and youth, including mentoring, life skills development, and connection to cultural programming and community resources.',
    category: 'Social Services',
  },
  {
    title: 'EWC Peacekeeper',
    location: 'Saskatoon, SK',
    type: 'Casual Term',
    description: 'Provide peacekeeping and security services at the Emergency Warming Centre, ensuring a safe environment for vulnerable community members.',
    category: 'Security',
  },
  {
    title: 'Harm Reduction Outreach Worker',
    location: 'Saskatoon, SK',
    type: 'Casual',
    description: 'Provide harm reduction services and outreach to community members, including needle exchange, naloxone distribution, and connection to treatment resources.',
    category: 'Health',
  },
  {
    title: 'Child & Youth Services Worker',
    location: 'Saskatoon, SK',
    type: 'Full-Time Term',
    description: 'Deliver child and youth services including case management, advocacy, and support for children and families involved with child welfare services.',
    category: 'Social Services',
  },
  {
    title: 'Family Services Worker',
    location: 'Saskatoon, SK',
    type: 'Full-Time Term',
    description: 'Provide family support services including assessment, case management, and connection to resources for families working toward reunification or stability.',
    category: 'Social Services',
  },
  {
    title: 'Saweyihtotan Peacekeeper',
    location: 'Saskatoon, SK',
    type: 'Casual',
    description: 'Peacekeeper for the Saweyihtotan program, providing culturally appropriate conflict resolution and safety services.',
    category: 'Security',
  },
  {
    title: 'Saweyihtotan Support Worker',
    location: 'Saskatoon, SK',
    type: 'Casual',
    description: 'Support worker for the Saweyihtotan program, providing assistance to participants and helping maintain a safe, supportive environment.',
    category: 'Social Services',
  },
  {
    title: 'Early Childhood Educator 1-3',
    location: 'Saskatoon, SK',
    type: 'Full Time',
    description: 'Provide early childhood education programming for children ages 1-3, incorporating Indigenous culture, language, and land-based learning approaches.',
    category: 'Education',
  },
  {
    title: 'Child Support Worker - STC 24 Hour Homes',
    location: 'Saskatoon, SK',
    type: 'Full Time',
    description: 'Provide 24-hour care and support for children in STC residential homes, including daily living support, supervision, and cultural programming.',
    category: 'Social Services',
  }
];

async function importJobs() {
  console.log('Starting STC job import...\n');

  // Import jobs
  let imported = 0;
  let skipped = 0;

  for (const job of STC_JOBS) {
    // Check if job already exists (by title + employer)
    const existing = await db.collection('jobs')
      .where('title', '==', job.title)
      .where('employerName', '==', STC_EMPLOYER.name)
      .limit(1)
      .get();

    if (!existing.empty) {
      console.log(`⏭ Skipped (exists): ${job.title}`);
      skipped++;
      continue;
    }

    const jobData = {
      title: job.title,
      description: job.description,
      location: job.location,
      employmentType: normalizeJobType(job.type),
      category: job.category,
      
      // Employer info - Use STC, not IOPPS JR
      employerId: STC_EMPLOYER.id,
      employerName: STC_EMPLOYER.name,
      companyName: STC_EMPLOYER.name,
      companyLogo: STC_EMPLOYER.logo,
      
      // Application link to STC's ADP portal
      applicationLink: STC_EMPLOYER.applyBaseUrl,
      originalApplicationLink: STC_EMPLOYER.applyBaseUrl,
      quickApplyEnabled: false,
      
      // Indigenous hiring preference
      indigenousPreference: true,
      
      // Status
      active: true,
      featured: false,
      remoteFlag: false,
      
      // Metadata
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      viewsCount: 0,
      applicationsCount: 0,
      source: 'manual-import',
      sourceOrg: 'Saskatoon Tribal Council',
    };

    const jobRef = await db.collection('jobs').add(jobData);
    await jobRef.update({ id: jobRef.id });

    console.log(`✅ Imported: ${job.title}`);
    imported++;
  }

  console.log(`\n========================================`);
  console.log(`Import complete!`);
  console.log(`✅ Imported: ${imported} jobs`);
  console.log(`⏭ Skipped: ${skipped} jobs`);
  console.log(`========================================\n`);

  process.exit(0);
}

function normalizeJobType(type) {
  const lower = type.toLowerCase();
  if (lower.includes('full-time') || lower.includes('full time')) return 'Full-time';
  if (lower.includes('part-time') || lower.includes('part time')) return 'Part-time';
  if (lower.includes('casual')) return 'Casual';
  if (lower.includes('term')) return 'Term';
  if (lower.includes('contract')) return 'Contract';
  return 'Full-time';
}

importJobs().catch(err => {
  console.error('Import failed:', err);
  process.exit(1);
});
