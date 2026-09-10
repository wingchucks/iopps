/** Never reinterpret a feed sync/update as a verified source check. */
export function jobDetailDates(job: object): Array<{label:string;date:string}> {
  const record=job as Record<string, unknown>;
  return [["Originally posted",record.publishedAt || record.postedAt], ["Added to IOPPS",record.createdAt], ["Last source check",record.sourceVerifiedAt]].flatMap(([label,value]) => {
    if (!value) return [];
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return [{label:String(label),date:value}];
    const timestamp=value as {seconds?:number;toDate?:()=>Date};
    const date=typeof value === "string" ? new Date(value) : timestamp.toDate ? timestamp.toDate() : typeof timestamp.seconds === "number" ? new Date(timestamp.seconds*1000) : null;
    return date && Number.isFinite(date.getTime()) ? [{label:String(label),date:date.toLocaleDateString("en-CA",{timeZone:"America/Regina"})}] : [];
  });
}
