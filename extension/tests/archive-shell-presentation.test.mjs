import test from 'node:test';
import assert from 'node:assert/strict';

class Node {
 constructor(id=''){this.id=id;this.children=[];this.parentElement=null;this.dataset={};this.hidden=false;this.open=false;this.value='';this.handlers=[];}
 append(...nodes){for(const node of nodes){if(node.parentElement)node.parentElement.children.splice(node.parentElement.children.indexOf(node),1);if(node.contains(document.activeElement))document.activeElement=null;node.parentElement=this;this.children.push(node);}}
 prepend(...nodes){this.append(...nodes);this.children=[...nodes,...this.children.filter(node=>!nodes.includes(node))];}
 insertBefore(node,next){this.append(node);if(next){this.children.pop();this.children.splice(this.children.indexOf(next),0,node);}}
 get nextSibling(){return this.parentElement?.children[this.parentElement.children.indexOf(this)+1]||null;}
 contains(node){return this===node||this.children.some(child=>child.contains(node));}
 get isConnected(){return this===document.body||this.parentElement?.isConnected===true;}
 getClientRects(){for(let node=this;node;node=node.parentElement)if(node.hidden)return [];return [{}];}
 setAttribute(key,value){this[key]=value;}
 addEventListener(type,handler){this.handlers.push([type,handler]);}
 focus(){if(this.getClientRects().length)document.activeElement=this;}
 querySelector(selector){return this.children.find(node=>'.'+node.className===selector)||null;}
}
async function fixture(run){
 const prior=new Map(['document','chrome'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 const body=new Node('body'),nodes=new Map(),make=id=>{const node=new Node(id);nodes.set(id,node);body.append(node);return node;};
 body.classList={toggle(){}};
 globalThis.document={body,documentElement:{lang:'zh-CN'},activeElement:null,createElement:()=>new Node(),addEventListener(){},getElementById:id=>nodes.get(id)};
 globalThis.chrome={runtime:{sendMessage(){throw Error('Presentation must not issue data or authorization requests');}}};
 try{
  const {AppShellController}=await import('../ui/app-shell.js');
  const home=make('header'),nav=make('primary-nav'),bottom=make('sidebar-bottom');
  make('archive-root-heading');make('thought-root-heading');home.append(make('workspace-heading'));
  document.querySelector=selector=>selector==='.workspace-header'?home:null;document.querySelectorAll=selector=>selector==='[data-view]'?[...nav.children,...bottom.children,...(nodes.get('archive-compact-nav-items')?.children||[])]:[];
  for(const id of ['archive-root-main','archive-root-header','archive-reader-navigator-slot','archive-root-navigator-slot','archive-root-header-actions','archive-reader-search-slot','archive-reader-back-slot','reader-search-slot','reader-compact-tools','reader-heading-actions','reader-status-slot','archive-root-tools','archive-compact-nav-items','archive-compact-reader-actions'])make(id);
  nodes.get('archive-root-main').append(nodes.get('archive-root-header'),nodes.get('archive-root-tools'),nodes.get('archive-root-navigator-slot'));nodes.get('archive-root-header').append(nodes.get('archive-root-heading'),nodes.get('archive-root-header-actions'));nodes.get('archive-reader-navigator-slot').append(nodes.get('archive-reader-search-slot'));nodes.get('reader-compact-tools').append(nodes.get('archive-reader-back-slot'));
  const controls=['scope-search-host','back','archive-navigator-toggle','input-time-order','document-menu','save-status'];for(const id of controls)home.append(make(id));
  const search=make('scope-search');search.value='SYNTHETIC 还没有结束的查询';nodes.get('scope-search-host').append(search);
  const overflow=make('archive-root-overflow'),actions=make('overflow-actions');actions.className='archive-root-overflow-actions';overflow.append(actions);nodes.get('archive-root-tools').append(make('archive-source-scope-label'));
  const buttons=['library','thoughts','memory','settings'].map(id=>make('nav-'+id));buttons.slice(0,3).forEach(node=>nav.append(node));bottom.append(buttons[3]);buttons.forEach(node=>node.addEventListener('click',()=>{}));
  const owner=Object.assign(Object.create(AppShellController.prototype),{mounted:true,route:{view:'library'},archiveControlHomes:new Map(controls.map(id=>[id,home])),archiveNavHomes:buttons.map(node=>({node,parent:node.parentElement})),archiveDesktop:{matches:true},archiveCompact:{matches:false},archiveCompactMenu:make('compact-details'),localize(){},archiveHeaderOrder:[...home.children]});
  await run({owner,nodes,home,nav,bottom,buttons,search,actions});
 }finally{for(const [key,value]of prior)if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key];}
}
test('Archive root keeps the same search and source controls in its quiet header disclosure',()=>fixture(({owner,nodes,search,actions})=>{
 owner.presentArchiveComposition({consented:true});
 assert.equal(nodes.get('scope-search-host').parentElement,nodes.get('archive-root-header-actions'));
 assert.equal(nodes.get('archive-source-scope-label').parentElement,actions);
 assert.equal(nodes.get('scope-search-host').children[0],search);assert.equal(search.value,'SYNTHETIC 还没有结束的查询');
}));
test('Reader selection preserves the directory search identity, text and focus in its original header',()=>fixture(({owner,nodes,search})=>{
 owner.route={view:'library',documentId:'synthetic-document'};search.focus();owner.presentArchiveComposition({consented:true});
 assert.equal(nodes.get('scope-search-host').parentElement,nodes.get('archive-root-header-actions'));
 assert.equal(nodes.get('document-menu').parentElement,nodes.get('reader-heading-actions'));
 owner.archiveDesktop.matches=false;owner.presentArchiveComposition();
 assert.equal(nodes.get('scope-search-host').parentElement,nodes.get('archive-root-header-actions'));
 assert.equal(document.activeElement,search);assert.equal(search.value,'SYNTHETIC 还没有结束的查询');
 assert.equal(nodes.get('back').parentElement,nodes.get('archive-reader-back-slot'));
}));
test('Compact navigation reuses all buttons and restores each original owner on another route',()=>fixture(({owner,nodes,nav,bottom,buttons,home})=>{
 owner.archiveCompact.matches=true;owner.presentArchiveComposition({consented:true});owner.archiveCompactMenu.open=true;
 assert.deepEqual(nodes.get('archive-compact-nav-items').children,[...buttons,nodes.get('archive-compact-reader-actions')]);
 owner.route={view:'thoughts'};owner.presentArchiveComposition();
 assert.deepEqual(nodes.get('archive-compact-nav-items').children,[...buttons,nodes.get('archive-compact-reader-actions')]);assert.equal(owner.archiveCompactMenu.hidden,false);assert.equal(owner.archiveCompactMenu.open,false);
 owner.route={view:'settings'};owner.presentArchiveComposition();
 assert.deepEqual(nodes.get('archive-compact-nav-items').children,[...buttons,nodes.get('archive-compact-reader-actions')]);assert.equal(owner.archiveCompactMenu.hidden,false);assert.equal(owner.archiveCompactMenu.open,false);
 owner.route={view:'legacy'};owner.presentArchiveComposition();
 assert.deepEqual(nav.children,buttons.slice(0,3));assert.deepEqual(bottom.children,[buttons[3]]);
 assert.equal(owner.archiveCompactMenu.open,false);assert.equal(owner.archiveCompactMenu.hidden,true);
 assert.equal(nodes.get('scope-search-host').parentElement,home);assert.equal(nodes.get('save-status').parentElement,home);
 for(const node of buttons)assert.equal(node.handlers.length,1);
}));
test('Phone Reader discloses the same window, sort and menu controls after primary navigation',()=>fixture(({owner,nodes,buttons})=>{
 owner.route={view:'library',documentId:'synthetic-document'};owner.archiveDesktop.matches=false;owner.archiveCompact.matches=true;owner.presentArchiveComposition({consented:true});
 const actions=nodes.get('archive-compact-reader-actions'),controls=['archive-navigator-toggle','input-time-order','document-menu'].map(id=>nodes.get(id));
 assert.deepEqual(actions.children,controls);assert.equal(actions.hidden,false);assert.deepEqual(nodes.get('reader-compact-tools').children,[nodes.get('archive-reader-back-slot')]);assert.deepEqual(nodes.get('archive-reader-back-slot').children,[nodes.get('back')]);assert.deepEqual(nodes.get('reader-heading-actions').children,[]);
 assert.deepEqual(nodes.get('archive-compact-nav-items').children,[...buttons,actions]);controls[2].focus();
 owner.archiveCompact.matches=false;owner.presentArchiveComposition();assert.equal(document.activeElement,controls[2]);assert.deepEqual(nodes.get('reader-heading-actions').children,controls.slice(1));assert.equal(actions.hidden,true);
}));
test('Desktop to phone exposes a moved focused action before restoring its native focus',()=>fixture(({owner,nodes})=>{
 owner.route={view:'library',documentId:'synthetic-document'};owner.presentArchiveComposition({consented:true});const menu=nodes.get('document-menu');menu.focus();
 owner.archiveDesktop.matches=false;owner.archiveCompact.matches=true;owner.presentArchiveComposition();
 assert.equal(nodes.get('archive-compact-reader-actions').hidden,false);assert.equal(owner.archiveCompactMenu.hidden,false);assert.equal(owner.archiveCompactMenu.open,true);assert.equal(document.activeElement,menu);
}));
test('Fixed Back stays focused and completion guards respect hidden targets, newer focus and routes',()=>fixture(({owner,nodes,search})=>{
 owner.route={view:'library',documentId:'synthetic-document'};owner.presentArchiveComposition({consented:true});const back=nodes.get('back'),slot=nodes.get('archive-reader-back-slot'),route=owner.route;back.focus();
 owner.archiveDesktop.matches=false;owner.archiveCompact.matches=true;const restore=owner.presentArchiveComposition();assert.equal(back.parentElement,slot);assert.equal(document.activeElement,back);assert.equal(owner.archiveCompactMenu.open,false);
 search.focus();restore();assert.equal(document.activeElement,search,'new live control has priority');document.activeElement=null;owner.route={view:'library',documentId:'newer'};restore();assert.equal(document.activeElement,null,'new route has priority');
 owner.route=route;back.hidden=true;restore();assert.equal(document.activeElement,null,'hidden target cannot receive focus');back.hidden=false;restore();assert.equal(document.activeElement,back);
}));
test('Desktop to compact Reader preserves Back before the same navigator control and retains focus',()=>fixture(({owner,nodes})=>{
 owner.route={view:'library',documentId:'synthetic-document'};owner.presentArchiveComposition({consented:true});
 const back=nodes.get('back'),toggle=nodes.get('archive-navigator-toggle'),tools=nodes.get('reader-compact-tools');
 assert.deepEqual(tools.children,[nodes.get('archive-reader-back-slot'),toggle]);back.focus();
 for(let i=0;i<3;i++){
  owner.archiveDesktop.matches=false;owner.presentArchiveComposition();assert.deepEqual(tools.children,[nodes.get('archive-reader-back-slot')]);assert.deepEqual(nodes.get('archive-reader-back-slot').children,[back,toggle]);assert.equal(document.activeElement,back);
  owner.archiveDesktop.matches=true;owner.presentArchiveComposition();assert.deepEqual(tools.children,[nodes.get('archive-reader-back-slot'),toggle]);assert.equal(document.activeElement,back);
 }
}));
test('Repeated route and width presentation never duplicates controls or acquires data access',()=>fixture(({owner,nodes,buttons,home})=>{
 for(let i=0;i<6;i++){owner.route={view:'library',documentId:i%2?'synthetic-document':null};owner.archiveDesktop.matches=i%3===0;owner.archiveCompact.matches=i%3===1;owner.presentArchiveComposition({consented:true});}
 owner.presentArchiveComposition({consented:false});
 for(const [id]of owner.archiveControlHomes)assert.equal(nodes.get(id).parentElement,home);
 assert.equal(new Set([...nodes.values()].flatMap(node=>node.children)).size,[...nodes.values()].reduce((n,node)=>n+node.children.length,0));
 for(const node of buttons)assert.equal(node.handlers.length,1);
}));

test('A complete accepted root render retains focus inside the open source disclosure',()=>fixture(({owner,nodes})=>{
 owner.present({view:'library'},{consented:true});
 const source=nodes.get('archive-source-scope-label');source.focus();nodes.get('archive-root-overflow').open=true;
 owner.present({view:'library'},{consented:true});
 assert.equal(document.activeElement,source);assert.equal(nodes.get('archive-root-overflow').open,true);
}));
test('Reader return preserves original header sibling ordering around retained controls',()=>fixture(({owner,nodes,home})=>{
 const retained=new Node('retained-topic-search');home.insertBefore(retained,nodes.get('input-time-order'));owner.archiveHeaderOrder=[...home.children];const before=[...home.children];
 owner.route={view:'library',documentId:'synthetic-document'};owner.presentArchiveComposition({consented:true});
 owner.route={view:'thoughts',topicId:'synthetic-topic'};owner.presentArchiveComposition();
 assert.deepEqual(home.children,before);
}));


test('Display-only Context uses the same compact primary menu and restores existing desktop parents',()=>fixture(({owner,nodes,buttons,nav,bottom})=>{
 owner.route={view:'memory'};owner.archiveCompact.matches=true;owner.presentArchiveComposition({consented:true});assert.equal(owner.archiveCompactMenu.hidden,false);assert.deepEqual(nodes.get('archive-compact-nav-items').children,[...buttons,nodes.get('archive-compact-reader-actions')]);assert.equal(nodes.get('archive-compact-reader-actions').hidden,true);
 owner.archiveCompact.matches=false;owner.presentArchiveComposition();assert.equal(owner.archiveCompactMenu.hidden,true);assert.equal(owner.archiveCompactMenu.open,false);for(const row of owner.archiveNavHomes)assert.equal(row.node.parentElement,row.parent);
}));


test('Selecting and closing Reader never transiently reparents the directory header or tools',()=>fixture(({owner,nodes})=>{
 owner.present({view:'library'},{consented:true});const slot=nodes.get('archive-reader-navigator-slot'),heading=nodes.get('workspace-heading'),headingHome=heading.parentElement,header=nodes.get('archive-root-header'),tools=nodes.get('archive-root-tools'),order=[...slot.children],insert=slot.insertBefore.bind(slot);let changed=0;slot.insertBefore=(node,before)=>{if([header,tools].includes(node))changed++;return insert(node,before);};
 for(const documentId of ['first','second',null,'first']){owner.present({view:'library',documentId},{consented:true});assert.deepEqual(slot.children,order);assert.equal(heading.parentElement,headingHome);}
 assert.equal(changed,0);assert.equal(nodes.get('archive-reader-back-slot').parentElement,nodes.get('reader-compact-tools'));
}));
