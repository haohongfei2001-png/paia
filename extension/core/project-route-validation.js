const PROJECT_ID=/^g-p-[a-f0-9]{32}$/;

export function canonicalProjectChat(rawUrl) {
  try {
    const url=new URL(rawUrl);
    if(url.origin!=='https://chatgpt.com'||url.username||url.password)return null;
    if(['temporary-chat','temporary','temporary_chat'].some(key=>url.searchParams.has(key)))return null;
    const match=url.pathname.match(/^\/g\/(g-p-[a-f0-9]{32})(?:-[^/]*)?\/c\/([a-zA-Z0-9_-]{1,128})\/?$/i);
    if(!match)return null;
    const projectId=match[1].toLowerCase();
    if(!PROJECT_ID.test(projectId))return null;
    return {id:match[2],projectId,url:`${url.origin}${url.pathname.replace(/\/$/,'')}`};
  } catch { return null; }
}
