const COPY={
"选择已有的 PAIA 备份。文件包含私人数据，仅在本机读取。":"Choose an existing PAIA backup. It contains private data and is read only on this device.","从备份恢复":"Restore from backup","恢复方式":"Restore mode","恢复到空库":"Restore to an empty library","合并互不冲突的数据":"Merge non-conflicting data","替换当前库":"Replace the current library","我了解替换会清除当前库内容":"I understand that replacement will clear the current library","取消":"Cancel","校验并预览后再确认。替换会清除当前库；合并遇到冲突时不写入。永久删除的来源无法恢复。支持最多 512 MB / 500000 项的完整分段备份，单文件最多 64 MB / 100000 项。":"Validate and preview before confirming. Replacement clears the current library; a conflicting merge writes nothing. Permanently deleted sources cannot be restored. Complete segmented backups support up to 512 MB / 500000 items; a single file supports up to 64 MB / 100000 items.",
 "请等待当前资料修改完成，再恢复备份。": "Wait for the current data change to finish before restoring.",
 "操作期间本机内容发生变化。请重新校验备份并确认当前库，原有内容保持不变。": "Local data changed during this operation. Validate the backup again and confirm the current library. Existing content is unchanged.",
 "这不是有效的 PAIA 备份，未修改任何内容。": "This is not a valid PAIA backup. No content was changed.",
 "此备份版本暂不支持，未修改任何内容。": "This backup version is not supported. No content was changed.",
 "完整性校验未通过，文件可能已损坏。": "Integrity validation failed. The file may be damaged.",
 "备份文件不完整，请重新选择完整文件。": "The backup is incomplete. Select the complete file again.",
 "本版单次恢复支持最多 512 MB / 500000 项；文件超出范围，原有内容保持不变。": "This version restores up to 512 MB / 500000 items per operation. This file exceeds the limit; existing content is unchanged.",
 "本次备份会话已中断，请重新开始。": "This backup session was interrupted. Start again.",
 "当前已有用户数据。请选择合并互不冲突的数据，或明确选择替换当前库。": "The library already contains user data. Choose to merge non-conflicting data, or explicitly replace the current library.",
 "备份与当前库存在同一来源、项目或状态冲突；未合并任何内容。请检查备份或明确选择替换。": "The backup conflicts with an existing source, project or state. Nothing was merged. Check the backup or explicitly choose replacement.",
 "此备份包含本机已永久删除的来源，不能恢复。永久删除标记优先。": "This backup contains sources permanently deleted on this device and cannot be restored. Permanent-deletion markers take precedence.",
 "请先查看预览并明确确认恢复。": "Review the preview and explicitly confirm restoration first.",
 "本机存储空间不足，原有内容保持不变。": "Local storage is full. Existing content is unchanged.",
 "本机保存未完成，请重新打开 Settings 检查。": "Local saving did not finish. Reopen Settings to check.",
 "操作未完成，未自动重试。请重新选择备份文件。": "The operation did not finish and was not retried automatically. Select the backup file again.",
 "正在本机校验备份…": "Validating the backup locally…",
 "确认替换当前库": "Confirm replacement",
 "确认合并到当前库": "Confirm merge",
 "确认恢复到空库": "Confirm restore to an empty library",
 "完整性校验通过。替换会清除当前库内容；本机永久删除标记和捕获授权保留。请勾选确认。": "Integrity validation passed. Replacement will clear the current library; local permanent-deletion markers and capture consent are retained. Check the confirmation box.",
 "完整性校验通过。只合并无冲突的数据，当前设置与现有内容保留。": "Integrity validation passed. Only non-conflicting data will be merged; current settings and existing content are retained.",
 "完整性校验通过。确认后将在本机恢复，捕获授权保持当前设置。": "Integrity validation passed. Confirmation restores locally; capture consent keeps its current setting.",
 "请核对备份信息并确认所选恢复方式。": "Check the backup details and confirm the selected restore mode.",
 "校验通过，当前库不满足所选恢复方式的安全条件。": "Validation passed, but the current library does not meet the safety requirements for this restore mode.",
 "正在恢复，请保持本页打开…": "Restoring. Keep this page open…",
 "恢复已完成。内容与版本已保存到本机；本地搜索索引正在更新。": "Restore completed. Content and revisions are saved locally; the local search index is updating."
};
export function backupText(value,english=document.documentElement.lang==='en'){if(!english)return value;if(COPY[value])return COPY[value];let m;if((m=/^正在校验 · (\d+) 项$/.exec(value)))return `Validating · ${m[1]} items`;if((m=/^(\d+) 条 Input · (\d+) 个 Topic · (\d+) 条思想内容 · (\d+) 个版本$/.exec(value)))return `${m[1]} Inputs · ${m[2]} Topics · ${m[3]} entries · ${m[4]} revisions`;if(value.startsWith('备份日期：'))return 'Backup date: '+value.slice(5);return value.replace(' · 备份格式 ',' · backup format ');}
export function setBackupCopy(node,value){node.dataset.backupCopy=value;node.textContent=backupText(value);return node;}
export function refreshBackupCopy(host){for(const node of host.querySelectorAll('[data-backup-copy]'))node.textContent=backupText(node.dataset.backupCopy);}
