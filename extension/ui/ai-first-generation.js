import {element} from './common.js';

export function firstAIGenerationPanel({topicName,onGenerate}){
 const root=element('section','ai-first-generation');root.dataset.aiFirstGeneration='true';
 root.append(element('h2','','生成 AI整理'),element('p','',`原话保持可读。只整理“${topicName}”。开始前会核对实际可用材料、排除项和本次批次。`),element('p','muted','确认后才会把本次有限材料交给 DeepSeek。切换视图和读取已有整理不会调用模型。'));
 const button=element('button','','生成 AI整理');button.type='button';button.addEventListener('click',()=>void onGenerate());root.append(button);return root;
}
