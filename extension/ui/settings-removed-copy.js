// Product labels only. Entry bodies and Topic names never enter this translator.
const LABELS={
 '删除主题只移除组织容器，内容仍保留。':'Removing a Topic removes its container; its content is retained.',
 '空内容':'Empty content','恢复主题':'Restore Topic','恢复内容':'Restore content',
 '版本历史':'Version history','版本':'Versions',
 '没有已删除的主题。':'No removed Topics.','没有已删除的内容。':'No removed content.',
 '更多已删除内容':'More removed content'
};
export function removedCopy(node,label){node.dataset.removedCopy=label;node.textContent=document.documentElement.lang==='en'?LABELS[label]:label;return node;}
export function refreshRemovedCopy(host){for(const node of host.querySelectorAll('[data-removed-copy]'))removedCopy(node,node.dataset.removedCopy);}
