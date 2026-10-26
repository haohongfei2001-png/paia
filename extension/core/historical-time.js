// Read-only historical time evidence. Never substitute capture/import/update time.
const calendar=(year,month,day)=>{
 if(year<1000||month<1||month>12||day<1||day>31)return null;
 const instant=Date.UTC(year,month-1,day),date=new Date(instant);
 return date.getUTCFullYear()===year&&date.getUTCMonth()===month-1&&date.getUTCDate()===day?instant:null;
};
export function historicalInstant(value){
 if(typeof value!=='string')return null;
 const parts=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|[+-]\d{2}:\d{2})$/.exec(value);
 if(!parts||calendar(+parts[1],+parts[2],+parts[3])===null||+parts[4]>23||+parts[5]>59||+parts[6]>59)return null;
 if(parts[8]!=='Z'&&(+parts[8].slice(1,3)>23||+parts[8].slice(4,6)>59))return null;
 const instant=Date.parse(value);return Number.isFinite(instant)?instant:null;
}
export const historicalSourceTime=value=>historicalInstant(value)===null?null:value;
export function historicalDateBound(value){
 if(typeof value!=='string')return null;
 const parts=/^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
 return parts?calendar(+parts[1],+parts[2],+parts[3]):historicalInstant(value);
}
