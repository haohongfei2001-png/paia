import {syncAvailability} from '../core/browser-native-sync/availability.js';

// Settings renders the Sync owner's actual build availability. There is no
// fake enable switch and opening this detail cannot start local recovery.
export function mountSettingsSync({mountDetail,language=()=>document.documentElement.lang}={}){
 const content=document.createElement('section'),status=document.createElement('p'),scope=document.createElement('p');
 content.className='ux-settings-sync-content';status.id='settings-sync-state';status.setAttribute('role','status');scope.id='settings-sync-scope';content.append(status,scope);
 const detail=mountDetail({id:'settings-sync',title:['同步','Sync'],content,language,value:zh=>zh?'尚未启用':'Not enabled'});
 const originalSync=detail.sync;
 const sync=()=>{const value=syncAvailability(),zh=language()==='zh-CN';originalSync();content.dataset.syncState=value.state;status.textContent=zh?'此版本尚未提供云端同步。':'Cloud sync is not available in this version.';scope.textContent=zh?'你的内容仍保存在此设备。打开此页面不会登录账号、上传内容或更改已有数据。':'Your content stays on this device. Opening this page does not sign in, upload content or change existing data.';};
 detail.sync=sync;sync();return detail;
}
