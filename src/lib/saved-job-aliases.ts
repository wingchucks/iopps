import type { SavedItem } from './firestore/savedItems';
export type SavedJobAlias = {originalId:string;canonicalId:string;destination:string};
export type SavedAliasGroup = SavedItem & {records:SavedItem[];destination?:string};
export async function loadSavedJobAliases(ids:string[]):Promise<SavedJobAlias[]> {
 const unique=[...new Set(ids)], result:SavedJobAlias[]=[];
 for(let start=0;start<unique.length;start+=50) {
  const response=await fetch('/api/jobs/aliases',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ids:unique.slice(start,start+50)}),cache:'no-store'});
  if(!response.ok) throw new Error('Cannot verify saved job aliases');
  const data=await response.json();
  if(!Array.isArray(data.aliases)) throw new Error('Invalid aliases');
  result.push(...data.aliases);
 }
 return result;
}
export function groupSavedAliases(items:SavedItem[], aliases:SavedJobAlias[]):SavedAliasGroup[] {
 const byId=new Map(aliases.map(a=>[a.originalId,a]));
 const destinations=new Map(aliases.map(a=>[a.canonicalId,a.destination]));
 const groups=new Map<string,SavedAliasGroup>();
 for(const item of items) {
  const canonical=item.postType==='job'?(byId.get(item.postId)?.canonicalId||item.postId):item.postId;
  const key=JSON.stringify([item.userId,item.postType,canonical]);
  const existing=groups.get(key);
  if(existing) existing.records.push(item);
  else groups.set(key,{...item,records:[item],...(item.postType==='job'&&destinations.has(canonical)?{destination:destinations.get(canonical)}:{})});
 }
 return [...groups.values()];
}
