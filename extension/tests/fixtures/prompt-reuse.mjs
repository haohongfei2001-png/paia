// Fixed synthetic cases. False merges are a hard failure, not averaged away.
export const pairs=[
 ['Chinese exact','总结这段文字并保留否定。','总结这段文字并保留否定。',true],
 ['English exact','Explain the tradeoffs.','Explain the tradeoffs.',true],
 ['NFC','解释 cafe\u0301 的含义','解释 café 的含义',true],
 ['outer whitespace',' 解释这个算法 ','解释这个算法',true],
 ['polite English','Please explain this algorithm','explain this algorithm',true],
 ['polite Chinese','请解释这个算法','解释这个算法',true],
 ['negation','请解释但不要修改代码','请解释并修改代码',false],
 ['English negation','Do not remove comments','Do remove comments',false],
 ['constraint','Summarize in 3 points','Summarize in 5 points',false],
 ['target','Translate into Chinese','Translate into English',false],
 ['uncertain paraphrase','帮我找出文章中的问题','帮我改好这篇文章',false],
 ['near but different','请解释安全问题','请解决安全问题',false],
 ['code indent','if ready:\n  act()','if ready:\n    act()',false],
 ['code case','const Mode = 1;','const mode = 1;',false],
 ['multiline','解释以下步骤\n保留细节','解释以下步骤\r\n保留细节',true],
 ['article payload','总结以下文章：\n'+'虚构正文甲。'.repeat(100),'总结以下文章：\n'+'虚构正文乙。'.repeat(100),true],
 ['English payload','Summarize the following article:\n'+'Synthetic paragraph A. '.repeat(60),'Summarize the following article:\n'+'Synthetic paragraph B. '.repeat(60),true],
 ['code payload','Review the following code:\n'+'const a = 1;\n'.repeat(60),'Review the following code:\n'+'const b = 2;\n'.repeat(60),true],
 ['unknown long payload','看看这个\n'+'甲'.repeat(500),'看看这个\n'+'乙'.repeat(500),false],
 ['long constraint','检查细节\n'+'内容'.repeat(500)+'不要删除','检查细节\n'+'内容'.repeat(500)+'请删除',false]
];
export const sample=(id,text,conversation='chat-'+id,at=Date.UTC(2026,9,4))=>({id,text,conversation,at,role:'user',eligible:true});
