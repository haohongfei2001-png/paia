/* R2 presentation/layout adapter. Inherit, do not rewrite, the verified R1 demo. */
(function(global){
'use strict';
const R1=global.PaiaRefinement;
if(!R1||R1.version!=='PAIA-FLOAT-UI-1.2-R1')throw new Error('The exact R1 component is required');
const BaseSurface=R1.Surface;
const geometry=Object.freeze({circle:48,capsule:272,boardWidth:336,boardHeight:312,boardGap:8,safeTop:72,safeLeft:12});
class GeometrySurface extends BaseSurface {
  layout(){
    if(this.destroyed)return;
    if(!this.skin){
      this.root.dataset.geometry='r2';
      this.capsule.querySelector('.ps-capsule-shape')?.remove();
      this.skin=document.createElement('div');this.skin.className='ps-unified-skin';
      this.skin.setAttribute('aria-hidden','true');this.root.prepend(this.skin);
    }
    // Keep R1's exact composer-relative x/y, resize lifecycle and frame scheduling.
    super.layout();
    const x=parseFloat(this.root.style.left),y=parseFloat(this.root.style.top);
    const roomWidth=x+geometry.circle-geometry.safeLeft;
    const roomHeight=y-geometry.boardGap-geometry.safeTop;
    const width=Math.min(geometry.boardWidth,roomWidth);
    const height=Math.min(geometry.boardHeight,roomHeight);
    this.board.style.width=Math.max(160,width)+'px';
    this.board.style.height=Math.max(48,height)+'px';
    this.root.style.setProperty('--capsule-width',Math.max(48,Math.min(geometry.capsule,roomWidth))+'px');
    const minimum=(this.edit||['guard','delete'].includes(this.view))?168:92;
    const space=y<geometry.safeTop||roomWidth<48?'hidden':height<minimum||width<160?'entry':'full';
    this.root.dataset.space=space;
    this.board.inert=this.mode!=='board'||space!=='full';
    this.capsule.inert=this.mode!=='capsule'||space!=='full';
    this.anchor.tabIndex=space==='hidden'?-1:0;
  }
}
global.PaiaRefinement={...R1,BaseSurface,Surface:GeometrySurface,geometry,version:'PAIA-FLOAT-UI-1.2-R2'};
})(window);
