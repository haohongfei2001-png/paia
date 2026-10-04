import {element} from './common.js';

// Presentation only: retain the native dialog, exact controls and every
// TopicActions callback. Main-workspace navigation remains a separate cut.
export function presentThoughtCompose({dialog,content,draft,destination,choices,submit,copy,cancel}){
 dialog.dataset.actionSurface='compose';
 content.children[0].classList.add('thought-compose-intro');
 destination.classList.add('thought-compose-destination');choices.classList.add('thought-compose-topics');
 content.insertBefore(destination,draft);content.insertBefore(choices,draft);
 const actions=element('div','thought-compose-actions');submit.classList.add('thought-compose-save');copy.classList.add('thought-compose-copy');
 actions.append(submit,cancel,copy);content.append(actions);
}
