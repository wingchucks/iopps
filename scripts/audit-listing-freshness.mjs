import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { isJobRecordExpired, descriptionApplicationDeadline } from '../src/lib/listing-freshness.ts';

export function linkReview(status) {
  return {
    reason: status === 404 || status === 410 ? 'broken_link' : 'link_unverified',
    status,
    autoDelete: false,
    action: status === 404 || status === 410
      ? 'Recheck exact employer URL; confirm replacement or closure with provider before archiving.'
      : 'Retry later or verify in provider browser; access blocks and timeouts do not prove closure.',
  };
}

export async function auditPublicLink(value, approvedOrigins = [], fetcher = fetch) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || !approvedOrigins.includes(url.origin) || /\/api(?:\/|$)/i.test(url.pathname)) {
      return {...linkReview(null), reason:'not_probed', action:'Approve this exact public employer origin before a read-only HEAD probe; never probe application/API actions.'};
    }
    const response = await fetcher(url.href, {method:'HEAD',redirect:'manual',credentials:'omit',signal:AbortSignal.timeout(10000)});
    return response.status >= 200 && response.status < 300
      ? {status:response.status,reason:'reachable',autoDelete:false,action:'HTTP reachability only; verify vacancy and deadline separately.'}
      : linkReview(response.status);
  } catch {
    return {...linkReview(null), reason:'link_unverified'};
  }
}

export function buildFreshnessReview(inventory, now = new Date()) {
  const queue = [];
  const counts = {};
  for (const kind of ['jobs', 'scholarships']) {
    const rows = inventory[kind] || [];
    const ids = new Set(rows.map(row => row.id));
    if (ids.size !== rows.length || rows.some(row => !row.id)) throw new Error(`${kind}: missing or duplicate IDs; inventory is not trustworthy`);
    counts[kind] = rows.length;
    for (const row of rows) {
      const base = {kind, id:row.id, title:row.title || '', url:row.applicationUrl || row.applyUrl || row.externalUrl || row.url || '', autoDelete:false};
      if (isJobRecordExpired(row, now)) {
        queue.push({...base, reason:'past_deadline', action:kind === 'scholarships' ? 'Label intake closed; verify next intake with provider, retain recurring program.' : 'Verify any employer extension; hide expired opportunity while retaining application history.'});
      } else if (![row.closingDate,row.deadline,row.applicationDeadline,row.expiresAt,descriptionApplicationDeadline(row.description)].some(Boolean)) {
        queue.push({...base,reason:'needs_verification',action:'Confirm current opening and deadline with employer; unknown dates and employment terms are not expiry evidence.'});
      }
      const verified = new Date(row.sourceVerifiedAt || 'invalid');
      if (Number.isFinite(verified.getTime()) && now.getTime()-verified.getTime() > 30*86400000) {
        queue.push({...base,reason:'stale_verification',action:'Re-verify exact source and record verification evidence/date; do not equate age with closure.'});
      }
    }
  }
  return {checkedAt:now.toISOString(),readOnly:true,counts,queueCount:queue.length,queue};
}

export async function fetchLiveInventory(fetcher = fetch) {
  const payloads = await Promise.all(['jobs','scholarships'].map(async kind => {
    const response = await fetcher(`https://iopps.ca/api/${kind}`, {method:'GET',redirect:'error',credentials:'omit',signal:AbortSignal.timeout(15000)});
    if(!response.ok)throw new Error(`Public ${kind} list unavailable`);
    const payload=await response.json();
    if(!Array.isArray(payload[kind]))throw new Error(`Invalid public ${kind} inventory`);
    if(kind==='jobs' && (!Number.isInteger(payload.count) || payload.count!==payload.jobs.length))throw new Error('Declared jobs count does not match inventory');
    return payload[kind];
  }));
  return {jobs:payloads[0],scholarships:payloads[1]};
}

async function main() {
  const args=process.argv.slice(2);
  const value=flag=>args[args.indexOf(flag)+1];
  if(args.includes('--live') === args.includes('--input'))throw new Error('Specify exactly one of --live or --input');
  if(!args.includes('--output'))throw new Error('--output report.json is required');
  const parsed=args.includes('--live') ? await fetchLiveInventory() : JSON.parse(await readFile(value('--input'),'utf8'));
  const inventory=Array.isArray(parsed)?{jobs:parsed}:parsed;
  const report=buildFreshnessReview(inventory);
  const approvedOrigins=args.flatMap((arg,index)=>arg==='--link-origin'?[args[index+1]]:[]);
  report.linkChecks=[];
  if(approvedOrigins.length) {
    // Sequential, bounded HEAD requests; never GET detail APIs (some hydrate/write).
    for(const kind of ['jobs','scholarships']) for(const row of inventory[kind] || []) {
      const url=row.applicationUrl || row.applyUrl || row.externalUrl || row.url;
      if(!url)continue;
      const check={kind,id:row.id,url,...await auditPublicLink(url,approvedOrigins)};
      report.linkChecks.push(check);
      if(check.reason!=='reachable' && check.reason!=='not_probed')report.queue.push(check);
    }
  }
  report.queueCount=report.queue.length;
  const output=path.resolve(value('--output'));
  if(args.includes('--input') && output===path.resolve(value('--input')))throw new Error('Output must not overwrite input evidence');
  await mkdir(path.dirname(output),{recursive:true});
  await writeFile(output,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({output,counts:report.counts,queueCount:report.queueCount,readOnly:true}));
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main().catch(error=>{console.error(error.message);process.exitCode=1;});
