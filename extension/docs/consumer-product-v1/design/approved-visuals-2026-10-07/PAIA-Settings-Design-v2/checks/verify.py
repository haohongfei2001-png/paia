from pathlib import Path
from playwright.sync_api import sync_playwright
import json, itertools, urllib.parse, time, traceback
ROOT=Path(__file__).resolve().parents[1]
HTML=(ROOT/'Prototype.html').read_text()
results={'kind':'independent-design-prototype-only','production_certification':False,'layout':[],'interaction':[],'page_errors':[],'negative_history':['Browser file URL was blocked by environment policy; independent HTML was loaded using set_content, without modifying product code.','Prototype consent failure rollback, position-reset focus return and initial choice focus were corrected before the final run. First complete run: 144/144 layout; 40/41 interaction. The initial-choice keyboard test failed; fixed by focusing the selected option.'],'limitations':['No installed PAIA or personal database accessed','No production persistence, migration, permissions, live-site insertion, physical IME or screen-reader certification','In-memory demo outcomes are not backend or service evidence']}
G=['capture','reading','ai','privacy','data','about'];counts=dict(zip(G,[2,5,2,2,5,4]))
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 results['browser']=b.version
 def page(q='',width=1440,scale=1,theme='light',coarse=False):
  ctx=b.new_context(viewport={'width':width,'height':900},has_touch=coarse,is_mobile=False,color_scheme=theme)
  pg=ctx.new_page();pg.on('pageerror',lambda e:results['page_errors'].append(str(e)))
  query=q+'&text='+('200' if scale==2 else '100')+'&theme='+theme
  pg.set_content(HTML.replace('new URLSearchParams(location.search)','new URLSearchParams('+json.dumps(query)+')'))
  pg.wait_for_timeout(25)
  return pg
 for g,w,t,sc in itertools.product(G,[320,390,768,1024,1280,1440],['light','dark'],[1,2]):
  pg=page('group='+g,w,sc,t)
  d=pg.evaluate('''()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,rows:document.querySelectorAll('#group-content .setting-row').length,offscreen:[...document.querySelectorAll('#group-content button,#group-content .row-label,#group-content .row-hint')].filter(e=>e.getClientRects().length).filter(e=>{const r=e.getBoundingClientRect();return r.left<-.5||r.right>innerWidth+.5}).map(e=>e.textContent.trim()),overlap:[...document.querySelectorAll('.setting-row')].filter(e=>{const a=e.querySelector('.row-copy'),b=e.querySelector('.row-end,.switch');if(!a||!b)return false;const x=a.getBoundingClientRect(),y=b.getBoundingClientRect();return Math.min(x.right,y.right)-Math.max(x.left,y.left)>.5&&Math.min(x.bottom,y.bottom)-Math.max(x.top,y.top)>.5}).map(e=>e.textContent.trim())})''')
  ok=d['scroll']<=w+1 and d['rows']==counts[g] and not d['offscreen'] and not d['overlap']
  results['layout'].append({'group':g,'width':w,'theme':t,'text':sc,'pass':ok,'details':d})
  pg.context.close()
 def check(name,func):
  try: func();results['interaction'].append({'name':name,'pass':True})
  except Exception as e: results['interaction'].append({'name':name,'pass':False,'error':str(e)});print('FAILED',name,str(e)[:300])
 def test(name,q,fn,w=1440):
  pg=page(q,w)
  def run():fn(pg)
  check(name,run);pg.context.close()
 def eq(pg,js,expected):
  v=pg.evaluate(js)
  assert v==expected, (v,expected)
 def clk(pg,a):pg.locator('[data-action="'+a+'"]').filter(visible=True).first.click()
 def group_rows(pg):
  eq(pg,"Object.keys(prototype.state).includes('timeEmphasis')",False)
  assert not pg.locator('#group-content [data-action="versions"]').count()
  assert not pg.locator('#group-content [data-action="purge"]').count()
 test('No Settings history or general purge','group=data',group_rows)
 def privacy(pg):
  eq(pg,"document.querySelectorAll('#group-content .setting-row').length",2)
  assert not pg.locator('#group-content [data-action="route:context"]').count()
  assert '数据存储' not in pg.locator('#group-content').inner_text()
 test('Single Context entrance; storage fact is prose','group=privacy',privacy)
 def context(pg):
  clk(pg,'route:context');assert pg.locator('#boundary-heading').inner_text()=='AI 上下文';assert not pg.locator('#boundary [role=switch]').count();clk(pg,'return-from-boundary');assert pg.locator('#group-heading').inner_text()=='AI 与提示词'
 test('Context route boundary and return','group=ai',context)
 def unavailable(pg):
  assert '暂不可用' in pg.locator('#group-content').inner_text();assert not pg.locator('#toggle-suggest').count();pg.evaluate("prototype.handle('confirm-suggest')");eq(pg,'prototype.state.suggest',False)
 test('Dependency-unavailable cannot enable suggestions','group=ai&case=capability-unavailable',unavailable)
 def connected(pg):assert '已连接 2 个 AI' in pg.locator('#group-content').inner_text()
 test('Synthetic connected-state label','group=ai&case=connected',connected)
 def sug(pg):
  eq(pg,'prototype.state.suggest',False);clk(pg,'toggle:suggest');eq(pg,'prototype.state.suggest',False);assert pg.locator('#sheet').is_visible();clk(pg,'confirm-suggest');eq(pg,'prototype.state.suggest',True);pg.wait_for_timeout(40);assert pg.locator('#toggle-suggest').evaluate('(e)=>e===document.activeElement');clk(pg,'toggle:suggest');eq(pg,'prototype.state.suggest',False);eq(pg,'prototype.state.capture',True)
 test('Suggestions explicit opt-in; off leaves capture unchanged','group=ai',sug)
 def sug_cancel(pg):clk(pg,'toggle:suggest');pg.keyboard.press('Escape');eq(pg,'prototype.state.suggest',False)
 test('Cancelling suggestion permission does not enable','group=ai',sug_cancel)
 def sugfail(pg):
  pg.evaluate('prototype.state.failNext=true');clk(pg,'toggle:suggest');clk(pg,'confirm-suggest');eq(pg,'prototype.state.suggest',False);assert '未保存' in pg.locator('#notice').inner_text()
 test('Suggestion write-failure rollback in demo','group=ai',sugfail)
 def independence(pg):
  pg.evaluate("prototype.state.suggest=true;prototype.setGroup('capture',false)");clk(pg,'toggle:capture');eq(pg,'prototype.state.suggest',True);eq(pg,'prototype.state.capture',False)
 test('Capture pause independent from suggestions','group=ai',independence)
 def capture(pg):
  clk(pg,'toggle:capture');eq(pg,'prototype.state.capture',False);eq(pg,'prototype.state.consent',False);clk(pg,'confirm-capture');eq(pg,'prototype.state.capture',True);eq(pg,'prototype.state.consent',True)
 test('First-use capture requires explicit agreement','group=capture&case=first-use',capture)
 def capturefail(pg):
  pg.evaluate('prototype.state.failNext=true');clk(pg,'toggle:capture');clk(pg,'confirm-capture');eq(pg,'prototype.state.capture',False);eq(pg,'prototype.state.consent',False)
 test('Failed first-use acknowledgement keeps consent off','group=capture&case=first-use',capturefail)
 def filter_ind(pg):
  before=pg.evaluate('[prototype.state.capture,prototype.state.removed,prototype.state.access]');clk(pg,'toggle:filter');eq(pg,'prototype.state.filter',False);eq(pg,'[prototype.state.capture,prototype.state.removed,prototype.state.access]',before)
 test('Filter affects neither saving nor removals/access','group=capture',filter_ind)
 def filterfail(pg):clk(pg,'toggle:filter');eq(pg,'prototype.state.filter',True)
 test('Filter failed write keeps prior selection','group=capture&case=save-failure',filterfail)
 for key,value in [('font','small'),('font','standard'),('font','large'),('font','xlarge'),('width','narrow'),('width','standard'),('width','wide'),('time','standard'),('time','detailed')]:
  def pref(pg,k=key,v=value):
   clk(pg,'pref:'+k);clk(pg,'choose:'+k+':'+v);eq(pg,'prototype.state.'+k,v);pg.wait_for_timeout(35);assert pg.locator('#pref-'+k).evaluate('(e)=>e===document.activeElement')
  test('Select '+key+'='+value,'group=reading',pref)
 def size(pg):
  clk(pg,'pref:font');clk(pg,'choose:font:xlarge');eq(pg,"getComputedStyle(document.querySelector('.preview-prose')).fontSize",'21px')
 test('Existing 21px size retained','group=reading',size)
 def preffail(pg):clk(pg,'pref:width');clk(pg,'choose:width:wide');eq(pg,'prototype.state.width','standard')
 test('Failed preference write retains original','group=reading&case=save-failure',preffail)
 def language(pg):clk(pg,'pref:language');clk(pg,'choose:language:en');assert pg.locator('#group-heading').inner_text()=='Reading & appearance';eq(pg,'document.documentElement.lang','en')
 test('English locale applies to current view','group=reading',language)
 def dark(pg):clk(pg,'pref:appearance');clk(pg,'choose:appearance:dark');eq(pg,'document.documentElement.dataset.paiaTheme','dark')
 test('Dark applies immediately in demo','group=reading',dark)
 def reset(pg):
  before=pg.evaluate('[prototype.state.promptOpen,prototype.state.promptPins,prototype.state.promptHidden,prototype.state.suggest]');clk(pg,'reset-position');clk(pg,'reset-done');eq(pg,'prototype.state.promptPosition',None);eq(pg,'[prototype.state.promptOpen,prototype.state.promptPins,prototype.state.promptHidden,prototype.state.suggest]',before);pg.wait_for_timeout(40);assert pg.locator('#group-content [data-action="reset-position"]').evaluate('(e)=>e===document.activeElement')
 test('Reset position preserves prompt order/hide/open/suggestions','group=ai',reset)
 def resetfail(pg):pg.evaluate('prototype.state.failNext=true');clk(pg,'reset-position');clk(pg,'reset-done');eq(pg,'prototype.state.promptPosition',{'x':.8,'y':.7})
 test('Failed reset preserves previous position','group=ai',resetfail)
 def storage(pg):clk(pg,'storage');assert '124 MB' in pg.locator('#sheet').inner_text();assert '估算' in pg.locator('#sheet').inner_text()
 test('Storage space opens meaningful details','group=data',storage)
 def warning(pg):assert pg.locator('.warning').count()==0
 test('Healthy normal Data has no diagnostics row','group=data',warning)
 def repair(pg):clk(pg,'repair');clk(pg,'repair-done');eq(pg,'prototype.state.warning',False);assert not pg.locator('.warning').count()
 test('Conditional recovery clears demonstrated fault','group=data&case=warning',repair)
 def restorebad(pg):assert '没有改变' in pg.locator('#sheet').inner_text();assert not pg.locator('[data-action="restore-done"]').count();eq(pg,'prototype.state.removed',8)
 test('Rejected backup preserves demo archive state','group=data&case=restore-invalid',restorebad)
 def restorepreview(pg):assert pg.locator('#restore-mode').is_visible();eq(pg,'prototype.state.removed',8);pg.keyboard.press('Escape');assert not pg.locator('#sheet').is_visible()
 test('Restore preview is noncommitting and cancellable','group=data&case=restore-preview',restorepreview)
 def replace(pg):
  pg.locator('#restore-mode').select_option('replace');clk(pg,'restore-confirm');assert pg.locator('[data-action="restore-done"]').is_disabled();pg.locator('#confirm-destructive').check();clk(pg,'restore-done');eq(pg,'prototype.state.suggest',False);eq(pg,'prototype.state.access',False)
 test('Replacement requires explicit confirmation; access remains off','group=data&case=restore-preview',replace)
 def merge(pg):clk(pg,'restore-confirm');assert '冲突' in pg.locator('#sheet').inner_text();assert not pg.locator('#confirm-destructive').count()
 test('Merge confirmation describes conflict/no-write boundary','group=data&case=restore-preview',merge)
 def removed(pg):
  txt=pg.locator('#sheet').inner_text();assert '恢复' in txt;assert pg.locator('.recovery-entry').count()==8;before=pg.evaluate('prototype.state.access');clk(pg,'restore-item:0');eq(pg,'prototype.state.removed',7);eq(pg,'prototype.state.access',before)
 test('Typed recovery discovery and no AI access change','group=data&case=removed',removed)
 def source(pg):clk(pg,'route:source');assert pg.locator('#boundary-heading').inner_text()=='原始来源记录';assert not pg.locator('#boundary [data-action="purge"]').count()
 test('Source destination does not invent bulk purge','group=data',source)
 def imp(pg):
  assert '归属需确认' in pg.locator('#sheet').inner_text();clk(pg,'import-done');clk(pg,'review-destinations');assert pg.locator('#boundary-heading').inner_text()=='档案'
 test('Pending import destinations go to Archive, not removed list','group=data&case=import-preview',imp)
 def narrow(pg):
  clk(pg,'back-settings');assert pg.locator('#settings-directory').is_visible();pg.locator('[data-group="privacy"]').click();assert pg.locator('#group-heading').inner_text()=='隐私与访问';assert not pg.locator('#settings-directory').is_visible()
 test('320px stacked directory and group return','group=ai',narrow,320)
 def keyboard(pg):
  pg.locator('#pref-font').focus();pg.keyboard.press('Enter');assert pg.locator('#sheet').is_visible();pg.wait_for_timeout(40);pg.keyboard.press('End');assert pg.locator('.choice').last.evaluate('(e)=>e===document.activeElement');pg.keyboard.press('Escape');pg.wait_for_timeout(40);assert pg.locator('#pref-font').evaluate('(e)=>e===document.activeElement')
 test('Native keyboard choices and Escape return focus','group=reading',keyboard)
 def coarse():
  pg=page('group=ai',320,coarse=True)
  measures=pg.locator('#group-content button').evaluate_all('(els)=>els.map(e=>({text:e.textContent,h:e.getBoundingClientRect().height,w:e.getBoundingClientRect().width}))');assert all(x['h']>=44 and x['w']>=44 for x in measures),measures;pg.context.close()
 check('Coarse 44px effective targets',coarse)
 b.close()
results['summary']={'layout_passed':sum(x['pass'] for x in results['layout']),'layout_total':len(results['layout']),'interaction_passed':sum(x['pass'] for x in results['interaction']),'interaction_total':len(results['interaction']),'script_errors':len(results['page_errors'])}
(ROOT/'prototype-checks.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
print(results['summary'])
print('Layout fails:',[x for x in results['layout'] if not x['pass']][:4])
