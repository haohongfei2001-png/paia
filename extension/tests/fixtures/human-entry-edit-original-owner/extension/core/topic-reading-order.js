export const timestamp=value=>typeof value==='number'&&Number.isFinite(value)?value:Date.parse(value)||0;
const WEEK=7*86400000;
export function decayedReads(read,now){const value=Math.max(0,Math.min(8,Number(read?.weight)||0))*2**(-Math.max(0,timestamp(now)-timestamp(read?.at))/WEEK);return value<.01?0:value;}
export function recordRead(read,now){now=timestamp(now);if(read&&now-read.at<60000)return read;return {at:now,weight:Math.min(8,decayedReads(read,now)+1)};}
export function compareReadingTopics(a,b,now){
 const content=x=>timestamp(x.meaningfulContentAt);
 // Recency is lexicographic: frequency cannot outrank newer meaningful content.
 const recent=x=>timestamp(now)-timestamp(x.readingActivity?.at)<28*86400000?timestamp(x.readingActivity?.at):0;
 return content(b)-content(a)||recent(b)-recent(a)||decayedReads(b.readingActivity,now)-decayedReads(a.readingActivity,now)||a.id.localeCompare(b.id);
}
