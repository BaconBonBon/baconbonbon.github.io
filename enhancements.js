(() => {
  'use strict';
  const VERSION='2026.09.26.1';
  const isoDate=value=>{if(!value)return '';const d=new Date(value);return Number.isNaN(d.getTime())?'':d.toLocaleDateString('zh-TW',{year:'numeric',month:'2-digit',day:'2-digit'})};
  const today=()=>new Date().toISOString().slice(0,10);

  // Keep the new JOYSOUND verification date through imports, sync merges and reloads.
  const baseNormalize=normalizeSongs;
  normalizeSongs=function(input){
    const raw=Array.isArray(input)?input:(input&&Array.isArray(input.songs)?input.songs:[]);
    const dates=new Map(raw.filter(x=>x&&x.id).map(x=>[x.id,text(x.joysoundCheckedAt)]));
    return baseNormalize(input).map(song=>({...song,joysoundCheckedAt:dates.get(song.id)||''}));
  };
  const baseSignature=signature;
  signature=function(song){
    if(!song)return baseSignature(song);
    const value=JSON.parse(baseSignature(song));value.joysoundCheckedAt=text(song.joysoundCheckedAt);return JSON.stringify(value);
  };

  // Add a verification-date field beside JOYSOUND metadata.
  const joyFields=document.querySelector('.joysound-fields');
  if(joyFields&&!document.getElementById('fJoysoundCheckedAt')){
    const field=document.createElement('div');field.className='field';
    field.innerHTML='<label for="fJoysoundCheckedAt">最後確認日期</label><input class="input" id="fJoysoundCheckedAt" type="date"><span class="hint">確認收錄狀態或選曲番号時更新。</span>';
    joyFields.append(field);
  }
  const style=document.createElement('style');
  style.textContent='.health-dashboard{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin:14px 0 18px}.health-stat{border:1px solid var(--line);border-radius:13px;background:var(--bg);padding:12px}.health-stat strong{display:block;font:600 20px var(--font-mono);color:var(--accent);margin-bottom:4px}.health-stat span{font-size:10px;color:var(--muted)}.health-sync{grid-column:1/-1}.joysound-checked{font-size:10px;color:var(--muted)}@media(max-width:420px){.health-dashboard{grid-template-columns:1fr 1fr}}';
  document.head.append(style);

  const baseEditorValue=editorValue;
  editorValue=function(){return baseEditorValue()+'|'+(document.getElementById('fJoysoundCheckedAt')?.value||'')};
  const baseOpenEditor=openEditor;
  openEditor=function(id=null){baseOpenEditor(id);const song=songs.find(s=>s.id===id),field=document.getElementById('fJoysoundCheckedAt');if(field)field.value=text(song?.joysoundCheckedAt).slice(0,10);editorInitial=editorValue()};

  const baseSaveSong=saveSong;
  saveSong=function(){
    const before=songs.find(s=>s.id===editingId);const previousStatus=before?.joysoundStatus||'unknown',previousNumber=before?.joysoundNumber||'';
    const title=$('fTitle').value.trim(),artist=$('fArtist').value.trim(),status=$('fJoysoundStatus').value,number=$('fJoysoundNumber').value.trim();
    const explicit=document.getElementById('fJoysoundCheckedAt')?.value||'';
    baseSaveSong();
    const saved=editingId?songs.find(s=>s.id===editingId):songs.find(s=>s.title===title&&s.artist===artist);
    if(!saved)return;
    const changed=status!==previousStatus||number!==previousNumber;
    const checked=explicit||(changed&&status!=='unknown'?today():'');
    if(checked&&saved.joysoundCheckedAt!==checked){saved.joysoundCheckedAt=checked;saved.updatedAt=new Date().toISOString();commit();refreshReader()}
  };

  const baseRenderJoysoundMeta=renderJoysoundMeta;
  renderJoysoundMeta=function(song){baseRenderJoysoundMeta(song);const root=$('joysoundMeta');if(song.joysoundCheckedAt){const date=document.createElement('span');date.className='joysound-checked';date.textContent='確認 '+isoDate(song.joysoundCheckedAt);root.append(date)}};

  // Search also matches the saved official JOYSOUND query. Existing search already covers
  // title, artist, romaji, Japanese, tags and selection number.
  const search=$('searchInput');
  if(search){search.placeholder='找歌名、歌手、歌詞、番号或標籤';search.setAttribute('aria-label','搜尋歌名、歌手、日文、羅馬拼音、選曲番号或標籤')}

  // Rich database-health summary above the existing actionable issue list.
  const baseRenderDataHealth=renderDataHealth;
  renderDataHealth=function(){
    baseRenderDataHealth();
    const modal=$('dataHealthModal')?.querySelector('.dialog'),list=$('healthList');if(!modal||!list)return;
    modal.querySelector('.health-dashboard')?.remove();
    const total=songs.length,available=songs.filter(s=>s.joysoundStatus==='available').length,unknown=songs.filter(s=>s.joysoundStatus==='unknown').length,repair=songs.filter(s=>s.tags.includes('待修')).length,verified=songs.filter(s=>s.joysoundCheckedAt).length;
    const dash=document.createElement('div');dash.className='health-dashboard';
    const stats=[[total,'歌曲總數'],[available,'JOYSOUND 已收錄'],[unknown,'JOYSOUND 待確認'],[repair,'待修'],[verified,'有確認日期']];
    stats.forEach(([n,label])=>{const card=document.createElement('div');card.className='health-stat';card.innerHTML='<strong>'+n+'</strong><span>'+label+'</span>';dash.append(card)});
    const sync=document.createElement('div');sync.className='health-stat health-sync';const syncText=config.gistId?(hasPending()?'有本機變更待同步':'Gist 已同步'):'僅本機收藏';sync.innerHTML='<strong style="font-size:13px">'+syncText+'</strong><span>資料庫狀態 · '+VERSION+'</span>';dash.append(sync);
    list.before(dash);
  };

  // Show the enhanced version in Settings without rewriting the large single-file app.
  const versionHint=[...document.querySelectorAll('#settingsModal .hint')].find(el=>el.textContent.includes('目前版本：'));
  if(versionHint)versionHint.textContent='目前版本：'+VERSION;
})();