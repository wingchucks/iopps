const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...rest] = line.split('=');
  if (key && rest.length) envVars[key.trim()] = rest.join('=').trim().replace(/^"|"$/g, '');
});

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: envVars.FIREBASE_PROJECT_ID,
    clientEmail: envVars.FIREBASE_CLIENT_EMAIL,
    privateKey: envVars.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  })
});

const db = admin.firestore();

const description = `Reporting to the Director of Indigenous Initiatives, the Indigenous Cultural Resource provides a leadership role in developing and maintaining connections to Elders, Knowledge Keepers and ceremonialists, and acts as an influencer and change-maker as the City moves towards decolonization and reconciliation.

Division: Strategy and Transformation
Department: Indigenous Initiatives
Term: 1 Temporary Full Time position available for approximately 15 months with the possibility of extension.
Labour Group: SCMMA

DUTIES & RESPONSIBILITIES

• Acts in a consultative capacity to City Administration and City Council to enhance their understanding of Indigenous laws, natural/cultural/spiritual worldviews and Western worldview and how to integrate these perspectives respectfully.
• Identifies learning opportunities for City Administration and City Council.
• Leads or participates in the development and delivery of cultural training and workshops for City Administration and City Council.
• Collaboratively develops and implements short and long-term plans for engaging with Elders, Knowledge Keepers and ceremonialists from diverse culture and language groups with different teachings, practices and protocols.
• Develops strategic and mutually beneficial relationships with Indigenous groups and stakeholders, to ensure effective partnerships with Indigenous groups, stakeholders and government, utilizing Indigenous worldviews and governance models.
• Provides guidance to City departments on engaging with Elders, Knowledge Keepers and ceremonialists from diverse culture and language groups.
• Assists the City in setting and achieving reconciliation goals and priorities and builds a collection of knowledge to document engagement processes, initiatives, and training.
• Develops, coordinates, and implements holistic approaches geared to achieving, maintaining or improving internal and community relations, understanding and well-being consistent with the City of Saskatoon's vision of miyo-pimatisiwin (the "good life") for all residents.
• Provides guidance and support to employees and community members needing to access culturally responsive care.
• Utilizes Indigenous knowledge to inform policy/procedure development and/or review to ensure alignment with the City's commitment to reconciliation.
• Leads in the planning, managing, facilitating, and implementing related projects, initiatives, cultural events, engagement events, working groups and committees.
• Monitors emerging issues and trends to inform responses and provide guidance to culturally sensitive inquiries and issues.
• Prepares, contributes to and presents reports to funders, leadership and City Council.
• Performs other related duties as assigned.

QUALIFICATIONS

• Post-secondary education in a related field is considered an asset.
• Five to ten years related and progressively responsible experience working with Indigenous communities, in particular Elders and Knowledge Keepers.
• Earned recognition from Elders, Knowledge Keepers, ceremonialists to assist with ceremony.
• Comprehensive knowledge of Indigenous values, cultures, medicines, and traditions.
• Knowledge of Indigenous heritage, history, governance and Treaties.
• Fluency and/or competencies in an Indigenous language would be an asset.
• Skilled in collaboration, facilitation and conflict resolution.
• Demonstrated ability to communicate effectively in writing and orally, one-on-one and in public speaking roles.
• Ability to maintain confidentiality while handling sensitive information.

ADDITIONAL REQUIREMENTS

• Weekly Hours: 36.67
• Salary Range: $86,211.84 to $101,175.60 CAD per annum (2023 rates)
• Requires Criminal Record Check (CRC) and Vulnerable Sector Search (VSS)

The City of Saskatoon offers an inclusive workplace that embraces diverse backgrounds and is committed to diversity, equity and inclusion in support of miyo-pimatisiwin ("the good life") for all residents.`;

async function update() {
  await db.collection('jobs').doc('indigenous-cultural-resource-city-of-saskatoon').update({
    description,
    salary: '$86,211.84 – $101,175.60/year',
    salaryMin: 86211.84,
    salaryMax: 101175.60,
    salaryType: 'yearly',
    employmentType: 'Term / Temporary Full-Time',
    externalUrl: 'https://careers.saskatoon.ca/job/Saskatoon-Indigenous-Cultural-Resource-SK/599917517/',
    closingDate: '2026-03-03',
    department: 'Indigenous Initiatives',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log('✅ City of Saskatoon job updated with full description');
  process.exit(0);
}

update().catch(err => { console.error(err); process.exit(1); });
