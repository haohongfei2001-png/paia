import { sanitizeStructure } from '../core/diagnostics.js';

const yesNo = value => value ? '是' : '否';
const NO_STRUCTURE = '暂无结构诊断。启用后请刷新目标 ChatGPT 标签页，等待约 5 秒。未同意、暂停、临时聊天或聊天身份不明时不会探测消息结构。';

function timeLines(structureAt, now) {
  const at = typeof structureAt === 'string' ? Date.parse(structureAt) : NaN;
  if (!Number.isFinite(at)) return ['收集时间：尚无有效时间', '时效：未知，不能据此判断当前页面'];
  const timestamp = new Date(at).toISOString();
  const age = now - at;
  const freshness = !Number.isFinite(age) || age < 0 ? '时间异常，不能据此判断当前页面'
    : age > 60000 ? '已过期，请刷新目标 ChatGPT 标签页后再查看' : '最近一分钟内；仅代表最近一次上报';
  return [`收集时间：${timestamp}`, `时效：${freshness}`];
}

export function briefStructure(value, structureAt, now = Date.now()) {
  const structure = sanitizeStructure(value);
  if (!structure) return '结构概览：暂无；打开档案查看说明。';
  const at = typeof structureAt === 'string' ? Date.parse(structureAt) : NaN;
  const fresh = Number.isFinite(at) && Number.isFinite(now) && now >= at && now - at <= 60000;
  return `结构概览：user role ${structure.userRoleCount}，可见 ${structure.visibleUserRoleCount}，合法 turn ${structure.validTurnCount}，role 合法 ID ${structure.roleIdValidCount}，通过 editor 检查 ${structure.editorPassedCount}，最终候选 ${structure.finalCandidateCount}。${fresh ? '' : '非当前状态；'}打开档案查看完整结构诊断。`;
}

export function formatStructure(value, structureAt, now = Date.now()) {
  // Only the projected count/boolean fields below can reach the feedback text.
  // Never stringify the incoming value or render field names supplied by it.
  const structure = sanitizeStructure(value);
  if (!structure) return NO_STRUCTURE;
  const lines = [
    '结构诊断 schema 1',
    ...timeLines(structureAt, now),
    `main：存在=${yesNo(structure.mainPresent)}；可见=${yesNo(structure.mainVisible)}；忙碌=${yesNo(structure.mainBusy)}`,
    `user role 节点：总数=${structure.userRoleCount}；可见=${structure.visibleUserRoleCount}`,
    `turn：合法 article turn=${structure.validTurnCount}；有 turn 标记祖先=${structure.turnMarkerCount}`,
    `message id：role 有属性=${structure.roleIdPresentCount}；role 格式合法=${structure.roleIdValidCount}；祖先有合法 ID=${structure.ancestorIdCount}；后代有合法 ID=${structure.descendantIdCount}`,
    `检查通过：editor=${structure.editorPassedCount}；非忙碌=${structure.busyPassedCount}`,
    `最终候选数量：${structure.finalCandidateCount}`,
    `逐节点明细：${structure.rows.length} 行；最多 20 行；已截断=${yesNo(structure.rowsTruncated)}`,
    '下列序号仅是本次可见 user role 节点顺序，不是消息 ID。总数不受明细 20 行上限影响。'
  ];
  for (const [index, row] of structure.rows.entries()) {
    const editorScope = row.turnFound ? 'turn 内' : row.editorCheckAvailable ? 'user role 子树内' : '未确认范围内';
    lines.push(
      '',
      `节点 ${index + 1}`,
      `  turn：合法=${yesNo(row.turnFound)}；标记祖先=${yesNo(row.turnMarkerFound)}；article 祖先=${yesNo(row.articleFound)}`,
      `  ID：role 有属性=${yesNo(row.idAttributeOnRole)}；role 合法=${yesNo(row.idOnRole)}；祖先合法=${yesNo(row.idOnAncestor)}；后代合法=${yesNo(row.idOnDescendant)}`,
      `  editor：可检查=${yesNo(row.editorCheckAvailable)}；位于编辑区域=${yesNo(row.rootInsideEditor)}；自身可编辑=${yesNo(row.rootIsContentEditable)}；检查通过=${yesNo(row.editorPassed)}`,
      `  ${editorScope}可见编辑控件：总数=${row.visibleEditorsInTurn}；input=${row.visibleInputsInTurn}；textarea=${row.visibleTextareasInTurn}；contenteditable=${row.visibleEditablesInTurn}；textbox=${row.visibleTextboxesInTurn}`,
      `  忙碌=${yesNo(row.busy)}；role 自身匹配正文选择器=${yesNo(row.roleMatchesTextSelector)}`,
      `  正文容器：选择器匹配=${row.textMatches}；归属本 role=${row.ownedTextMatches}；可见=${row.visibleTextMatches}；不安全祖先=${row.unsafeAncestorMatches}；不安全后代=${row.unsafeDescendantMatches}；安全容器=${row.safeTextMatches}`,
      `  结果：成为候选=${yesNo(row.candidateAccepted)}；重复身份=${yesNo(row.duplicateIdentity)}；身份已变化=${yesNo(row.staleIdentity)}`
    );
  }
  return lines.join('\n');
}
