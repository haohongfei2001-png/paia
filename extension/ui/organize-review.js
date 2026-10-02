import {element,statusLabel} from './common.js';

export function organizeScopeReview(scope){
 const panel=element('section','organize-scope-review');panel.dataset.organizeScope='true';panel.dataset.scopeBinding=scope.scopeBinding;
 panel.append(element('p','',`“${scope.topicName}” · ${scope.provider} / ${scope.model}`));
 panel.append(element('p','',`主题共有 ${scope.intendedCount} 段材料：${scope.eligibleCount} 段可用，${scope.excludedCount} 段已排除，${scope.unavailableCount} 段暂不可核对。`));
 panel.append(element('p','',`本次发送 ${scope.batchCount} 段；另有 ${scope.remainingCount} 段待后续明确确认。新材料 ${scope.newCount} 段，修改 ${scope.changedCount} 段，移除 ${scope.removedCount} 段。`));
 const time=scope.timeRange;panel.append(element('p','',time.from?`有可靠表达日期的范围：${time.from.slice(0,10)} 至 ${time.to.slice(0,10)}；${time.unknownCount} 段日期未知。`:`表达日期未知：${time.unknownCount} 段，不使用收录时间代替。`));
 panel.append(element('p','muted',`最多 ${scope.maxRequests} 次请求 · 材料 ${scope.contentBytes} 字节 · 请求约 ${scope.requestBytes} 字节。${scope.remainingCount?'本次只处理一个有限批次，不代表整个主题已整理。':''}`));
 panel.append(element('p','muted',`今日已用 ${scope.budget.usedRequests} / ${scope.budget.dailyLimit} 次；剩余 ${scope.budget.remainingRequests} 次。提供方可能计费，本页不估算金额。`));
 panel.append(element('p','muted','确认后才发送本次材料；已有整理作为上下文时也会交给该提供方。结果只形成候选，原话和当前稿不会自动改变。后续批次与付费重试都需要重新确认。'));
 if(scope.blockedReason)panel.append(element('p','organize-scope-blocked',scope.blockedReason==='NO_DELTA'?'目前没有待整理的新变化。':`本次尚不能开始：${statusLabel(scope.blockedReason)}。没有发送请求。`));
 return panel;
}
