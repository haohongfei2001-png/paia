// Call only from an explicit trusted-extension copy gesture; never read clipboard.
export async function copyPrompt(text,clipboard=globalThis.navigator.clipboard){
 if(typeof text!=='string'||!text.trim()||text.length>200000)return {status:'failed'};
 try{await clipboard.writeText(text);return {status:'copied',verified:true};}catch{return {status:'failed'};}
}
