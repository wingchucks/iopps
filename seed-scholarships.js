const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Load env
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
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

const scholarships = [
  // Saskatchewan Student Aid
  { title: 'Saskatchewan Student Aid', organization: 'Government of Saskatchewan', category: 'Government', url: 'https://www.saskatchewan.ca/residents/education-and-learning/saskatchewan-student-aid/student-loans-and-grants', description: 'Student loans and grants to cover tuition, books and living expenses for full-time and part-time students.' },
  { title: 'Saskatchewan Scholarships & Bursaries', organization: 'Government of Saskatchewan', category: 'Government', url: 'https://www.saskatchewan.ca/scholarships', description: 'Provincial scholarships and bursaries directory.' },
  { title: 'Graduate Retention Program', organization: 'Government of Saskatchewan', category: 'Government', url: 'https://www.saskatchewan.ca/grp', description: 'Saskatchewan Graduate Retention Program — rebates for graduates who stay and work in Saskatchewan.' },

  // Apprenticeship
  { title: 'Saskatchewan Youth Apprenticeship (SYA) Industry Scholarships', organization: 'Saskatchewan Apprenticeship', category: 'Trades & Apprenticeship', url: 'https://saskapprenticeshipca/sya-industry-scholarship-youth', description: 'Scholarships for youth enrolled in the Saskatchewan Youth Apprenticeship program.' },

  // Post-Secondary Institutions
  { title: 'Carlton Trail College Scholarships', organization: 'Carlton Trail College', category: 'Post-Secondary', url: 'https://www.carltontrailcollege.com', description: 'Scholarships and awards for Carlton Trail College students.' },
  { title: 'First Nations University of Canada Scholarships', organization: 'First Nations University of Canada', category: 'Indigenous', url: 'https://www.fnuniv.ca/scholarships', description: 'Scholarships and bursaries for FNUniv students.' },
  { title: 'Gabriel Dumont Institute Scholarships', organization: 'Gabriel Dumont Institute', category: 'Indigenous', url: 'https://gdins.org/student-services/scholarships-bursaries', description: 'Scholarships and bursaries for Métis students through GDI.' },
  { title: 'Great Plains College Scholarships', organization: 'Great Plains College', category: 'Post-Secondary', url: 'https://www.greatplainscollege.ca/scholarships', description: 'Scholarships and awards for Great Plains College students.' },
  { title: 'Lakeland College Scholarships', organization: 'Lakeland College', category: 'Post-Secondary', url: 'https://www.lakelandcollege.ca', description: 'Financial awards and scholarships for Lakeland College students.' },
  { title: 'Northlands College Financial Assistance', organization: 'Northlands College', category: 'Post-Secondary', url: 'https://northlandscollege.ca/financial-assistance', description: 'Financial assistance and awards for Northlands College students.' },
  { title: 'North West College Student Support', organization: 'North West College', category: 'Post-Secondary', url: 'https://www.northwestcollege.ca/support.html', description: 'Scholarships and financial support for North West College students.' },
  { title: 'Saskatchewan Polytechnic Scholarships & Awards', organization: 'Saskatchewan Polytechnic', category: 'Post-Secondary', url: 'https://saskpolytech.ca/admissions/resources/scholarships-and-awards.aspx', description: 'Scholarships and awards for Saskatchewan Polytechnic students.' },
  { title: 'SIIT Student Funding', organization: 'Saskatchewan Indian Institute of Technologies (SIIT)', category: 'Indigenous', url: 'https://www.siit.ca/money', description: 'Financial awards and funding for SIIT students.' },
  { title: 'Southeast College Scholarships & Financial Aid', organization: 'Southeast College', category: 'Post-Secondary', url: 'https://southeastcollege.org/students/scholarships-financial-aid', description: 'Scholarships and financial aid for Southeast College students.' },
  { title: 'St. Peter\'s College Scholarships', organization: "St. Peter's College", category: 'Post-Secondary', url: 'https://www.stpeterscollege.ca/scholarships-awards-bursaries', description: "Scholarships, awards and bursaries for St. Peter's College students." },
  { title: 'Suncrest College Entrance Scholarships', organization: 'Suncrest College', category: 'Post-Secondary', url: 'https://suncrests college.ca/entrance-scholarships', description: 'Entrance scholarships for new Suncrest College students.' },
  { title: 'University of Regina Student Awards & Financial Aid', organization: 'University of Regina', category: 'Post-Secondary', url: 'https://www.uregina.ca/safa', description: 'Scholarships, bursaries, and financial aid for University of Regina students.' },
  { title: 'University of Saskatchewan Scholarships', organization: 'University of Saskatchewan', category: 'Post-Secondary', url: 'https://students.usask.ca/money/scholarships.php', description: 'Scholarships and financial awards for University of Saskatchewan students.' },

  // Saskatchewan Groups & Organizations
  { title: '4-H Canada Scholarships & Awards', organization: '4-H Canada', category: 'Youth', url: 'https://www.4-h-canada.ca/scholarships-awards', description: 'Scholarships and awards for 4-H Canada youth members.' },
  { title: 'Affinity Credit Union Scholarships', organization: 'Affinity Credit Union', category: 'Community', url: 'https://www.affinity.ca/meet-affinity/in-the-community/scholarships-awards', description: 'Community scholarships and awards from Affinity Credit Union.' },
  { title: 'ACLS Scholarships', organization: 'Association of Canada Land Surveyors', category: 'Professional', url: 'https://acls-aclc.ca/en/scholarships', description: 'Scholarships for students pursuing land surveying careers.' },
  { title: 'ACUNS Scholarships', organization: 'Association of Canadian Universities for Northern Studies', category: 'Northern Studies', url: 'https://www.acuns.ca', description: 'Awards and scholarships for students engaged in northern studies.' },
  { title: 'Bank of Canada Scholarship & Work Placement Program', organization: 'Bank of Canada', category: 'Finance', url: 'https://www.bankofcanada.ca/careers/scholarships', description: 'Scholarship and work placement opportunities at the Bank of Canada.' },
  { title: 'Canadian Agri-Business Education Foundation', organization: 'CABEF', category: 'Agriculture', url: 'https://www.cabef.org', description: 'Scholarships for students pursuing careers in agri-business.' },
  { title: 'Canadian Scholarship Trust Foundation', organization: 'CST Foundation', category: 'General', url: 'https://www.cstfoundation.ca', description: 'Scholarships and bursaries for Canadian post-secondary students.' },
  { title: 'Canadian Western Agribition Scholarships', organization: 'Canadian Western Agribition', category: 'Agriculture', url: 'https://agribition.com/scholarships-awards/scholarships', description: 'Scholarships and awards related to agriculture and the livestock industry.' },
  { title: 'DisabilityAwards.ca', organization: 'DisabilityAwards.ca', category: 'Accessibility', url: 'https://www.disabilityawards.ca', description: 'Scholarships and awards for students with disabilities.' },
  { title: 'FCC Aboriginal Student Empowerment Fund', organization: 'Farm Credit Canada', category: 'Indigenous', url: 'https://www.fcc-fac.ca/en/about-fcc/careers/students-and-grads/indigenous-student-empowerment-fund.html', description: 'Financial support for Indigenous students pursuing agriculture and related fields.' },
  { title: 'Indigenous Services Canada Post-Secondary Education Funding', organization: 'Indigenous Services Canada', category: 'Indigenous', url: 'https://www.sac-isc.gc.ca/eng/1100100033679/1531406248822', description: 'Federal post-secondary education funding programs for First Nations and Inuit students.' },
  { title: 'Indspire Bursaries & Scholarships', organization: 'Indspire', category: 'Indigenous', url: 'https://indspire.ca/for-students/bursaries-scholarships', description: 'Bursaries and scholarships for Indigenous students across Canada from Indspire.' },
  { title: 'Loan Scholars Program', organization: 'Loan Scholars', category: 'General', url: 'https://loanscholars.ca/becoming-a-scholar', description: 'Scholarship program to help students manage education costs.' },
  { title: 'RBC Future Launch Scholarships', organization: 'RBC', category: 'Banking & Finance', url: 'https://www.rbc.com/en/future-launch/scholarships', description: "RBC Future Launch scholarships supporting young Canadians' career readiness." },
  { title: 'RBC Royal Bank Scholarships', organization: 'RBC Royal Bank', category: 'Banking & Finance', url: 'https://www.rbc.com/dmm/enterprise/scholarships.html', description: 'Scholarships and awards from RBC Royal Bank.' },
  { title: 'Saskatchewan Association of Conservation Officers Scholarships', organization: 'SACO', category: 'Environment & Conservation', url: 'https://saco.ca/awards/scholarships', description: 'Scholarships for students pursuing conservation and natural resources careers.' },
  { title: 'SARM Agricultural Safety & Rural Health Student Scholarship', organization: 'Saskatchewan Association of Rural Municipalities', category: 'Agriculture', url: 'https://cpha-crsma.usask.ca/pghealth/scholarship.php', description: 'Scholarship for students studying agricultural safety and rural health.' },
  { title: 'Saskatchewan Aviation Council Scholarships', organization: 'Saskatchewan Aviation Council', category: 'Aviation', url: 'https://saskaviation council.ca/scholarships', description: 'Scholarships for students pursuing aviation careers in Saskatchewan.' },
  { title: 'Saskatchewan Cancer Agency Student Programs', organization: 'Saskatchewan Cancer Agency', category: 'Health', url: 'https://saskcancer.ca/Students', description: 'Student scholarships and programs through the Saskatchewan Cancer Agency.' },
  { title: 'Saskatchewan Ministry of Agriculture Student Scholarship', organization: 'Government of Saskatchewan', category: 'Agriculture', url: 'https://www.saskatchewan.ca/ag-scholarship', description: 'Provincial scholarship for students in agriculture programs.' },
  { title: 'SGI Scholarships', organization: 'Saskatchewan Government Insurance', category: 'Government', url: 'https://www.sgi.sk.ca/scholarships', description: 'Scholarships for Saskatchewan students from SGI.' },
  { title: 'Saskatchewan School Boards Association Awards & Scholarships', organization: 'Saskatchewan School Boards Association', category: 'Education', url: 'https://www.saskschoolboards.ca/about-us/awards-and-scholarships', description: 'Awards and scholarships for Saskatchewan students.' },
  { title: 'Saskatchewan Stock Growers Association Awards', organization: 'Saskatchewan Stock Growers Association', category: 'Agriculture', url: 'https://saskstockgrowers.com/resources', description: 'Awards and scholarships for students in the livestock industry.' },
  { title: 'SaskCulture Funding Programs', organization: 'SaskCulture', category: 'Arts & Culture', url: 'https://www.saskculture.ca/programs/funding-programs/find-a-grant', description: 'Grants and funding for arts, culture and heritage in Saskatchewan.' },
  { title: 'SaskTel Scholarships', organization: 'SaskTel', category: 'Technology', url: 'https://www.sasktel.com/about-us/corporate-social-responsibility/scholarships', description: 'Scholarships from SaskTel for Saskatchewan students.' },
  { title: 'SIGA Indigenous Scholarship Awards Program', organization: 'Saskatchewan Indian Gaming Authority', category: 'Indigenous', url: 'https://www.siga.ca/socially-responsible/scholarships', description: 'SIGA Indigenous Scholarship Awards Program supporting Indigenous students in Saskatchewan.' },
  { title: 'SaskatchewanScholarships.ca', organization: 'SaskatchewanScholarships.ca', category: 'General', url: 'https://www.saskatchewanscholarships.ca', description: 'Comprehensive directory of scholarships available to Saskatchewan students.' },
  { title: 'Saskatchewan Trucking Association Scholarship', organization: 'Saskatchewan Trucking Association', category: 'Trades & Apprenticeship', url: 'https://www.sasktrucking.com/awards/scholarships', description: 'Scholarships for students pursuing careers in the trucking and transportation industry.' },
  { title: 'ScholarshipsCanada.com', organization: 'ScholarshipsCanada.com', category: 'General', url: 'https://www.scholarshipscanada.com', description: 'National scholarship search database for Canadian students.' },
  { title: 'Schulich Leader Scholarships', organization: 'Schulich Foundation', category: 'STEM', url: 'https://www.schulichleaders.com', description: "Canada's most prestigious undergraduate STEM scholarships." },
  { title: 'SGEU Scholarships & Bursaries', organization: 'Saskatchewan Government and General Employees Union', category: 'Labour & Unions', url: 'https://sgeu.org/member-resources/scholarships-and-bursaries', description: 'Scholarships and bursaries for SGEU members and their families.' },
  { title: 'STEAM Horizon Awards', organization: 'STEAM Horizon Awards', category: 'STEM', url: 'https://www.steamhorizonawards.ca', description: 'Awards recognizing excellence in STEAM education.' },
  { title: 'Student Life Network Full Ride Scholarship (CBC)', organization: 'Student Life Network / CBC', category: 'General', url: 'https://fullride.studentlifenetwork.com', description: 'Full-ride scholarship contest sponsored by CBC for Canadian students.' },
  { title: 'Terry Fox Humanitarian Award', organization: 'Terry Fox Foundation', category: 'Community', url: 'https://terryfox.ca/scholarships', description: 'Prestigious scholarship for students who exemplify the Terry Fox spirit of humanitarianism.' },
  { title: 'The Canadian Hospitality Foundation Scholarships', organization: 'The Canadian Hospitality Foundation', category: 'Hospitality & Tourism', url: 'https://www.thechf.ca/scholarships', description: 'Scholarships for students pursuing careers in hospitality and tourism.' },
  { title: 'TD Scholarships for Community Leadership', organization: 'TD Canada Trust', category: 'Community', url: 'https://www.tdcanadatrust.com/products-services/banking/student-life/scholarship-for-community-leadership/index.jsp', description: 'TD Scholarships for students who demonstrate outstanding community leadership.' },
  { title: 'Universities Canada Programs & Scholarships', organization: 'Universities Canada', category: 'General', url: 'https://www.univcan.ca/programs-and-scholarships', description: 'National scholarship and program database from Universities Canada.' },
  { title: 'Zonta International Scholarships', organization: 'Zonta International', category: 'Women in Leadership', url: 'https://www.zonta.org', description: 'International scholarships supporting women in leadership and service.' },
];

async function seed() {
  const batch = db.batch();
  let count = 0;

  for (const s of scholarships) {
    const id = s.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const ref = db.collection('scholarships').doc(id);
    batch.set(ref, {
      ...s,
      status: 'active',
      source: 'relevance-2026',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    count++;
  }

  await batch.commit();
  console.log(`✅ Seeded ${count} scholarships`);
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
