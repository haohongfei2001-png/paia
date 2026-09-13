// Copy for UX-R3 surfaces. User-authored text never passes through this map.
const english={
 '已修改这条思想，档案未变。':'Thought updated. The archive is unchanged.',
 '这次撤销也会修改档案。仅确认本次操作，不会开启全局开关。':'This undo also changes the archive. Confirm this operation only; the global setting stays off.',
 '内容已变化，请核对版本历史。':'Content changed. Check version history.',
 '档案或思想已变化，撤销未写入。':'The archive or thought changed. Undo was not applied.',
 '原位置已移除，从附近继续。':'The previous location was removed. Continuing nearby.',
 '撤销尚未保存，文字仍在这里。':'Undo was not saved. Your text is still here.',
 '已保存到本机':'Saved locally','正在保存…':'Saving…','查看':'View',
 '‹ 返回思想库':'‹ Back to Thought Library','思想库 / 主题阅读':'Thought Library / Topic',
 '加入主题':'Add to topic','补充今天的想法':'Add a thought from today','接着写':'Continue thinking','关闭':'Close',
 '内容已变化，请重新打开核对。':'The content changed. Reopen to compare.',
 '文字尚未保存。放弃这份草稿？取消可保留在此继续写。':'This draft is not saved. Discard it? Cancel to keep writing.',
 '搜索主题':'Search topics','加载更多主题':'Load more topics','还没有主题，可以新建一个。':'No topics yet. Create one to begin.',
 '主题暂未读完，请重试。':'Topics could not finish loading. Try again.','重试读取主题':'Retry loading topics',
 '新建主题':'New topic','新主题名称':'New topic name','创建主题':'Create topic','主题未保存，请重试。':'Topic was not saved. Try again.',
 '所选文字':'Selected text','整条输入 / 思想':'Whole input / thought','加入':'Add','请选择至少一个主题。':'Select at least one topic.',
 '这段内容已变化，请重新确认。':'This selection changed. Select it again.','已加入主题':'Added to topic',
 '尚未加入，选择和范围仍在这里。请重试。':'Not added yet. Your selection and topics are still here. Try again.',
 '这会保存为今天的新想法，不修改以前的内容。':'This saves a new thought dated today. Earlier content stays unchanged.',
 '回应的文字':'Text you are responding to','今天的新想法':'Today’s new thought','接着写…':'Continue writing…',
 '保存到当前主题':'Save to this topic','暂不加入主题':'Keep without a topic','选择主题（可不选）':'Choose a topic (optional)',
 '保存想法':'Save thought','先写下一点内容。':'Write something first.',
 '新想法先选一个主题；保存后可加入更多主题。':'Choose one topic now. You can add more after saving.',
 '已保存新想法':'New thought saved','尚未保存，文字仍在这里。可以重试或复制。':'Not saved yet. Your text is still here. Retry or copy it.',
 '复制当前文字':'Copy current text','取消':'Cancel','查看当时记录':'View source record','查看档案当前文字':'Compare with current archive',
 '发送时间未知':'Send time unknown','当时记录已不可用。':'The source record is no longer available.',
 '这条思想':'This thought','档案当前文字':'Current archive text','当前档案不可用':'Current archive unavailable',
 '保留我的修改':'Keep my changes','恢复为档案当前文字':'Restore current archive text',
 '用已展示的档案当前文字替换这条思想，并保留人工旧版？':'Replace this thought with the archive text shown here and keep the previous version?',
 '档案刚有更新，请核对后再保存。':'The archive changed. Compare again before saving.',
 '已恢复为档案当前文字，并保留旧版本。':'Current archive text restored. The previous version is kept.',
 '恢复尚未完成，请重试。':'Restore did not finish. Try again.',
 '思想库更多':'Thought Library options','添加主题':'Add topic','列表 / 网格':'List / grid','整理新增内容':'Organize new content',
 '把已有内容归成主题':'Organize existing content into topics','先留下几段表达，主题可以慢慢形成。':'Start with a few expressions. Topics can form over time.',
 '单独写下的想法':'Thoughts without a topic','布局尚未保存，已保留原值。':'Layout was not saved. The previous layout is kept.',
 '同时修改档案中的对应完整内容':'Also edit the matching whole input in the archive',
 '仅对仍与档案完整对应的内容生效；已改写、选段和 AI 稿不反向修改。':'Only applies to whole inputs still being followed. Independent edits, excerpts and AI drafts do not write back.',
 '最近阅读':'Recently read','去档案留下表达':'Open Archive','同时修改档案':'Also editing the archive',
 '已在思想库编辑':'Edited in Thought Library','档案有更新 · 查看':'Archive updated · Compare',
 '加入所选文字':'Add selected text','请先在这条思想中选择文字。':'Select text in this thought first.','编辑':'Edit','完成':'Done','内容正文':'Thought text'
};
export const thoughtCopy=text=>globalThis.document?.documentElement?.lang==='en'?(english[text]||text):text;
export function watchThoughtCopy(){
 const reverse=new Map(Object.entries(english).map(([zh,en])=>[en,zh]));
 const apply=()=>{
  // These roots contain product controls only, never topic names or body text.
  for(const root of document.querySelectorAll('#thought-home-tools,#thought-empty,#create-entry,#library-unplaced,#thought-recent h2,.reader-selection')){
   const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node;
   while(node=walker.nextNode()){const key=reverse.get(node.data)||node.data;if(Object.hasOwn(english,key))node.data=thoughtCopy(key);}
   for(const element of root.querySelectorAll('[aria-label]')){const label=element.getAttribute('aria-label'),key=reverse.get(label)||label;if(Object.hasOwn(english,key))element.setAttribute('aria-label',thoughtCopy(key));}
  }
 };
 new MutationObserver(apply).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});apply();
}
