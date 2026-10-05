import {mountIcon,setIconLabel,setIconOnly} from './icons.js';

// Static controls only. Re-rendered labels are owned by their existing page modules.
mountIcon(document.querySelector('.thought-search-icon'),'search');
setIconOnly(document.querySelector('#topic-time-jumps > summary'),'more');
for(const id of ['library-dialog-close','review-dialog-close','close-info','close-revisions','history-close','filter-recent-close']){
 const button=document.getElementById(id);setIconLabel(button,'close',button.textContent);
}
for(const selector of ['#settings-branch-review','#manage-excluded','#legacy-entry','#settings-panel > button[data-view="archive"]']){
 const button=document.querySelector(selector);setIconLabel(button,'chevron-right',button.textContent.replace(/\s*›$/, ''),{side:'end'});
}
