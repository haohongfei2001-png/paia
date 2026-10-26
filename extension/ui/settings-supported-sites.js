// Capture facts only. This destination does not enumerate clients or grant access.
// The current manifest and chatgpt-adapter expose ChatGPT capture; the same
// boundaries are already presented by the capture-consent owner.
const facts=[
 ['当前支持 ChatGPT。只保存普通聊天中已发送、已显示的用户文字。','Currently supports ChatGPT. Only sent, visible user text in normal chats is saved.'],
 ['临时聊天不自动保存。不会收录输入框草稿或附件正文，不会将完整 AI 回复作为输入档案自动保存，也不会读取账户凭据。','Temporary chats are not saved automatically. Composer drafts and attachment bodies are not captured. Full AI replies are not automatically saved as Input Archive records, and account credentials are not read.'],
 ['暂停保存不会删除已有输入；恢复时，页面中已显示的合格旧输入也可能被收录。','Pausing capture keeps saved inputs. Resuming can also save eligible older inputs already visible on the page.'],
 ['支持收录网站不代表允许外部 AI 读取档案。开启收录不会开启 AI 服务、同步或下一句建议。','Support for capturing a website does not authorize an external AI to read your archive. Enabling capture does not enable AI services, sync or next-input suggestions.']
];
export function createSettingsSupportedSites({language=()=>document.documentElement.lang,document:doc=globalThis.document}={}){
 const content=doc.createElement('div');content.className='ux-settings-site-facts';
 const nodes=facts.map(()=>doc.createElement('p'));content.append(...nodes);
 const sync=()=>{const index=language()==='zh-CN'?0:1;for(let i=0;i<nodes.length;i++)nodes[i].textContent=facts[i][index];};
 sync();return {content,sync};
}
