import pathlib,json,re,hashlib,subprocess
root=pathlib.Path.cwd(); out=root/'reports/autonomous-mission';out.mkdir(parents=True,exist_ok=True)
names={1:'Authentication',2:'Durable setup',3:'Organization operations',4:'Discovery and descriptions',5:'Profile and preferences',6:'Data integrity and saved intent',7:'Public shell and status',8:'Exhaustive exploration and final clean run'}
criteria={1:['Both signup role choices and actual demo accounts','Click issued verification action from rendered inbox using actual app template; exact success copy','Unverified gate and exact inline duplicate email error','Rendered branded reset email click, reset form, success and new-password login','Logout route and account-menu signout; session removed'],2:['Durable server completion survives signout/login/dashboard','All fields prefilled, organization steps optional branding and avatar menu'],3:['Both creation routes, actionable validation and unchanged rate guards','Publish/edit/delete job, applicants, messaging, team, analytics and billing (no provider calls or content changes)'],4:['At least 15 discovery pages with populated fixtures','Full expandable descriptions, ingest/existing text/category repair, accessible names and all apply modes'],5:['Profile/avatar/preferences/toggles persist across reload and dark mode'],6:['Data-level dedupe, not UI-only','Expired records excluded from every freshness surface','Login preserves save intent'],7:['Public routes, nav, headings, footer/header desktop/narrow light/dark','Legal read-only and employer pricing unchanged','Retired member browsing remains retired'],8:['Exhaustive seeker/employer desktop/mobile exploration','All eight goals in one final clean owned run after final change']}
def group(p):
 if re.match(r'^/(login|signup|logout|forgot-password|verify-email|auth)(/|$)',p):return 1
 if re.match(r'^/(setup|onboarding)(/|$)',p):return 2
 if re.match(r'^/(org|employer|admin)(/|$)',p):return 3
 if re.match(r'^/(profile|settings|preferences|notifications)(/|$)',p):return 5
 if re.match(r'^/(saved|favorites)(/|$)',p):return 6
 if re.match(r'^/(jobs|events|scholarships|businesses|conferences|livestreams|education|schools|programs|training|powwows|opportunities)(/|$)',p):return 4
 if re.match(r'^/(feed|dashboard|applications|messages)(/|$)',p):return 8
 return 7
files=[]
for folder in ['tests','e2e','scripts']:
 for f in (root/folder).rglob('*'):
  if f.is_file() and f.suffix in ['.ts','.tsx','.mjs','.js'] and 'autonomous-mission' not in str(f):files.append((f.relative_to(root).as_posix(),f.read_text(encoding='utf-8',errors='replace')))
rows=[]
for f in sorted((root/'src/app').rglob('*')):
 if not f.is_file() or not re.fullmatch(r'page\.(tsx?|jsx?)',f.name):continue
 parts=[s for s in f.parent.relative_to(root/'src/app').parts if not s.startswith('(') and not s.startswith('@')]; route='/'+('/'.join(parts)); source=f.read_text(encoding='utf-8'); retired=bool(re.search(r'(notFound\(|permanentRedirect\(|redirect\()',source))
 hits=[name for name,text in files if re.search(r'[\'"`]'+re.escape(route)+r'(?:[\'"`/?])',text)]
 rows.append({'route':route,'source':f.relative_to(root).as_posix(),'goal':group(route),'dynamic':'[' in route,'redirectOrNotFoundCandidate':retired,'retirementReviewRequired':bool(re.search(r'member|talent|mentor',route)),'existingCoverageReferences':hits,'coverageInterpretation':'Text references only; inspect assertions before credit. Historical Round5 is not current goal acceptance.','missingCoverage':'Current user goal acceptance unexecuted; populated identity/role/viewport/error paths not inferred from references.'})
assert len(rows)==len({r['route'] for r in rows}), 'route collision requires review'
goals=[{'id':i,'name':names[i],'status':'pending','routes':[r['route'] for r in rows if r['goal']==i],'acceptance':criteria[i],'testFile':f'tests/e2e-goals/goal-{i:02d}-'+('auth' if i==1 else names[i].lower().replace(' ','-'))+'.mjs','executableImplemented':i==1} for i in names]
(out/'route-inventory.json').write_text(json.dumps({'canonicalRoot':'src/app','pageFiles':len(rows),'uniqueRoutes':len(rows),'routes':rows},indent=2))
(out/'goal-inventory.json').write_text(json.dumps({'scope':'User supplied eight goals supersedes initially missing goal section. Route assignments provisional; acceptance is user supplied. No retired feature revival.','goals':goals},indent=2))
manifest={f.relative_to(root).as_posix():hashlib.sha256(f.read_bytes()).hexdigest() for folder in ['src','tests','scripts'] for f in (root/folder).rglob('*') if f.is_file() and f.suffix in ['.ts','.tsx','.mjs','.py']}
if not (out/'initial-source-manifest.json').exists():
 (out/'initial-source-manifest.json').write_text(json.dumps(manifest,indent=2))
print(json.dumps({'routes':len(rows),'goals':len(goals),'groupCounts':{i:len(g['routes']) for i,g in zip(names,goals)}}))
