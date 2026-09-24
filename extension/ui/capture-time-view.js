// Update source-time presentation without replacing editable prose or its undo state.
// Sections retain the existing frozen reading order; this never changes user text.
export function refreshCaptureTimes(body,rows,{day,time}) {
  const values=new Map(rows.map(row=>[row.id,row]));
  const pages=[...body.children].filter(node=>node.classList.contains('reader-page'));
  const containers=pages.length?pages:[body];
  const sections=containers.flatMap(container=>[...container.children]
    .filter(node=>node.classList.contains('library-block')));
  const anchor=sections.find(node=>node.getBoundingClientRect().bottom>0);
  const top=anchor?.getBoundingClientRect().top;
  for(const container of containers){
    let previous=null;const keep=new Set();
    for(const section of [...container.children].filter(node=>node.classList.contains('library-block'))){
      const row=values.get(section.dataset.blockId);if(!row)continue;
      const stamp=section.querySelector('.block-time'),label=time(row.sourceSentAt),date=day(row.sourceSentAt);
      if(stamp&&stamp.textContent!==label)stamp.textContent=label;
      if(date!==previous){
        let heading=section.previousElementSibling;
        if(!heading?.classList.contains('document-day')){
          heading=body.ownerDocument.createElement('h3');heading.className='document-day';container.insertBefore(heading,section);
        }
        if(heading.textContent!==date)heading.textContent=date;
        keep.add(heading);previous=date;
      }
    }
    for(const heading of container.querySelectorAll(':scope > .document-day'))if(!keep.has(heading))heading.remove();
  }
  if(anchor&&Number.isFinite(top)){
    const delta=anchor.getBoundingClientRect().top-top;
    if(Math.abs(delta)>0.5)body.ownerDocument.defaultView.scrollBy(0,delta);
  }
}
