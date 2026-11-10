
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let page='library',filter='全部素材',query='',files=[],source='内部上传',selected=0,taskMade=false,submitted=false;
let items=[];
const recycledAssets=[];
let storedEditDraft=null;
const selectedSearchTags=new Set();
const appliedSearchTags=new Set();
const currentReviewer='林晓';
let collectionNavigationExpanded=true,externalReviewItem=null;
function canReview(item){return item?.externalSubmission===true&&item.reviewer===currentReviewer&&item.status==='待人工审核'}
const tag=s=>`<span class="tag ${s.includes('补充')?'warn':s.includes('拒绝')||s.includes('退回')?'bad':s.includes('审核')?'blue':''}">${s}</span>`;
function go(p,{cancelApproval=false}={}){
  captureUploadDraft();
  if(page==='upload'&&p!=='upload'&&files.some(file=>file.approveFromQueue)){
    if(!cancelApproval){
      for(const file of files){
        if(file.approveFromQueue)queuedFormDrafts.set(file.queueSource,file);
      }
    }
    files=[];
    activeUploadFile=null;
    displayedUploadFile=null;
    pendingUpload=null;
    closeModal();
  }
  if(externalReviewItem&&page==='upload'&&p!=='upload'){
    externalReviewItem=null;
    files=[];
    activeUploadFile=null;
    displayedUploadFile=null;
    closeModal();
  }
  if(p!==page&&p!=='detail'&&page!=='detail'){selectedSearchTags.clear();appliedSearchTags.clear();selectedStoredAssets.clear()}
  storedEditDraft=null;
  page=p;
  query='';
  render();
}function toast(t){let d=document.createElement('div');d.className='toast';d.textContent=t;document.body.append(d);setTimeout(()=>d.remove(),2800)}
const recommendedSearchTerms=['辣鲜露+蒸鱼豉油','菜谱','产品海报','节日活动','短视频'];
const popularSearchTerms=['辣鲜露+蒸鱼豉油','清蒸鲈鱼','鲜麻青花椒酱','宴席凉菜','家常红烧菜'];
let recommendedSearchIndex=0;
function updateSearchQuery(input){
  query=input.value;
  drawRows();
}
function searchBar(){
  const term=recommendedSearchTerms[recommendedSearchIndex];
  return `<div class="client-search-widget" id="client-search-widget">
    <div class="client-search"><span aria-hidden="true">⌕</span>
      ${['library','group'].includes(page)?`<div id="client-search-tags" class="client-search-tags">${searchTagChips()}</div>`:''}
      <div class="client-search-field">
        <input id="client-search-query" class="search" aria-label="搜索素材名称" placeholder=" " value="${esc(query)}"
          aria-controls="popular-search-panel" onfocus="showPopularSearch(true)" onclick="showPopularSearch(true)"
          oninput="updateSearchQuery(this)" onkeydown="if(event.key==='Enter'){event.preventDefault();submitMaterialSearch()}">
        <div class="recommended-search" id="recommended-search" aria-hidden="true">
          <span class="recommended-search-word">${esc(term)}</span>
        </div>
      </div>
      ${['library','group'].includes(page)?`<button type="button" id="client-search-submit" class="client-search-submit" onclick="submitMaterialSearch()" ${selectedSearchTags.size?'':'hidden'}>搜索</button>`:''}
    </div>
    <section id="popular-search-panel" class="popular-search-panel" aria-labelledby="popular-search-title" hidden>
      <div class="popular-search-heading"><h2 id="popular-search-title">近 7 天热门搜索</h2><span>Top 5</span></div>
      <ol class="popular-search-list">
        ${popularSearchTerms.map((term,index)=>`<li><button type="button" data-term="${esc(term)}" onclick="searchPopularTerm(this.dataset.term)"><span class="popular-search-rank">${index+1}</span>${esc(term)}</button></li>`).join('')}
      </ol>
    </section>
  </div>`;
}
function showPopularSearch(open){
  const panel=$('#popular-search-panel');
  if(panel)panel.hidden=!open;
}
function searchPopularTerm(term){
  const input=$('#client-search-query');
  if(!input)return;
  input.value=term;
  query=term;
  submitMaterialSearch();
  input.focus();
  showPopularSearch(false);
}
function closePopularSearchOutside(event){
  if(!event.target.closest('#client-search-widget'))showPopularSearch(false);
}
function closePopularSearchWithEscape(event){
  const panel=$('#popular-search-panel');
  if(event.key!=='Escape'||!panel||panel.hidden)return;
  $('#client-search-query')?.focus();
  showPopularSearch(false);
}
function rotateSearchRecommendation(){
  const input=$('#client-search-query');
  const placeholder=$('#recommended-search');
  if(!input||!placeholder||input.value||input.matches(':focus'))return;
  recommendedSearchIndex=(recommendedSearchIndex+1)%recommendedSearchTerms.length;
  const term=recommendedSearchTerms[recommendedSearchIndex];
  placeholder.innerHTML=`<span class="recommended-search-word">${esc(term)}</span>`;
}

function clientHeaderActions(){
  const count=storedAssetBasket.size;
  return `<div class="client-header-actions">
    <button type="button" class="client-header-action" aria-label="素材篮" title="素材篮" onclick="showStoredBasket()">
      ${storedActionIcon('<path d="M4 7h16l-1.5 13h-13L4 7Zm4 3V6a4 4 0 0 1 8 0v4"/>')}
      <span id="client-basket-count" class="client-header-count" ${count?'':'hidden'}>${count}</span>
    </button>
    <button type="button" class="client-header-action" aria-label="通知，查看待审核" title="待审核通知" onclick="go('review')">
      ${storedActionIcon('<path d="M4 18h16M6 18v-7a6 6 0 0 1 12 0v7M12 3v2m-3 16h6"/>')}
    </button>
  </div>`;
}

function render(){let ext=page==='agency';$('#app').innerHTML=`<div class="client-shell"><header class="client-header"><div class="logo"><span class="app-grid" aria-hidden="true">⠿</span><span class="client-brand" aria-hidden="true">U</span><span>素材库</span>${ext?'<small>素材协作上传</small>':''}</div>${!ext&&['queue','library','archived','review','group'].includes(page)?searchBar():''}<div class="client-account">${ext?'':clientHeaderActions()}<span class="badge">${ext?'A':'林'}</span><span>${ext?'青禾创意 · 访客':'林晓 · 内容运营'}</span></div></header>${ext?`<div class="external">${agency()}</div>`:`<div class="layout client-layout"><aside class="client-sidebar">${clientSidebar()}</aside><main class="client-main" data-view="${page}"><div class="crumb">${page==='detail'?'全部素材':'全部'} <span aria-hidden="true">›</span> ${({'queue':'待入库',upload:'上传素材',tasks:'收集任务',review:'待审核',trash:'回收站',library:'全部素材',archived:'已入库',group:esc(activeMaterialGroup),detail:esc(items[selected]?.name||'素材详情'),guide:'流程说明'})[page]}</div>${content()}</main></div>`}<div class="client-demo-note">演示环境：所有文件、识别、查重、审核及权限均为本地模拟；刷新后恢复初始演示数据。</div></div>`}

function sidebarIcon(name){let paths={trash:'<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',layers:'<path d="m3 7 9-5 9 5-9 5-9-5Zm0 5 9 5 9-5M3 17l9 5 9-5"/>',inbox:'<path d="M5 6 7 3h10l2 3M4 6h16v15H4zM9 10h6"/>',favorite:'<path d="m12 3 3 3-3 3-3-3 3-3ZM2 15l6 2h7m-13 2 7 3 12-6-4-2-5 2M5 12l6 1 3 3"/>',person:'<circle cx="12" cy="7" r="4"/><path d="M4 22v-3a8 8 0 0 1 16 0v3"/>',folder:'<path d="M2 5h7l2 3h11v13H2z"/>',group:'<path d="M2 4h8l2 3h10v14H2z"/><circle cx="9" cy="12" r="2"/><path d="M5 19v-1a4 4 0 0 1 8 0v1m2-7a2 2 0 0 1 1 4m0 0a4 4 0 0 1 3 3"/>'};return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.folder}</svg>`}
let sidebarAssetsExpanded=true,sidebarContentExpanded=true;
function clientSidebar(){let approvedCount=items.filter(x=>x.status==='已入库').length,pendingCount=items.filter(item=>isPendingQueueItem(item)&&!item.uploadError).length,reviewCount=items.filter(canReview).length;return `<nav class="reference-nav cms-nav"><div class="cms-nav-root ${['library','archived','queue'].includes(page)?'active':''}"><button onclick="go('library')">${sidebarIcon('layers')}<span>全部素材</span><span class="cms-nav-count">${approvedCount}</span></button><button class="cms-nav-toggle" aria-label="展开或收起全部素材" aria-expanded="${sidebarAssetsExpanded}" onclick="sidebarAssetsExpanded=!sidebarAssetsExpanded;render()">${sidebarAssetsExpanded?'⌃':'⌄'}</button></div><div class="cms-nav-children" ${sidebarAssetsExpanded?'':'hidden'}><button class="${page==='archived'?'active':''}" onclick="go('archived')"><span>已入库</span><span class="cms-nav-count">${approvedCount}</span></button><button class="${page==='queue'?'active':''}" onclick="go('queue')"><span>待入库</span><span class="cms-nav-count">${pendingCount}</span></button></div>
  <div class="cms-nav-root ${['tasks','review'].includes(page)?'active':''}">
    <button ${page==='tasks'?'aria-current="page"':''} onclick="go('tasks')">${sidebarIcon('inbox')}<span>收素材</span><span class="cms-nav-count">${reviewCount}</span></button>
    <button class="cms-nav-toggle" aria-label="展开或收起待审核" aria-expanded="${collectionNavigationExpanded}" onclick="collectionNavigationExpanded=!collectionNavigationExpanded;render()">${collectionNavigationExpanded?'⌄':'›'}</button>
  </div>
  ${collectionNavigationExpanded?`<div class="cms-nav-children"><button class="${page==='review'?'active':''}" onclick="go('review')"><span>待审核</span><span class="cms-nav-count">${reviewCount}</span></button></div>`:''}
  <div class="cms-nav-root ${page==='trash'?'active':''}">
    <button onclick="go('trash')">${sidebarIcon('trash')}<span>回收站</span></button>
  </div>
  <div class="cms-nav-divider"></div><div class="reference-nav-label">${sidebarIcon('layers')}<span>全局概览</span></div><button onclick="document.querySelector('.reference-group-heading')?.scrollIntoView({behavior:'smooth',block:'start'})">${sidebarIcon('folder')}<span>素材组管理</span></button><div class="reference-nav-label">${sidebarIcon('person')}<span>权限管理</span></div><div class="reference-nav-label">${sidebarIcon('inbox')}<span>生命周期</span></div><div class="reference-nav-label">${sidebarIcon('folder')}<span>审计日志</span></div></nav>`}
function sidebarGroupRow(name,count,icon,style='',child=false){return `<div class="reference-tree-row ${child?'tree-child':''}"><span class="tree-arrow" aria-hidden="true">${name==='Portfolio-辣鲜露系列'?'▾':'▸'}</span><button class="tree-entry ${style} ${page==='group'&&activeMaterialGroup===name?'current-group':''}" data-group="${esc(name)}" onclick="openMaterialGroup(this.dataset.group)">${sidebarIcon(icon)}<span>${esc(name)}</span>${count?`<small>${count}</small>`:''}</button></div>`}
let activeMaterialGroup='Portfolio-辣鲜露系列';
function openMaterialGroup(name){if(name!==activeMaterialGroup){selectedSearchTags.clear();appliedSearchTags.clear();selectedStoredAssets.clear()}activeMaterialGroup=name;go('group')}
function groupMatchesItem(item){
  if(item.status!=='已入库')return false;
  const groups=[item.metadata?.group,...(item.additionalGroups||[])].filter(Boolean);
  return groups.some(group=>referenceMaterialGroups.includes(activeMaterialGroup)
    ?group===activeMaterialGroup||group.startsWith(activeMaterialGroup+' / ')
    :group.includes(activeMaterialGroup));
}
function groupContent(){let children=activeMaterialGroup==='Portfolio-辣鲜露系列'?[['家乐鲜露','6素材组 · 4素材'],['家乐辣鲜露','458素材组 · 1.7K素材'],['家乐酸辣鲜露','5素材组 · 1素材'],['家乐鲜麻辣鲜露','414素材组 · 2K素材']]:[];return heading(esc(activeMaterialGroup),'',`<button class="client-collect" onclick="taskModal()"><span aria-hidden="true">♧</span> 收素材</button>${addMenu()}`)+`${children.length?`<section class="group-folder-section"><h2>素材组（${children.length}）</h2><div class="group-folder-grid">${children.map(([name,info])=>`<button class="group-folder-card" data-group="${esc(name)}" onclick="openMaterialGroup(this.dataset.group)"><span class="group-folder-preview">${sidebarIcon('folder')}</span><strong>${name}</strong><small>${info}</small></button>`).join('')}</div></section>`:''}<div class="card"><div class="toolbar client-list-toolbar"><div class="client-total">素材 <span id="stored-list-count" class="muted">（${items.filter(groupMatchesItem).length}）</span></div><div class="sub">已入库内容</div></div><div id="rows" class="stored-asset-grid"></div><div id="stored-batch-host"></div></div>`}

let materialGroups=[];
function addMenu(){return `<details class="client-add-menu"><summary role="button" aria-label="新增">＋ 新增</summary><div class="client-add-options">${[['file','▱','上传文件'],['folder','▱','上传文件夹'],['baidu','♧','百度网盘导入'],['muse','▣','MUSE导入'],['text','T','新建纯文本'],['library','▢','从素材库添加'],['group','▱','新建子素材组']].map(([key,icon,label])=>`<button onclick="chooseAddAction('${key}')"><span class="add-menu-icon ${key==='baidu'?'baidu-icon':''}" aria-hidden="true">${icon}</span>${label}</button>`).join('')}</div></details>`}
function closeAddMenu(){document.querySelectorAll?.('.client-add-menu[open]').forEach(menu=>menu.removeAttribute('open'))}
document.addEventListener?.('click',event=>{document.querySelectorAll?.('.client-add-menu[open]').forEach(menu=>{if(!menu.contains(event.target))menu.removeAttribute('open')})});document.addEventListener?.('keydown',event=>{if(event.key==='Escape')closeAddMenu()});
function openLocalSelection(action,retryItem=null){let picker=document.createElement('input');picker.type='file';picker.multiple=!retryItem;picker.hidden=true;if(action==='folder'){picker.setAttribute('webkitdirectory','');picker.setAttribute('directory','')}picker.onchange=()=>{let chosen=Array.from(picker.files||[]);picker.remove();if(!chosen.length)return;addFiles(chosen,{toQueue:true,retryItem})};picker.oncancel=()=>picker.remove();document.body.append(picker);picker.click()}
function chooseAddAction(action){closeAddMenu();if(action==='file'||action==='folder'){openLocalSelection(action);return}let title=({baidu:'百度网盘导入',muse:'MUSE导入',text:'新建纯文本',library:'从素材库添加',group:'新建子素材组'})[action];let form='';if(action==='baidu'||action==='muse'){form=`<p class="sub">演示入口：仅模拟导入流程，不连接外部服务。</p>${field(action==='baidu'?'网盘分享链接':'MUSE 素材链接 / 编号','<input id="import-reference" placeholder="请输入链接或编号">',true)}${field('素材名称','<input id="import-name" placeholder="请输入导入后的素材名称">',true)}`}else if(action==='text'){form=field('素材名称','<input id="text-name" placeholder="请输入纯文本名称">',true)+field('文本内容','<textarea id="text-content" rows="7" placeholder="请输入文本内容"></textarea>',true)}else if(action==='group'){form=field('所属素材组','<input value="CRM · 品牌内容团队" readonly>')+field('子素材组名称','<input id="subgroup-name" placeholder="请输入子素材组名称">',true)}else{form=`<p class="sub">选择已有素材，模拟添加到当前素材组。</p><div class="existing-library-list">${items.length?items.map((item,i)=>`<label><input class="check" type="checkbox" data-library-index="${i}">${esc(item.name)}</label>`).join(''):'<div class="empty">素材库暂无素材</div>'}</div>`}$('#overlay').innerHTML=`<div class="modalbg"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="add-action-title"><h2 id="add-action-title">${title}</h2><div style="margin-top:24px">${form}</div><div class="foot"><button onclick="closeModal()">取消</button><button class="primary" onclick="confirmAddAction('${action}')">确定</button></div></div></div>`}
function confirmAddAction(action){if(action==='group'){let name=$('#subgroup-name').value.trim();if(!name)return toast('请填写子素材组名称');materialGroups.push(name);closeModal();render();toast('子素材组已创建');return}if(action==='text'){let name=$('#text-name').value.trim(),content=$('#text-content').value;if(!name||!content.trim())return toast('请填写名称与文本内容');if(!name.toLowerCase().endsWith('.txt'))name+='.txt';closeModal();files=[];go('upload');addFiles([new File([content],name,{type:'text/plain'})]);return}if(action==='library'){let chosen=[...(document.querySelectorAll?.('[data-library-index]:checked')||[])].map(n=>items[Number(n.dataset.libraryIndex)]).filter(Boolean);if(!chosen.length)return toast('请选择素材');closeModal();toast('已模拟添加 '+chosen.length+' 份已有素材');return}let ref=$('#import-reference').value.trim(),name=$('#import-name').value.trim();if(!ref||!name)return toast('请填写来源与素材名称');if(action==='baidu'&&!/^https:\/\/pan\.baidu\.com\//i.test(ref))return toast('请输入有效的百度网盘分享链接');if(!/\.[A-Za-z0-9]+$/.test(name))name+=action==='baidu'?'.pdf':'.jpg';closeModal();files=[];go('upload');addFiles([{name,size:0}]);toast('已生成模拟导入素材，请继续填写名字')}
function heading(t,s,a=''){return `<div class="heading"><div><h1>${t}</h1><div class="sub">${s}</div></div><div class="row">${a}</div></div>`}
function content(){if(page==='archived')return archivedContent();if(page==='trash')return storedTrashContent();if(page==='queue')return queueContent();if(page==='review')return reviewContent();if(page==='upload')return upload();if(page==='tasks')return tasks();if(page==='detail')return detail();if(page==='guide')return guide();if(page==='group')return groupContent();let review=page==='review',lib=page==='library';return heading(review?'审核中心':lib?'全部素材':'入库工作台',review?'统一核对素材信息，确认后完成入库':lib?'已完成审核的素材可供浏览与复用':'从素材上传到审核入库，跟进每一份内容的处理进度',lib?`<button class="primary client-upload-all" onclick="chooseAddAction('file')">↥ 上传</button>`:`<button class="client-collect" onclick="taskModal()"><span aria-hidden="true">♧</span> 收素材</button>${addMenu()}`)+(!review&&!lib?`<div class="stats">${[['待人工审核',items.filter(x=>x.status==='待人工审核').length,'补全与查重已通过'],['待补充字段',items.filter(x=>x.status==='待补充字段').length,'需要上传人完善信息'],['相似待确认',items.filter(x=>x.dup).length,'相似图片等待确认'],['已入库',items.filter(x=>x.status==='已入库').length,'审核通过，可供使用']].map(([t,n,s])=>`<div class="stat"><div class="sub">${t}</div><div class="num">${n.toString().padStart(2,'0')}</div><em>${s}</em></div>`).join('')}</div>`:'')+`<div class="card">${!lib&&!review?`<div class="tabs">${['全部素材','待人工审核','待补充字段','相似待确认','已退回','已入库'].map(t=>`<button class="${filter===t?'sel':''}" onclick="filter='${t}';render()">${t}</button>`).join('')}</div>`:''}<div class="toolbar client-list-toolbar"><div class="client-total">素材 <span ${lib?'id="stored-list-count"':''} class="muted">（${items.filter(x=>review?x.status==='待人工审核':lib?x.status==='已入库':filter==='全部素材'||x.status===filter).length}）</span></div><div class="sub">${lib?'已入库内容':'按最近上传时间排序'}</div></div>${lib?`<div id="rows" class="stored-asset-grid"></div><div id="stored-batch-host"></div>`:`<table><thead><tr><th>素材名称</th><th>来源 / 上传人</th><th>信息处理</th><th>适用渠道</th><th>当前状态</th><th>操作</th></tr></thead><tbody id="rows"></tbody></table>`}</div>`}
const queueSelection=new Set();
const queuedFormDrafts=new Map();
let archiveOrder=0;
function isPendingQueueItem(item){
  return !item.externalSubmission&&(!item.by||item.by===currentReviewer)&&item.status!=='已入库'&&!queuedFormDrafts.has(item)&&!files.some(file=>file.approveFromQueue&&file.queueSource===item);
}
function pendingQueueItems(){return items.filter(item=>isPendingQueueItem(item)&&item.name.includes(query))}
function queueContent(){let pending=pendingQueueItems();for(let x of queueSelection)if(!items.includes(x)||x.status==='已入库')queueSelection.delete(x);let chosen=pending.filter(x=>queueSelection.has(x));return `<section class="pending-queue"><div class="pending-heading"><div class="pending-title"><h1>待入库</h1><span class="sub">查看待入库素材和上传异常</span></div><div class="row"><span class="sub">已选 <span class="pending-count">${chosen.length}</span> 项</span><button ${chosen.length?'':'disabled'} onclick="deleteQueueSelection()">删除</button><button ${chosen.length?'':'disabled'} onclick="storeQueuedMaterial()">入库所选</button></div></div><div class="pending-body"><div class="pending-label"><span>全部文件</span><button type="button" onclick="chooseAddAction('file')">＋ 选择文件</button>${queuedFormDrafts.size?`<button type="button" onclick="openQueuedUpload([])">继续入库（${queuedFormDrafts.size}）</button>`:''}</div><div class="pending-table-frame"><div class="pending-table"><table><thead><tr><th class="pending-check"><input class="check" type="checkbox" aria-label="全选待入库素材" ${pending.length&&pending.every(x=>queueSelection.has(x))?'checked':''} onchange="setAllQueueChecked(this.checked)"></th><th>名称</th><th>状态</th><th>上传者</th><th>版本</th><th>上传时间</th><th>来源素材组</th><th>文件类型</th><th>操作</th></tr></thead><tbody id="rows"></tbody></table></div></div></div></section>`}
function queueStatus(file,index){
  const phase=file.aiState?.phase;
  const recognizing=phase==='running'||file.duplicatePhase==='running';
  const busy=file.intakePending||recognizing;
  let label=file.intakePending?'上传中':recognizing?'AI 识别中':'待入库';
  let tone=busy?'busy':'ready';
  let detail='';
  if(file.uploadError){
    label='上传失败';
    tone='error';
    detail=file.uploadError;
  }else if(phase==='timeout'){
    return `<div class="pending-status">
      <span class="pending-status-label error">AI 处理超时</span>
      <small>文件已上传，可<button type="button" class="pending-ai-retry" onclick="retryQueueRecognition(${index})">重新识别</button>，或在素材入库页手动填写</small>
    </div>`;
  }else if(phase==='failed'){
    label='AI 识别失败';
    tone='error';
    detail='文件已上传，可在素材入库页手动填写';
  }else if(phase==='manual'){
    label='AI 不支持此文件类型';
    tone='warning';
    detail='文件已上传，可在素材入库页手动填写';
  }else if(phase==='partial'&&!recognizing){
    label='AI 识别不完整';
    tone='warning';
    detail='可在上传素材页补充信息';
  }
  return `<div class="pending-status">
    <span class="pending-status-label ${tone}">${tone==='busy'?'<span class="ai-spinner" aria-hidden="true"></span>':''}${label}</span>
    ${detail?`<small>${esc(detail)}</small>`:''}
  </div>`;
}
function drawQueueRows(){let target=$('#rows');if(!target)return;let pending=pendingQueueItems();target.innerHTML=pending.length?pending.map(x=>{let i=items.indexOf(x),name=x.name;return `<tr><td class="pending-check"><input class="check" type="checkbox" aria-label="选择待入库素材 ${i+1}" ${queueSelection.has(x)?'checked':''} onchange="setQueueChecked(${i},this.checked)"></td><td><div class="pending-file">${x.previewUrl&&['JPG','JPEG','PNG','GIF','WEBP'].includes(x.type)?`<button class="pending-thumbnail-button" aria-label="查看 ${esc(name)} 大图" title="${esc(x.metadata?.desc||'暂无素材简介')}" onclick="showAssetImage(${i})"><img class="pending-thumbnail" src="${esc(x.previewUrl)}" alt="${esc(name)}"></button>`:`<span class="fileicon">${esc(x.type)}</span>`}<button class="pending-image-title${x.uploadError||x.aiState?.phase==='failed'?' ai-failed':''}" title="${esc(x.metadata?.desc||'暂无素材简介')}" onclick="showAssetImage(${i})">${esc(name)}</button></div></td><td>${queueStatus(x,i)}</td><td>${esc(x.by||'—')}</td><td>${esc(x.metadata?.version||'—')}</td><td>${esc(x.uploadedAt||'—')}</td><td title="${esc(x.metadata?.group||'—')}">${esc(x.metadata?.group||'—')}</td><td>${esc(x.type.toLowerCase())}</td><td class="pending-actions"><button onclick="deleteQueueItem(${i})">删除</button><span aria-hidden="true">｜</span>${x.uploadError?`<button onclick="retryQueueUpload(${i})">重新上传</button>`:`<button onclick="storeQueuedMaterial(${i})">立即入库</button>`}</td></tr>`}).join(''):`<tr><td colspan="9" class="empty pending-empty-cell"><div class="pending-empty-message">暂无待入库素材</div></td></tr>`}
function showAssetImage(index){let item=items[index];if(!item)return;if(!item.previewUrl||!['JPG','JPEG','PNG','GIF','WEBP'].includes(item.type))return toast('当前素材暂无图片预览');let name=item.name;$('#overlay').innerHTML=`<div class="modalbg"><div class="modal pending-image-modal" role="dialog" aria-modal="true" aria-labelledby="pending-image-heading"><div class="pending-image-heading"><h2 id="pending-image-heading">${esc(name)}</h2><button class="pending-image-close" aria-label="关闭大图" onclick="closeModal()">×</button></div><img class="pending-full-image" src="${esc(item.previewUrl)}" alt="${esc(name)}"></div></div>`;$('.pending-image-close')?.focus?.()}
function setQueueChecked(index,checked){let x=items[index];if(!x||!isPendingQueueItem(x))return;if(checked)queueSelection.add(x);else queueSelection.delete(x);render()}
function setAllQueueChecked(checked){for(let x of pendingQueueItems()){if(checked)queueSelection.add(x);else queueSelection.delete(x)}render()}
function deleteQueueItem(index){let x=items[index];if(!x||!isPendingQueueItem(x))return;queueSelection.delete(x);items.splice(index,1);render()}
function deleteQueueSelection(){let chosen=pendingQueueItems().filter(x=>queueSelection.has(x));items=items.filter(x=>!chosen.includes(x));chosen.forEach(x=>queueSelection.delete(x));render()}
function retryQueueRecognition(index){
  const item=items[index];
  if(!item||!isPendingQueueItem(item)||item.aiState?.phase!=='timeout')return;
  item.aiState.phase='idle';
  startFileRecognition(item);
  drawQueueRows();
}
function retryQueueUpload(index){
  const item=items[index];
  if(item?.uploadError&&isPendingQueueItem(item))openLocalSelection('file',item);
}
function storeQueuedMaterial(index){
  const item=items[index];
  const chosen=index===undefined
    ?pendingQueueItems().filter(material=>queueSelection.has(material))
    :item&&isPendingQueueItem(item)?[item]:[];
  if(!chosen.length)return toast('请先勾选要入库的素材');
  if(chosen.some(material=>material.uploadError))return toast('所选文件中有上传失败的素材，请取消勾选失败项，或点击重新上传');
  if(chosen.some(material=>material.intakePending))return toast('素材正在上传，请稍候');
  chosen.forEach(startFileRecognition);
  if(chosen.some(material=>material.visualPending||material.duplicatePhase==='running'))return toast('查重尚未完成，请稍候');
  openQueuedUpload(chosen);
}
function openQueuedUpload(chosen){
  if(chosen.some(material=>material.aiState.phase==='running'))return toast('正在识别，请稍候完成后确认信息');
  const newFiles=chosen.map(material=>{
    const source=material;
    return {
      ...source,
      originalName:material.originalName||material.name,
      metadata:{...source.metadata},
      aiState:{...source.aiState},
      editedFields:[...(source.editedFields||[])],
      queueSource:material,
      archiveOrder:++archiveOrder,
      approveFromQueue:true,
      checked:true,
    };
  });
  files=[...queuedFormDrafts.values(),...newFiles];
  refreshQueuedSimilarity(files);
  queuedFormDrafts.clear();
  displayedUploadFile=null;
  activeUploadFile=newFiles[0]||files[0];
  go('upload');
  $('.upload-meta')?.scrollTo?.({top:0,behavior:'smooth'});
  $('#desc')?.focus?.({preventScroll:true});
}

function compactAssetTags(labels,limit,renderLabel,description){
  const visible=labels.slice(0,limit).map(renderLabel).join('');
  const extra=labels.slice(limit);
  if(!extra.length)return visible;
  return visible+`<details class="stored-tag-more">
    <summary class="storage-tag" aria-label="展开其余 ${extra.length} 个${description}">+${extra.length}</summary>
    <div class="stored-asset-tags">${extra.map(renderLabel).join('')}</div>
  </details>`;
}
function searchTagChips(){
  return [...selectedSearchTags].map(label=>`<button type="button" class="client-search-tag" data-tag="${esc(label)}"
    aria-label="移除标签 ${esc(label)}" onclick="toggleSearchTag(this.dataset.tag)"><span>${esc(label)}</span> ×</button>`).join('');
}
function toggleSearchTag(label){
  if(selectedSearchTags.delete(label)){
    if(appliedSearchTags.delete(label))drawRows();
  }else{
    selectedSearchTags.add(label);
  }
  const chips=$('#client-search-tags');
  if(chips){
    chips.innerHTML=searchTagChips();
    chips.scrollLeft=chips.scrollWidth;
  }
  const submit=$('#client-search-submit');
  if(submit)submit.hidden=!selectedSearchTags.size;
  for(const button of document.querySelectorAll('.stored-tag-button')){
    button.setAttribute('aria-pressed',String(selectedSearchTags.has(button.dataset.tag)));
  }
}
function submitMaterialSearch(){
  appliedSearchTags.clear();
  for(const label of selectedSearchTags)appliedSearchTags.add(label);
  drawRows();
  showPopularSearch(false);
}
function storedAssetMetrics(item){
  const metrics=[
    ['浏览量',item.viewCount??0,'<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z"/><circle cx="12" cy="12" r="2.5"/>'],
    ['下载量',item.downloadCount??0,'<path d="M12 3v12m-4-4 4 4 4-4M4 16v4h16v-4"/>'],
    ['分享次数',item.shareCount??0,'<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.5 6.8-4m-6.8 7 6.8 4"/>'],
  ];
  return `<div class="stored-asset-metrics">
          ${metrics.map(([label,count,icon])=>`<span role="img" aria-label="${label} ${esc(count)}"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${icon}</svg>${esc(count)}</span>`).join('')}
        </div>`;
}
const selectedStoredAssets=new Set();
const storedAssetBasket=new Set();
const basketIcon='<path d="M4 7h14l-1 13H5L4 7Zm4 3V5a3 3 0 0 1 6 0v5m5 3v8m-4-4h8"/>';
function storedActionIcon(path){
  return `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
}
function storedCardControls(item){
  const asset=items[item.i];
  const checked=selectedStoredAssets.has(asset);
  const inBasket=storedAssetBasket.has(asset);
  return `<button type="button" class="stored-card-control stored-card-select" aria-label="${checked?'取消选中':'选中'} ${esc(item.name)}" aria-pressed="${checked}" onclick="toggleStoredSelection(${item.i})">
    ${checked?storedActionIcon('<path d="m5 12 4 4L19 6"/>'):''}
  </button>
  <button type="button" class="stored-card-control stored-card-basket" aria-label="${inBasket?'移出素材篮':'加入素材篮'}" title="${inBasket?'移出素材篮':'加入素材篮'}" aria-pressed="${inBasket}" onclick="toggleStoredBasket(${item.i})">${storedActionIcon(basketIcon)}</button>`;
}
function toggleStoredSelection(index){
  const item=items[index];
  if(item?.status!=='已入库')return;
  if(selectedStoredAssets.has(item))selectedStoredAssets.delete(item);
  else selectedStoredAssets.add(item);
  drawRows();
}
function toggleStoredBasket(index){
  const item=items[index];
  if(item?.status!=='已入库')return;
  if(storedAssetBasket.delete(item))toast('已移出素材篮');
  else{
    storedAssetBasket.add(item);
    toast('已加入素材篮');
  }
  drawRows();
}
function clearStoredSelection(){
  selectedStoredAssets.clear();
  drawRows();
}
function selectedStoredBatch(){
  return items.filter(item=>item.status==='已入库'&&selectedStoredAssets.has(item));
}
const storedBatchActions=[
  ['下载','downloadStoredBatch','<path d="M12 3v12m-4-4 4 4 4-4M4 16v4h16v-4"/>'],
  ['分享','shareStoredBatch','<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.5 6.8-4m-6.8 7 6.8 4"/>'],
  ['编辑','editStoredBatch','<path d="m14 6 4 4M4 20l4-.8L20 7l-3-3L5 16z"/>'],
  ['重命名','renameStoredBatch','<path d="M3 7h15v10H3zM9 10v4m12-9v14"/>'],
  ['添加到','addStoredBatchToGroup','<path d="M4 5h12v14H4zM16 8h4v13H8m2-12v6m-3-3h6"/>'],
  ['移动到','moveStoredBatchToGroup','<path d="M3 6h7l2 2h9v12H3zM7 13h9m-3-3 3 3-3 3"/>'],
  ['加入素材篮','addStoredBatchToBasket',basketIcon],
  ['申请素材详情权限','requestStoredBatchAccess','<path d="M4 3h14v8M4 3v18h8M7 7h8m-8 4h5"/><circle cx="16" cy="15" r="4"/><path d="m19 18 3 3"/>'],
  ['更多','showStoredBatchMore','<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>'],
];
function storedBatchToolbar(){
  const count=selectedStoredBatch().length;
  if(!count)return '';
  return `<div class="stored-batch-toolbar" role="group" aria-label="批量操作，已选 ${count} 项">
    <span class="stored-batch-count">已选 ${count} 项</span>
    ${storedBatchActions.map(([label,action,path])=>`<button type="button" onclick="${action}()">${storedActionIcon(path)}<span>${label}</span></button>`).join('')}
    <button class="stored-batch-clear" type="button" aria-label="取消选择" title="取消选择" onclick="clearStoredSelection()">×</button>
  </div>`;
}
function downloadStoredBatch(batch=selectedStoredBatch()){
  const count=batch.filter(item=>startStoredDownload(item)).length;
  if(!count)return toast('所选素材暂无可下载文件');
  drawRows();
  toast('已发起 '+count+' 项下载');
}
function shareStoredBatch(batch=selectedStoredBatch()){
  if(!batch.length)return;
  showStoredActionDialog('批量分享',`<p class="sub">链接仅能在保留这些素材的演示会话中打开。</p>
    <label for="stored-batch-links">素材详情链接</label>
    <textarea id="stored-batch-links" rows="6" readonly>${esc(batch.map(storedShareAddress).join('\n'))}</textarea>`,
    '<button class="primary" onclick="copyStoredBatchLinks()">复制链接</button>');
}
async function copyStoredBatchLinks(){
  const input=$('#stored-batch-links');
  if(!input)return;
  const batch=selectedStoredBatch();
  try{
    await navigator.clipboard.writeText(input.value);
    for(const item of batch)item.shareCount=(Number(item.shareCount)||0)+1;
    drawRows();
    toast('已复制素材链接');
  }catch{
    input.select?.();
    toast('请手动复制选中的链接');
  }
}
function editStoredBatch(){
  if(!selectedStoredBatch().length)return;
  showStoredActionDialog('批量编辑',field('素材类型',opts(['保持原值',...materialKinds],'stored-batch-kind'))
    +field('使用渠道（OG）',opts(['保持原值','官微','官抖','小红书','电商'],'stored-batch-channel')),
    '<button onclick="closeModal()">取消</button><button class="primary" onclick="saveStoredBatchEdit()">保存</button>');
}
function saveStoredBatchEdit(){
  const kind=$('#stored-batch-kind').value;
  const channel=$('#stored-batch-channel').value;
  for(const item of selectedStoredBatch()){
    item.metadata={...item.metadata,
      ...(kind&&kind!=='保持原值'?{kind}:{}),
      ...(channel&&channel!=='保持原值'?{channel}:{})};
  }
  closeModal();
  drawRows();
  toast('已保存批量修改');
}
function renameStoredBatch(){
  if(!selectedStoredBatch().length)return;
  showStoredActionDialog('批量重命名',
    '<div class="field"><label for="stored-batch-name">名称前缀</label><input id="stored-batch-name" maxlength="120" placeholder="例如：新品海报"></div><p class="sub">系统会追加序号，并保留原文件扩展名。</p>',
    '<button onclick="closeModal()">取消</button><button class="primary" onclick="saveStoredBatchNames()">保存</button>');
}
function saveStoredBatchNames(){
  const base=$('#stored-batch-name').value.trim();
  if(!base)return toast('请填写名称前缀');
  const batch=selectedStoredBatch();
  const key=name=>name.normalize('NFC').toLowerCase();
  const used=new Set(items.filter(item=>!batch.includes(item)&&!item.uploadError).map(item=>key(item.name)));
  const names=batch.map((item,index)=>base+'-'+(index+1)+(item.name.match(/\.[^.]+$/)?.[0]||''));
  if(names.some(name=>used.has(key(name))))return toast('有名称重复，请更换前缀');
  batch.forEach((item,index)=>{item.name=names[index]});
  closeModal();
  drawRows();
  toast('已重命名所选素材');
}
function addStoredBatchToGroup(){showStoredBatchGroup(false)}
function moveStoredBatchToGroup(){showStoredBatchGroup(true)}
function showStoredBatchGroup(move){
  if(!selectedStoredBatch().length)return;
  showStoredActionDialog(move?'移动到素材组':'添加到素材组',
    `<div class="field"><label id="group-label">目标素材组</label>${uploadGroupPicker()}</div>`,
    `<button onclick="closeModal()">取消</button><button class="primary" onclick="saveStoredBatchGroup(${move})">确定</button>`);
}
function saveStoredBatchGroup(move){
  const group=$('#group').value;
  if(!group)return toast('请选择目标素材组');
  for(const item of selectedStoredBatch()){
    if(move&&page==='group'&&item.additionalGroups?.includes(activeMaterialGroup)){
      const remaining=item.additionalGroups.filter(path=>path!==activeMaterialGroup);
      item.additionalGroups=group===item.metadata?.group?remaining:[...new Set([...remaining,group])];
    }else if(move){
      item.metadata={...item.metadata,group};
      item.additionalGroups=(item.additionalGroups||[]).filter(path=>path!==group);
    }else if(item.metadata?.group!==group){
      item.additionalGroups=[...new Set([...(item.additionalGroups||[]),group])];
    }
  }
  closeModal();
  drawRows();
  toast(move?'已移动到目标素材组':'已添加到目标素材组');
}
function addStoredBatchToBasket(){
  for(const item of selectedStoredBatch())storedAssetBasket.add(item);
  drawRows();
  toast('已加入素材篮');
}
function requestStoredBatchAccess(){
  if(!selectedStoredBatch().length)return;
  showStoredActionDialog('申请素材详情权限',
    '<div class="field"><label for="stored-batch-access-reason">申请原因</label><textarea id="stored-batch-access-reason" rows="3" maxlength="500"></textarea></div>',
    '<button onclick="closeModal()">取消</button><button class="primary" onclick="saveStoredBatchAccess()">提交申请</button>');
}
function saveStoredBatchAccess(){
  const reason=$('#stored-batch-access-reason').value.trim();
  if(!reason)return toast('请填写申请原因');
  for(const item of selectedStoredBatch()){
    item.accessRequests=[...(item.accessRequests||[]),{by:currentReviewer,reason,status:'待处理'}];
  }
  closeModal();
  toast('已记录权限申请');
}
function showStoredBatchMore(){
  showStoredActionDialog('更多操作',
    `<button type="button" onclick="showStoredBasket()">查看素材篮（${storedAssetBasket.size}）</button>`);
}
function storedBasketItems(){
  return items.filter(item=>storedAssetBasket.has(item));
}
function showStoredBasket(tab='assets'){
  const basket=storedBasketItems();
  const showingAssets=tab==='assets';
  const entries=showingAssets?basket:[];
  const trashIcon='<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>';
  $('#overlay').innerHTML=`<div class="modalbg stored-basket-backdrop" onclick="if(event.target===this)closeModal()">
    <section id="stored-basket-panel" class="stored-basket-panel" role="dialog" aria-label="素材篮" aria-modal="true"
      onkeydown="if(event.key==='Escape')closeModal()">
      <div class="stored-basket-tabs" role="group" aria-label="查看素材篮内容">
        <button type="button" aria-pressed="${showingAssets}" onclick="showStoredBasket()">素材篮 <span>${basket.length}</span></button>
        <button type="button" aria-pressed="${!showingAssets}" onclick="showStoredBasket('ppt')">PPT 单页</button>
      </div>
      <div class="stored-basket-body">${entries.length?`<ul class="stored-basket-list">${entries.map(item=>{
        const thumbnail=item.previewUrl&&formatGroup(item.type)==='图片'
          ?`<img src="${esc(item.previewUrl)}" alt="">`
          :item.previewUrl&&formatGroup(item.type)==='视频'
            ?`<video src="${esc(item.previewUrl)}" preload="metadata" muted playsinline aria-hidden="true"></video>`
            :`<span>${esc(item.type||'文件')}</span>`;
        return `<li><div class="stored-basket-thumbnail">${thumbnail}</div>
          <div class="stored-basket-file"><strong>${esc(item.name)}</strong><div>${esc(item.type||'—')}${item.size?` <span>· ${esc(item.size)}</span>`:''}</div></div>
          <button type="button" class="stored-basket-remove" aria-label="移出 ${esc(item.name)}" onclick="removeStoredBasketItem(${items.indexOf(item)})">${storedActionIcon(trashIcon)}</button>
        </li>`;
      }).join('')}</ul>`:`<p class="sub stored-basket-empty">${showingAssets?'素材篮还没有素材':'暂无 PPT 单页'}</p>`}</div>
      <div class="stored-basket-footer">
        <button type="button" class="stored-basket-clear" onclick="clearStoredBasket()" ${entries.length?'':'disabled'}>${storedActionIcon(trashIcon)}清空素材篮</button>
        <button type="button" onclick="shareStoredBatch(storedBasketItems())" ${entries.length?'':'disabled'}>分享</button>
        <button type="button" class="primary" onclick="downloadStoredBatch(storedBasketItems())" ${entries.length?'':'disabled'}>下载</button>
      </div>
    </section>
  </div>`;
  $('#stored-basket-panel button[aria-pressed="true"]')?.focus?.({preventScroll:true});
}
function removeStoredBasketItem(index){
  storedAssetBasket.delete(items[index]);
  drawRows();
  showStoredBasket();
}
function clearStoredBasket(){
  storedAssetBasket.clear();
  drawRows();
  showStoredBasket();
}

function storedAssetCard(item){
  const metadata=item.metadata||{};
  const canPreview=item.previewUrl&&['JPG','JPEG','PNG','GIF','WEBP'].includes(item.type);
  const thumbnail=canPreview
    ?`<img src="${esc(item.previewUrl)}" alt="${esc(item.name)}">`
    :`<span class="stored-asset-format">${esc(item.type||'文件')}</span>`;
  const products=String(metadata.product||'').split('、').map(label=>label.trim()).filter(Boolean);
  const productTags=compactAssetTags(products,2,label=>`<span class="storage-tag stored-product-tag">${esc(label)}</span>`,'产品标签');
  const tags=compactAssetTags(metadata.storageTags||[],4,label=>
    `<button type="button" class="storage-tag stored-tag-button" aria-pressed="${selectedSearchTags.has(label)}" data-tag="${esc(label)}" onclick="toggleSearchTag(this.dataset.tag)">${esc(label)}</button>`,
    '内容标签');
  return `<article class="stored-asset${selectedStoredAssets.has(items[item.i])?' stored-asset-selected':''}">
    <div class="stored-asset-thumbnail">
      ${thumbnail}
      <div class="stored-asset-overlay">
        ${storedAssetMetrics(item)}
      </div>
      <span class="stored-asset-channel" aria-label="适用渠道：${esc(metadata.channel||'未填写')}">${esc(metadata.channel||'—')}</span>
      ${storedCardControls(item)}
    </div>
    <button type="button" class="stored-asset-title" onclick="openStoredAsset(${item.i})">${esc(item.name)}</button>
    ${productTags||metadata.kind?`<div class="stored-asset-classification">
      ${productTags?`<div class="stored-asset-tags" aria-label="产品标签">${productTags}</div>`:''}
      ${metadata.kind?`<span class="storage-tag stored-kind-tag" aria-label="素材类型：${esc(metadata.kind)}">${esc(metadata.kind)}</span>`:''}
    </div>`:''}
    <dl class="stored-asset-fields">
      <div><dt>来源</dt><dd>${esc(item.from||'—')}</dd></div>
      <div><dt>上传者</dt><dd>${esc(item.by||'—')}</dd></div>
      <div><dt>上传时间</dt><dd>${esc(item.uploadedAt||'—')}</dd></div>
      <div><dt>标签</dt><dd class="stored-asset-tags">${tags||'—'}</dd></div>
    </dl>
    <span class="stored-asset-version" aria-label="版本：${esc(metadata.version||'未填写')}">${esc(metadata.version||'—')}</span>
  </article>`;
}
function reviewContent(){
  return heading('待审核','审核分派给我的外部上传素材')+`<div class="card"><table>
    <thead><tr><th>素材名称</th><th>上传者</th><th>目标素材组</th><th>提交时间</th><th>操作</th></tr></thead>
    <tbody id="rows"></tbody></table></div>`;
}
function drawReviewRows(target){
  const rows=items.map((item,index)=>({item,index})).filter(({item})=>canReview(item)&&item.name.includes(query));
  target.innerHTML=rows.length?rows.map(({item,index})=>`<tr>
    <td><strong>${esc(item.name)}</strong></td><td>${esc(item.by)}<div class="muted">${esc(item.from)}</div></td>
    <td>${esc(item.metadata?.group)}</td><td>${esc(item.uploadedAt)}</td>
    <td>${item.aiState?.phase==='running'?'<span class="sub">AI 识别中</span>':`<button onclick="openExternalReview(${index})">去审核</button>`}</td>
  </tr>`).join(''):'<tr><td colspan="5" class="empty">暂无待审核素材</td></tr>';
}
function openExternalReview(index){
  if(!canReview(items[index]))return toast('此素材当前不可审核');
  if(items[index].aiState?.phase==='running')return toast('AI 正在识别，请稍候');
  const item=items[index];
  captureUploadDraft();
  selected=index;
  externalReviewItem=item;
  const draft={
    ...item,
    metadata:{...item.metadata,storageTags:[...(item.metadata?.storageTags||[])]},
    aiState:{...item.aiState,missing:[...(item.aiState?.missing||[])]},
    editedFields:[...(item.editedFields||[])],
    queueSource:item,
    checked:true,
  };
  files=[draft];
  displayedUploadFile=null;
  activeUploadFile=draft;
  go('upload');
}
const archivedFilters={mode:'',from:'',to:'',uploader:''};
let archivedFilterDraft;
function showArchivedFilterDialog(){
  archivedFilterDraft={...archivedFilters,mode:archivedFilters.mode||'date'};
  renderArchivedFilterDialog();
}
function archivedDateFields(){
  const {from,to}=archivedFilterDraft;
  const range=archivedFilterDraft.range??Boolean(to);
  return `<label>${range?'开始日期':'选择日期'}<input id="archived-from" type="date" required value="${esc(from)}"></label>
    ${range?`<label>结束日期<input id="archived-to" type="date" required value="${esc(to)}"></label>`:''}`;
}
function renderArchivedFilterDialog(){
  const {mode,to,uploader}=archivedFilterDraft;
  const range=archivedFilterDraft.range??Boolean(to);
  showStoredActionDialog('筛选已入库素材',`<div class="archived-dialog-tabs" role="group" aria-label="筛选条件">
    <button type="button" aria-pressed="${mode==='date'}" onclick="changeArchivedFilterMode('date')">上传时间</button>
    <button type="button" aria-pressed="${mode==='uploader'}" onclick="changeArchivedFilterMode('uploader')">上传者</button>
  </div>
  <form id="archived-filter-form" onsubmit="event.preventDefault();applyArchivedFilter()">
    ${mode==='date'?`<div class="archived-date-presets">
      <button type="button" onclick="applyArchivedDatePreset(0)">今天</button>
      <button type="button" onclick="applyArchivedDatePreset(1)">昨天</button>
      <button type="button" onclick="applyArchivedDatePreset(0,6)">近 7 天</button>
    </div>
    <label class="archived-date-mode">日期选择方式
      <select onchange="setArchivedDateRange(this.value==='range')">
        <option value="single" ${range?'':'selected'}>单个日期</option>
        <option value="range" ${range?'selected':''}>日期范围</option>
      </select>
    </label>
    <div id="archived-date-fields" class="archived-date-range">${archivedDateFields()}</div>`:`<label class="archived-uploader-label">上传者<input id="archived-uploader" type="search" required placeholder="请输入上传者姓名" value="${esc(uploader)}"></label>`}
    <p id="archived-filter-error" class="archived-filter-error" role="alert"></p>
  </form>`,
  '<button type="button" onclick="closeModal()">取消</button><button class="primary" type="submit" form="archived-filter-form">应用筛选</button>');
}
function changeArchivedFilterMode(mode){
  archivedFilterDraft.mode=mode;
  renderArchivedFilterDialog();
  if(mode==='uploader')$('#archived-uploader')?.focus?.();
}
function setArchivedDateRange(range){
  archivedFilterDraft.from=$('#archived-from').value;
  archivedFilterDraft.range=range;
  archivedFilterDraft.to='';
  $('#archived-date-fields').innerHTML=archivedDateFields();
  $('#archived-filter-error').textContent='';
}
function archivedDateOffset(days){
  const date=new Date();
  date.setDate(date.getDate()-days);
  return [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
}
function applyArchivedDatePreset(offset,days=0){
  saveArchivedFilter({mode:'date',from:archivedDateOffset(offset+days),to:days?archivedDateOffset(offset):'',uploader:''});
}
function applyArchivedFilter(){
  if(archivedFilterDraft.mode==='uploader'){
    const uploader=$('#archived-uploader').value.trim();
    if(!uploader){$('#archived-filter-error').textContent='请输入上传者姓名';return}
    saveArchivedFilter({mode:'uploader',from:'',to:'',uploader});
    return;
  }
  const range=archivedFilterDraft.range??Boolean(archivedFilterDraft.to);
  const from=$('#archived-from').value,to=range?$('#archived-to').value:'';
  if(!from||(range&&!to)){
    $('#archived-filter-error').textContent=range?'请选择开始和结束日期':'请选择日期';
    return;
  }
  if(to&&to<from){
    $('#archived-filter-error').textContent='结束日期不能早于开始日期';
    return;
  }
  saveArchivedFilter({mode:'date',from,to,uploader:''});
}
function saveArchivedFilter(filter){
  Object.assign(archivedFilters,filter);
  closeModal();
  render();
  $('#archived-filter-trigger')?.focus?.({preventScroll:true});
}
function clearArchivedFilter(){
  saveArchivedFilter({mode:'',from:'',to:'',uploader:''});
}
function archivedFilterBar(){
  const {mode,from,to,uploader}=archivedFilters;
  const label=mode==='date'?(to&&to!==from?from+' 至 '+to:from):uploader||'筛选';
  return `<div class="archived-filters" role="group" aria-label="筛选已入库素材">
    <button type="button" id="archived-filter-trigger" aria-haspopup="dialog" onclick="showArchivedFilterDialog()">
      <span aria-hidden="true" class="archived-filter-icon">⇅</span> ${esc(label)}
    </button>
    ${mode?'<button type="button" class="archived-filter-clear" aria-label="取消筛选" title="取消筛选" onclick="clearArchivedFilter()">×</button>':''}
  </div>`;
}
function matchesArchivedFilters(item){
  const {mode,from,to,uploader}=archivedFilters;
  if(mode==='uploader')return String(item.by||'').includes(uploader);
  if(mode!=='date')return true;
  const date=String(item.uploadedAt||'').slice(0,10);
  return Boolean(date&&date>=from&&date<=(to||from));
}
function archivedContent(){
  const count=items.filter(item=>item.status==='已入库').length;
  return heading('已入库','查看已完成入库的素材')+`<div class="archived-toolbar">
    <span class="archived-total">共 ${count} 项</span>
    ${archivedFilterBar()}
  </div><div class="card archived-list">
    <table aria-label="已入库素材">
      <thead><tr><th scope="col">素材</th><th scope="col">上传者</th><th scope="col">来源素材组</th><th scope="col">上传时间</th><th scope="col">格式</th></tr></thead>
      <tbody id="rows"></tbody>
    </table>
  </div>`;
}
function drawArchivedRows(target){
  const archived=items.map((item,index)=>({item,index}))
    .filter(({item})=>item.status==='已入库'&&item.name.includes(query)&&matchesArchivedFilters(item))
    .sort((a,b)=>(b.item.archivedAt??0)-(a.item.archivedAt??0)
      ||(b.item.archiveOrder??0)-(a.item.archiveOrder??0)||b.index-a.index);
  target.innerHTML=archived.length?archived.map(({item,index})=>{
    const canPreview=item.previewUrl&&['JPG','JPEG','PNG','GIF','WEBP'].includes(item.type);
    const thumbnail=canPreview
      ?`<button type="button" class="archived-thumbnail" aria-label="查看 ${esc(item.name)} 大图" onclick="showAssetImage(${index})"><img src="${esc(item.previewUrl)}" alt=""></button>`
      :`<span class="archived-thumbnail" aria-hidden="true">${esc(item.type||'文件')}</span>`;
    return `<tr>
      <td><div class="archived-file">${thumbnail}<button type="button" class="stored-asset-title" onclick="openStoredAsset(${index})">${esc(item.name)}</button></div></td>
      <td>${esc(item.by||'—')}</td><td>${esc(item.metadata?.group||'—')}</td><td>${esc(item.uploadedAt||'—')}</td><td>${esc(item.type||'—')}</td>
    </tr>`;
  }).join(''):'<tr><td colspan="5" class="empty">暂无符合条件的已入库素材</td></tr>';
}
function drawRows(){
  const basketCount=$('#client-basket-count');
  if(basketCount){
    basketCount.textContent=storedAssetBasket.size;
    basketCount.hidden=!storedAssetBasket.size;
  }
  if(page==='queue'){drawQueueRows();return}if(!$('#rows'))return;if(page==='archived'){drawArchivedRows($('#rows'));return}if(page==='review'){drawReviewRows($('#rows'));return}let arr=items.map((x,i)=>({...x,i})).filter(x=>x.name.includes(query)&&(page==='review'?x.status==='待人工审核':page==='library'?x.status==='已入库':page==='group'?groupMatchesItem(x):filter==='全部素材'||x.status===filter));
if(page==='library'||page==='group'){
  if(appliedSearchTags.size)arr=arr.filter(item=>[...appliedSearchTags].every(label=>item.metadata?.storageTags?.includes(label)));
  const count=$('#stored-list-count');
  if(count)count.textContent=`（${arr.length}）`;
  const visible=new Set(arr.map(item=>items[item.i]));
  for(const item of selectedStoredAssets)if(!visible.has(item))selectedStoredAssets.delete(item);
  const batchHost=$('#stored-batch-host');
  if(batchHost)batchHost.innerHTML=storedBatchToolbar();
  arr.sort((a,b)=>(a.archiveOrder??0)-(b.archiveOrder??0));
  $('#rows').innerHTML=arr.length
    ?arr.map(storedAssetCard).join('')
    :'<div class="empty stored-asset-empty">暂无符合条件的素材</div>';
  return;
}
$('#rows').innerHTML=arr.length?arr.map(x=>`<tr><td><div class="row" style="gap:0;flex-wrap:nowrap"><span class="fileicon">${x.type}</span><div><b>${esc(x.name)}</b><div class="muted" style="margin-top:7px">${x.size} · 2026-11-04</div></div></div></td><td>${esc(x.from)}<div class="muted" style="margin-top:6px">${esc(x.by)}</div></td><td>${tag(x.manual?'纯人工审核':x.ai?'字段完整':'待补充字段')}</td><td>${esc(x.metadata?.channel||'—')}</td><td>${tag(x.status)}</td><td><button onclick="selected=${x.i};go('detail')">${x.status==='待人工审核'?'去审核':x.status==='待补充字段'?'补全信息':'查看详情'} →</button></td></tr>`).join(''):`<tr><td colspan="6" class="empty">暂无符合条件的素材</td></tr>`}
let uploadDraft={},lastRenderedPage='',activeUploadFile=null,displayedUploadFile=null;
const uploadFieldIds=['group','desc','kind','product','channel','version'];
function captureUploadDraft(){if(!['upload','agency'].includes(lastRenderedPage))return;for(let id of lastRenderedPage==='agency'?['channel','version']:uploadFieldIds){let node=$('#'+id);if(node&&node.tagName)uploadDraft[id]=node.value}if(displayedUploadFile){displayedUploadFile.metadata={...uploadDraft};let checkbox=$('#flatten-folders');if(checkbox)displayedUploadFile.flattenFolders=checkbox.checked}}
function initialFileFields(){return {group:'CRM 素材库 / 2026年官微官抖素材',desc:'',kind:'',product:'',channel:'',version:'V1.0',storageTags:[]}}
function ensureFileFields(file){if(!file.metadata)file.metadata=initialFileFields();if(!file.aiState)file.aiState={phase:'idle',token:0,mode:isFailureDemoFile(file)?'partial':'success',missing:[],showValidation:false};return file}
function restoreActiveFields(){if(!files.includes(activeUploadFile))activeUploadFile=files[0]||null;if(activeUploadFile){ensureFileFields(activeUploadFile);uploadDraft={...activeUploadFile.metadata};uploadAI=activeUploadFile.aiState}else{uploadDraft=initialFileFields();uploadAI={phase:'idle',token:0,mode:'success',missing:[],showValidation:false}}for(let id of uploadFieldIds){let node=$('#'+id);if(node)node.value=uploadDraft[id]||''}paintUploadGroup();paintProductSelection();if($('#desc-count'))$('#desc-count').textContent=(uploadDraft.desc||'').length+'/500';if($('#flatten-folders'))$('#flatten-folders').checked=!!activeUploadFile?.flattenFolders;displayedUploadFile=activeUploadFile;paintStorageTags();paintVersionPanel()}
function setUploadChecked(index,checked){if(!files[index])return;files[index].checked=!!checked;render()}
function setAllUploadChecked(checked){files.forEach(file=>file.checked=!!checked);render()}
function switchUploadFile(index){if(!files[index])return;captureUploadDraft();activeUploadFile=files[index];render();$('.upload-meta')?.scrollTo?.({top:0,behavior:'smooth'})}
function keepPageLeftAligned(){if(document.documentElement)document.documentElement.scrollLeft=0;if(document.body)document.body.scrollLeft=0}
document.addEventListener?.('focusin',()=>{keepPageLeftAligned();if(typeof requestAnimationFrame==='function')requestAnimationFrame(keepPageLeftAligned)});
const baseRender=render;render=function(){captureUploadDraft();if(['upload','agency'].includes(page)){if(!files.includes(activeUploadFile))activeUploadFile=files[0]||null;files.forEach(ensureFileFields)}baseRender();if(['upload','agency'].includes(page))restoreActiveFields();else displayedUploadFile=null;lastRenderedPage=page;drawRows();syncUploadAI();keepPageLeftAligned();fitApplicationViewport()};
function field(label,control,req=false,showStatus=true){return `${label==='素材简介'&&showStatus?'<div id="upload-ai-status" class="upload-ai-status" role="status" aria-live="polite"></div>':''}<div class="field"><label>${req?'<span class="required">* </span>':''}${label}</label>${control}</div>`}function opts(a,id){if(id==='group')a=[...new Set([...a,...materialGroups.map(name=>'CRM · 品牌内容团队 / '+name),...files.map(file=>file.metadata?.group).filter(Boolean)])];return `<select ${id?`id="${id}"`:''}>${a.map(t=>`<option>${esc(t)}</option>`).join('')}</select>`}
const materialKinds=['6P','案例','菜式应用','产品惠益','酱汁应用','竞品对比','客户洞察','品牌品类','试味 DEMO','Other Say'];
const productNames=['金客满','鲜麻青花椒酱','酸辣金汤酱','辣鲜露','浓缩鸡汁','双蚝蚝油'];
function productDropdown(){
  return `<details class="product-dropdown">
    <summary aria-label="选择产品标签，可多选"><span id="product-label">请选择产品标签</span><span aria-hidden="true">⌄</span></summary>
    <input id="product" type="hidden" value="">
    <div class="product-options" role="group" aria-label="产品标签，可多选">
      ${productNames.map((name,i)=>`<label class="product-option">
        <input class="check" type="checkbox" value="${esc(name)}" onchange="toggleProduct(${i},this.checked)">
        <span>${esc(name)}</span>
      </label>`).join('')}
    </div>
  </details>`;
}
function paintProductSelection(){
  const field=$('#product');
  const summary=$('#product-label');
  if(!field||!summary)return;
  const selected=field.value.split('、');
  summary.textContent=field.value||'请选择产品标签';
  summary.title=field.value;
  for(const checkbox of document.querySelectorAll('.product-options input')){
    checkbox.checked=selected.includes(checkbox.value);
  }
}
function toggleProduct(index,checked){
  const field=$('#product');
  const selected=new Set(field.value.split('、').filter(Boolean));
  if(checked)selected.add(productNames[index]);
  else selected.delete(productNames[index]);
  field.value=Array.from(selected).join('、');
  paintProductSelection();
  onUploadFieldEdit({target:field});
}
document.addEventListener('click',event=>{
  if(!event.target.closest('.product-dropdown'))$('.product-dropdown[open]')?.removeAttribute('open');
});
document.addEventListener('keydown',event=>{
  if(event.key!=='Escape'||!event.target.closest('.product-dropdown[open]'))return;
  const dropdown=event.target.closest('.product-dropdown[open]');
  dropdown.removeAttribute('open');
  dropdown.querySelector('summary').focus({preventScroll:true});
});
function formatGroup(type){return ({JPG:'图片',JPEG:'图片',PNG:'图片',GIF:'图片',WEBP:'图片',MP4:'视频',MOV:'视频',AVI:'视频',PDF:'文档',DOC:'文档',DOCX:'文档',PPT:'文档',PPTX:'文档',PSD:'设计源文件',AI:'设计源文件',SKETCH:'设计源文件',FIG:'设计源文件',TXT:'纯文本',MD:'纯文本',CSV:'表格',XLS:'表格',XLSX:'表格',TTF:'字体文件',OTF:'字体文件',WOFF:'字体文件',WOFF2:'字体文件',MP3:'音频',WAV:'音频',AAC:'音频',ZIP:'压缩包',RAR:'压缩包','7Z':'压缩包'})[type]||'其他格式'}
function aiSupported(type){return ['JPG','JPEG','PNG','MP4','PDF','TXT'].includes(type)}
function aiReviewPanel(x,m){if(x.manual)return `<div class="card"><h2>纯人工审核</h2><p class="sub">文件格式：${formatGroup(x.type)}（${esc(x.type)}）。当前不在 演示处理范围内，已跳过 预处理。请人工核对素材类别、规范字段、标签及简介。</p><button onclick="editMeta()">人工补充 / 修改信息</button></div>`;return `<div class="card"><div class="row" style="justify-content:space-between"><h2>输出 · 审核确认</h2>${tag('模拟识别结果')}</div><p class="sub">仅处理限定范围的文件。请核对类别、模板字段、标签与简介，可修改后再审核确认。</p><div class="fields"><div>${field('文件格式类型',`<input value="${formatGroup(x.type)} · ${esc(x.type)}" readonly>`)}</div><div>${field('判断类别',`<input value="${esc(m.kind)}" readonly>`)}</div></div><div class="notice">规范字段模板：${esc(m.kind)}<br>按该类别的字段规则进行预提取；以下内容为可编辑的演示结果，真实模板规则待业务配置。</div><div class="fields">${field('模板字段 · 素材标题',`<input id="ai-title" value="${esc(x.aiTitle||x.name.replace(/\.[^.]+$/,''))}">`)}${field('模板字段 · 应用 / 业务场景',`<input id="ai-scene" value="${esc(x.aiScene||m.kind)}">`)}</div>${field('素材标签',`<input id="ai-tags" value="${esc(x.aiTags||m.product+'、'+m.kind)}">`)}${field('生成的素材简介',`<textarea id="ai-summary" rows="3">${esc(x.aiSummary||m.desc||m.product+'相关'+m.kind+'素材，供业务传播使用。')}</textarea>`)}<button onclick="saveAIResults()">保存 结果修订</button></div>`}
function saveAIResults(){let x=items[selected];x.aiTitle=$('#ai-title').value;x.aiScene=$('#ai-scene').value;x.aiTags=$('#ai-tags').value;x.aiSummary=$('#ai-summary').value;toast('结果修订已保存')}
const versionSimilarityThreshold=0.92;
let independentVersionSequence=0;
function parseMaterialVersion(value){let match=String(value||'').trim().match(/^v?([1-9]\d*)\.(0|[1-9]\d*)(?:\.(0|[1-9]\d*))?$/i);if(!match)return null;let parts=[Number(match[1]),Number(match[2]),Number(match[3]||0)];return parts.every(Number.isSafeInteger)?parts:null}
function compareMaterialVersions(a,b){let x=parseMaterialVersion(a),y=parseMaterialVersion(b);if(!x||!y)return 0;for(let i=0;i<3;i++)if(x[i]!==y[i])return x[i]>y[i]?1:-1;return 0}
function nextMaterialVersion(value,level='major'){let v=parseMaterialVersion(value)||[1,0,0];if(level==='minor')return 'V'+v[0]+'.'+(v[1]+1);if(level==='patch')return 'V'+v[0]+'.'+v[1]+'.'+(v[2]+1);return 'V'+(v[0]+1)+'.0'}
function imageSimilarity(a,b){if(!a||!b||a.bits.length!==b.bits.length)return 0;let structure=1-a.bits.filter((bit,i)=>bit!==b.bits[i]).length/a.bits.length;let color=a.hist.reduce((sum,value,i)=>sum+Math.min(value,b.hist[i]),0)/3;let aspect=Math.min(a.aspect,b.aspect)/Math.max(a.aspect,b.aspect);return structure*.7+color*.2+aspect*.1}
async function describeLocalImage(file){if(!file.sourceBlob||typeof createImageBitmap!=='function'||!['JPG','JPEG','PNG','GIF','WEBP'].includes(file.type))return;let bitmap;try{bitmap=await createImageBitmap(file.sourceBlob);let canvas=document.createElement('canvas');canvas.width=16;canvas.height=16;let context=canvas.getContext('2d',{willReadFrequently:true});if(!context)return;context.drawImage(bitmap,0,0,16,16);let data=context.getImageData(0,0,16,16).data,lum=[],hist=Array(24).fill(0);for(let i=0;i<data.length;i+=4){lum.push(data[i]*.299+data[i+1]*.587+data[i+2]*.114);for(let c=0;c<3;c++)hist[c*8+Math.min(7,Math.floor(data[i+c]/32))]+=1/256}let mean=lum.reduce((a,b)=>a+b,0)/lum.length;let variance=lum.reduce((sum,x)=>sum+(x-mean)**2,0)/lum.length;file.visualDescriptor={bits:lum.map(x=>x>=mean?1:0),hist,aspect:bitmap.width/bitmap.height,variance};}catch{file.visualAnalysisFailed=true}finally{bitmap?.close?.()}}
function beginVisualVersionAnalysis(file,suggestVersion=true){if(file.visualAnalysisStarted)return;file.visualAnalysisStarted=true;if(file.sourceBlob){file.visualPending=true;file.visualPromise=describeLocalImage(file).finally(()=>{file.visualPending=false;if(suggestVersion&&fileIsPendingOrListed(file)){refreshMaterialVersion(file);if(file===activeUploadFile&&['upload','agency'].includes(page)){uploadDraft.version=file.metadata.version;let n=$('#version');if(n)n.value=file.metadata.version;paintVersionPanel()}}})}}
function versionFamily(file){return file.versionFamily||null}
function similarityCandidatePool(){return [...new Set([...items,...files,...pendingLocalFiles].map(file=>file.queueSource||file))]}
function isPriorVersionCandidate(item,file){if(item===file||item===file.queueSource)return false;if(item.status==='已入库')return true;let pool=similarityCandidatePool(),current=pool.indexOf(file.queueSource||file),previous=pool.indexOf(item);return previous>=0&&(current<0||previous<current)}
function findSimilarLibraryImage(file){if(!file.visualDescriptor||file.visualDescriptor.variance<30)return null;let ranked=similarityCandidatePool().filter(x=>isPriorVersionCandidate(x,file)&&x.visualDescriptor&&x.visualDescriptor.variance>=30).map(x=>({item:x,score:imageSimilarity(file.visualDescriptor,x.visualDescriptor)})).filter(x=>x.score>=versionSimilarityThreshold).sort((a,b)=>b.score-a.score);return ranked[0]||null}
function refreshMaterialVersion(file,reserved=[]){ensureFileFields(file);if(!file.versionFamily){let match=findSimilarLibraryImage(file);if(match){file.versionFamily=match.item.versionFamily||('material-'+Date.now()+'-'+(++independentVersionSequence));match.item.versionFamily=file.versionFamily;file.versionMatch={name:match.item.name,score:match.score}}else file.versionFamily='new-'+Date.now()+'-'+(++independentVersionSequence)}if(!file.versionMatch&&!file.versionIndependent){let match=findSimilarLibraryImage(file);if(match&&match.item.versionFamily!==file.versionFamily){file.versionFamily=match.item.versionFamily||('material-'+Date.now()+'-'+(++independentVersionSequence));match.item.versionFamily=file.versionFamily;file.versionMatch={name:match.item.name,score:match.score}}}let history=[...similarityCandidatePool(),...reserved].filter(x=>isPriorVersionCandidate(x,file)&&versionFamily(x)===file.versionFamily&&parseMaterialVersion(x.metadata?.version)).sort((a,b)=>compareMaterialVersions(b.metadata.version,a.metadata.version));file.versionBase=history[0]?{name:history[0].name,version:history[0].metadata.version}:null;file.versionLevel=file.versionLevel||'major';if(file.versionMode!=='manual')file.metadata.version=file.versionBase?nextMaterialVersion(file.versionBase.version,file.versionLevel):'V1.0';return file.metadata.version}
function versionControl(){return `<div id="version-panel" class="version-panel"></div><div id="version-error" class="version-error" role="alert"></div>`}
function paintVersionPanel(){let panel=$('#version-panel');if(!panel)return;let f=storageTagFile();if(!f){panel.innerHTML='';return}let base=f.versionBase;panel.innerHTML=f.visualPending?'<span class="ai-spinner" aria-hidden="true"></span> 正在查找相似图片…':base?`<div class="version-linked">已关联历史素材：${esc(base.name)}<br>当前最新版本：<b>${esc(base.version)}</b>${f.versionMatch?`<br>相似度：${Math.round(f.versionMatch.score*100)}%（原型本地图片比对）`:''}</div>`:f.visualAnalysisFailed?'暂未能读取图片特征，可手动填写版本号；默认 V1.0。':f.versionIndependent?'已作为独立素材，默认 V1.0。':'未找到可关联的相似图片，默认 V1.0。';let input=$('#version');if(input){input.classList?.remove('ai-field-error');input.removeAttribute?.('aria-invalid')}if($('#version-error'))$('#version-error').textContent=''}
function changeVersionLevel(level){if(!['major','minor','patch'].includes(level)||!activeUploadFile)return;captureUploadDraft();let f=activeUploadFile;f.versionLevel=level;f.versionMode='auto';f.editedFields=(f.editedFields||[]).filter(id=>id!=='version');refreshMaterialVersion(f);uploadDraft.version=f.metadata.version;$('#version').value=f.metadata.version;paintVersionPanel()}
function makeIndependentVersion(){let f=activeUploadFile;if(!f)return;captureUploadDraft();f.versionFamily='independent-'+Date.now()+'-'+(++independentVersionSequence);f.versionIndependent=true;f.versionMatch=null;f.versionMode='auto';f.versionLevel='major';refreshMaterialVersion(f);uploadDraft.version=f.metadata.version;$('#version').value=f.metadata.version;paintVersionPanel()}
function validateVersionBatch(chosen){let reserved=[];for(let f of chosen){refreshMaterialVersion(f,reserved);let version=String(f.metadata.version||'').trim().toUpperCase().replace(/^V?/,'V'),error='';if(!parseMaterialVersion(version))error='请输入正确的版本号，例如 V1.0、V2.1 或 V2.1.1';else if(f.versionBase&&compareMaterialVersions(version,f.versionBase.version)<=0)error='新版本必须高于当前最新版本 '+f.versionBase.version;if(error){switchUploadFile(files.indexOf(f));$('#version').classList?.add('ai-field-error');$('#version').setAttribute?.('aria-invalid','true');$('#version-error').textContent=error;toast(error);return false}f.metadata.version=version;reserved.push({...f,status:'已入库'});}if(activeUploadFile){uploadDraft.version=activeUploadFile.metadata.version;$('#version').value=uploadDraft.version;paintVersionPanel()}return true}
function storageTagFile(){return ['upload','agency'].includes(page)?activeUploadFile:storedEditDraft||items[selected]}
const storageTagOptions=['顺德鱼生','排骨','法棍','西餐','中餐','海鲜','肉类','面包','凉菜','热菜'];
function storageTagControl(label='入库标签'){return `<div class="storage-tags-field"><label>${label}</label><div id="storage-tags-picker" class="storage-tags-picker" aria-expanded="false" onclick="if(!event.target.closest('button'))toggleStorageTagDropdown()"><div id="storage-tags-list" class="storage-tags-list"></div><button class="storage-tags-arrow" aria-label="展开更多入库标签" onclick="toggleStorageTagDropdown()">⌄</button></div><div id="storage-tags-dropdown" class="storage-tags-dropdown" hidden><div id="storage-tags-options" class="storage-tags-options"></div><div id="custom-storage-tag" class="custom-storage-tag" hidden><input id="custom-storage-tag-input" maxlength="30" placeholder="请输入自定义标签" onkeydown="if(event.key==='Enter'){event.preventDefault();addStorageTag()}else if(event.key==='Escape'){cancelStorageTag()}"><button onclick="addStorageTag()">添加</button><button onclick="cancelStorageTag()">取消</button></div></div></div>`}
function paintStorageTags(){let target=$('#storage-tags-list');if(!target)return;let f=storageTagFile();let tags=f?.metadata?.storageTags||[];target.innerHTML=tags.length?`<span class="storage-tags-summary" title="${esc(tags.join('、'))}">${esc(tags.join('、'))}</span>`:`<span class="muted">${f?.aiState?.phase==='running'?'识别中…':'请选择入库标签'}</span>`;let options=$('#storage-tags-options');if(options)options.innerHTML=tags.map((tag,i)=>`<span class="storage-tag editable-storage-tag"><span>${esc(tag)}</span><button class="storage-tag-remove" aria-label="删除标签 ${esc(tag)}" title="删除标签" onclick="event.stopPropagation();removeStorageTag(${i})">×</button></span>`).join('')+`<button class="storage-tag-plus" aria-label="添加自定义入库标签" title="添加自定义标签" onclick="openStorageTag()" ${!f?'disabled':''}>＋</button>`}
function toggleStorageTagDropdown(){let dropdown=$('#storage-tags-dropdown');if(!dropdown)return;dropdown.hidden=!dropdown.hidden;$('#storage-tags-picker')?.setAttribute?.('aria-expanded',String(!dropdown.hidden));$('#storage-tags-list')?.classList?.toggle('expanded',!dropdown.hidden)}
function closeStorageTagDropdown(){let n=$('#storage-tags-dropdown');if(n)n.hidden=true;$('#storage-tags-picker')?.setAttribute?.('aria-expanded','false');$('#storage-tags-list')?.classList?.remove('expanded')}
function writeStorageTags(tags){let f=storageTagFile();if(!f)return;captureUploadDraft();f.metadata.storageTags=[...tags];if(f===activeUploadFile)uploadDraft.storageTags=[...tags];paintStorageTags()}
function removeStorageTag(index){let f=storageTagFile();if(!f)return;let tags=[...(f.metadata.storageTags||[])];if(index<0||index>=tags.length)return;let removed=tags.splice(index,1)[0];f.dismissedStorageTags=[...new Set([...(f.dismissedStorageTags||[]),removed])];writeStorageTags(tags)}
function selectStorageTag(value){let f=storageTagFile();if(!f)return;let tags=f.metadata.storageTags||[];if(tags.includes(value))return;f.dismissedStorageTags=(f.dismissedStorageTags||[]).filter(tag=>tag!==value);writeStorageTags([...tags,value])}
function openStorageTag(){if(!storageTagFile())return;$('#storage-tags-dropdown').hidden=false;$('#storage-tags-picker')?.setAttribute?.('aria-expanded','true');$('#custom-storage-tag').hidden=false;$('#custom-storage-tag-input').value='';$('#custom-storage-tag-input').focus?.({preventScroll:true})}
function cancelStorageTag(){$('#custom-storage-tag').hidden=true}
function addStorageTag(){let f=storageTagFile();if(!f)return;let value=$('#custom-storage-tag-input').value.trim();if(!value)return toast('请输入标签内容');if(value.length>30)return toast('标签最多30个字');let tags=f.metadata.storageTags||[];if(tags.includes(value))return toast('该标签已存在');f.dismissedStorageTags=(f.dismissedStorageTags||[]).filter(tag=>tag!==value);writeStorageTags([...tags,value]);cancelStorageTag()}
document.addEventListener?.('click',event=>{if(!event.target.closest?.('.storage-tags-field'))closeStorageTagDropdown()});document.addEventListener?.('keydown',event=>{if(event.key==='Escape')closeStorageTagDropdown()});
function suggestedStorageTags(file){let name=file.name+' '+(file.originalName||'');let tags=['顺德鱼生','排骨','法棍','西餐'].filter(tag=>name.includes(tag)||tag==='顺德鱼生'&&name.includes('鱼生'));return tags.length?tags:['顺德鱼生','排骨','法棍','西餐']}
function meta(){return `<div class="field"><label id="group-label"><span class="required">* </span>加入素材组</label>${uploadGroupPicker()}</div>`+storageTagControl()+`<div style="height:20px"></div>`+field('素材简介','<textarea id="desc" rows="3" maxlength="500" placeholder="请输入素材简介，可包含创意背景或使用说明（最多500字）"></textarea>')+`<div class="fields">`+field('素材类型',opts(['请选择素材类型',...materialKinds],'kind'),true)+field('产品标签',productDropdown(),true)+field('使用渠道（OG）',opts(['请选择使用渠道','官微','官抖','小红书','电商'],'channel'),true)+field('版本','<input id="version" placeholder="例如 V1.0" value="V1.0">'+versionControl(),true)+`</div>`}
function upload(){
  const reviewing=Boolean(externalReviewItem);
  const back=reviewing?"go('review')":"go('queue',{cancelApproval:true})";
  return `<div class="upload-shell"><div class="upload-top"><div class="row"><button onclick="${back}" aria-label="返回">←</button><h2>素材入库</h2></div><div class="row"><button onclick="${back}">取消</button>${reviewing?`<button class="danger" onclick="openReviewReturn()">退回修改</button><button class="primary" onclick="reviewAction(true)">审核通过并入库</button>`:`<button class="primary" onclick="submitUpload(false)">入库</button>`}</div></div><div class="upload-body"><section class="upload-files"><div class="upload-tools"><div class="row"><span class="sub">已选 ${files.filter(f=>f.checked).length} 项</span>${reviewing?'':`<button onclick="renameSelected()" ${files.filter(f=>f.checked).length!==1?'disabled':''}>重命名所选</button><button onclick="files=files.filter(f=>!f.checked);render()" ${!files.some(f=>f.checked)?'disabled':''}>删除所选</button>`}</div></div><input type="file" id="picker" multiple style="display:none" onchange="addFiles(this.files,{toQueue:true})"><div class="upload-table" ${reviewing?'':`ondragover="event.preventDefault()" ondrop="event.preventDefault();addFiles(event.dataTransfer.files,{toQueue:true})"`}><table><thead><tr><th class="upload-selection-cell" style="width:48px"><input class="check" type="checkbox" aria-label="全选" ${files.length&&files.every(f=>f.checked)?'checked':''} onchange="setAllUploadChecked(this.checked)"></th><th>文件名称</th><th>文件重复检测</th><th>类型</th><th>大小</th>${reviewing?'':'<th>操作</th>'}</tr></thead><tbody>${files.map((f,i)=>`<tr><td class="upload-selection-cell"><input class="check" type="checkbox" aria-label="选择 ${esc(f.name)}" ${f.checked?'checked':''} onchange="setUploadChecked(${i},this.checked)"></td><td><div class="upload-file-name">${f.previewUrl&&['JPG','JPEG','PNG','GIF','WEBP'].includes(f.type)?`<img class="upload-file-thumbnail" src="${esc(f.previewUrl)}" alt="">`:''}<button class="upload-file-link ${f===activeUploadFile?'active':''}${f.aiState?.phase==='failed'?' ai-failed':''}" aria-pressed="${f===activeUploadFile}" onclick="switchUploadFile(${i})">${esc(f.name)}</button></div></td><td id="duplicate-${i}" aria-live="polite">${duplicateMarkup(f,i)}</td><td>${f.type}</td><td>${f.size}</td>${reviewing?'':`<td><button onclick="files.splice(${i},1);render()">删除</button></td>`}</tr>`).join('')}</tbody></table>${files.length?'':`<div class="upload-empty" onclick="$('#picker').click()"><span style="font-size:30px;color:#9aacaa">↥</span><p>请选择需要上传的素材</p><small>点击选择文件，或将文件拖拽至此</small><p><small>支持图片、视频、文档、设计源文件、纯文本、表格、字体、音频、压缩包及其他格式；单文件 ≤ 500 MB</small></p></div>`}</div></section><aside class="upload-meta"><div class="upload-group"><h2 id="group-label">加入素材组</h2><div style="margin-top:18px">${uploadGroupPicker()}</div></div><div class="upload-fields">${reviewing&&externalReviewItem.submissionNote?`<div class="notice"><strong>上传者备注</strong><div style="white-space:pre-wrap;overflow-wrap:anywhere">${esc(externalReviewItem.submissionNote)}</div></div>`:''}<div id="upload-ai-status" class="upload-ai-status" role="status" aria-live="polite"></div>${storageTagControl()}${field('素材简介','<textarea id="desc" rows="5" maxlength="500" placeholder="请填写素材简介" oninput="this.nextElementSibling.textContent=this.value.length+String.fromCharCode(47)+500"></textarea><div id="desc-count" class="muted" style="text-align:right;margin-top:5px">0/500</div>',false,false)}${field('素材类型',opts(['请选择素材类型',...materialKinds],'kind'),true)}${field('产品标签',productDropdown(),true)}${field('使用渠道（OG）',opts(['请选择使用渠道','官微','官抖','小红书','电商'],'channel'),true)}${field('版本','<input id="version" value="V1.0" placeholder="请填写版本">'+versionControl(),true)}</div></aside></div></div>`}
function renameSelected(){let i=files.findIndex(f=>f.checked);if(i<0)return;$('#overlay').innerHTML=`<div class="modalbg"><div class="modal"><h2>重命名素材</h2><div style="margin-top:24px">${field('文件名称',`<input id="newname" value="${esc(files[i].name)}">`,true)}</div><div class="foot"><button onclick="closeModal()">取消</button><button class="primary" onclick="saveRename(${i})">保存</button></div></div></div>`}function saveRename(i){let name=$('#newname').value.trim();if(!name)return toast('请填写文件名称');if(name.split('.').pop().toUpperCase()!==files[i].type)return toast('请保留原文件扩展名');files[i].name=name;closeModal();render()}

const similarityWarningThreshold=0.60;
let pendingSimilarityPrompt=null;
function duplicateAllowed(file){return file.duplicatePhase==='passed'||file.duplicatePhase==='similar'&&(file.approveFromQueue||file.similarityAccepted===true)}
function duplicateMarkup(file,index){if(file.approveFromQueue&&file.visualAnalysisFailed)return '<span class="sub">无法查重</span>';return file.duplicatePhase==='similar'?`<button type="button" class="duplicate-result duplicate-similar duplicate-details" title="查看相似图片" onclick="openDuplicateDetails(${index})"><span class="duplicate-similar-icon" aria-hidden="true">!</span><span>${file.similarityAccepted?'相似项已确认':'发现相似图片'}</span></button>`:file.duplicatePhase==='passed'?'<span class="duplicate-result"><span class="duplicate-pass" aria-hidden="true">✓</span><span>查重通过</span></span>':'<span class="duplicate-result duplicate-pending"><span class="ai-spinner duplicate-spinner" aria-hidden="true"></span><span>查重中…</span></span>'}
function paintDuplicateChecks(){files.forEach((file,i)=>{let node=$('#duplicate-'+i);if(node)node.innerHTML=duplicateMarkup(file,i)})}
function fileIsPendingOrListed(file){return files.includes(file)||pendingLocalFiles.includes(file)||items.includes(file)}
const queueIntakePeers=new WeakMap();
function refreshQueuedSimilarity(batch){
  const archived=items.filter(item=>item.status==='已入库');
  const sources=batch.map(file=>file.queueSource||file);
  for(const file of batch){
    const source=file.queueSource||file;
    const peers=(queueIntakePeers.get(source)||[]).filter(item=>items.includes(item));
    const candidates=[...new Set([...archived,...sources,...peers])];
    const matches=collectSimilarMatches(file,candidates);
    const previous=file.similarMatches||[];
    file.similarityAccepted=file.similarityAccepted===true
      &&matches.length===previous.length
      &&matches.every((match,index)=>match.item===previous[index].item&&match.score===previous[index].score);
    file.similarMatches=matches;
    file.duplicatePhase=matches.length?'similar':'passed';
    if(file!==source){
      Object.assign(source,{
        similarMatches:matches,
        duplicatePhase:file.duplicatePhase,
        similarityAccepted:file.similarityAccepted,
      });
    }
  }
}
function startQueuedSimilarity(batch){
  for(const file of batch){
    file.duplicatePhase='running';
    queueIntakePeers.set(file,batch);
  }
  const finish=()=>{
    refreshQueuedSimilarity(batch.filter(file=>items.includes(file)));
    if(page==='queue')drawQueueRows();
  };
  const pending=batch.filter(file=>file.visualPending).map(file=>file.visualPromise);
  if(pending.length)Promise.allSettled(pending).then(finish);
  else finish();
}
function collectSimilarMatches(file,candidates){
  const matches=file.visualDescriptor?(candidates||similarityCandidatePool())
    .filter(item=>item!==file&&item!==file.queueSource&&item.visualDescriptor)
    .map(item=>({item,score:imageSimilarity(file.visualDescriptor,item.visualDescriptor)}))
    .filter(match=>match.score>similarityWarningThreshold)
    .sort((a,b)=>b.score-a.score):[];
  if(!candidates&&!matches.length&&isDuplicateDemoFile(file)){
    matches.push({item:{name:'库内相似素材（演示）',type:file.type,previewUrl:file.previewUrl,metadata:{version:'V1.0'}},score:0.86,demo:true});
  }
  return matches;
}
function finishDuplicateCheck(file){if(!fileIsPendingOrListed(file))return;file.similarMatches=collectSimilarMatches(file);file.duplicatePhase=file.similarMatches.length?'similar':'passed';file.similarityAccepted=false;if(files.includes(file)&&page==='upload'){paintDuplicateChecks();paintUploadAI();maybeShowSimilarityWarning()}}
function startDuplicateCheck(file){if(file.duplicatePhase)return;file.duplicatePhase='running';setTimeout(()=>{if(!fileIsPendingOrListed(file))return;if(file.visualPending&&file.visualPromise)file.visualPromise.then(()=>finishDuplicateCheck(file));else finishDuplicateCheck(file)},1600)}
function similarityPromptFiles(){
  return page==='upload'?files:[];
}
function maybeShowSimilarityWarning(){
  if(page!=='upload'||pendingLocalFiles.length||pendingSimilarityPrompt||$('#overlay').innerHTML.trim())return;
  const batch=similarityPromptFiles().filter(file=>!file.approveFromQueue&&file.duplicatePhase==='similar'&&!file.similarityAccepted&&!file.similarityDismissed);
  if(batch.length)showSimilarityWarning(batch);
}
function openDuplicateDetails(index){
  const file=files[index];
  if(file?.duplicatePhase==='similar'){
    showSimilarityWarning([file],false,file.similarityAccepted===true);
  }
}
function showSimilarityWarning(batch,resume=false,review=false){let sources=batch.filter(f=>similarityPromptFiles().includes(f)&&f.duplicatePhase==='similar'&&(review||!f.similarityAccepted));if(!sources.length)return;captureUploadDraft();if(!review){pendingUpload=null;pendingSimilarityPrompt={files:sources,resume}}$('#overlay').innerHTML=`<div class="modalbg"><div class="modal similarity-warning-modal" role="dialog" aria-modal="true" aria-labelledby="similarity-warning-title"><h2 id="similarity-warning-title">库内已存在相似图片</h2><p class="sub">以下为相似度超过60%的素材（阈值暂定）${review||sources.every(file=>file.approveFromQueue)?'。':'，是否继续上传？'}</p><div class="similarity-warning-body">${sources.map(file=>`<section class="similarity-warning-section"><div class="similarity-source-name">当前素材：${esc(file.name)}</div><div class="similarity-card-grid">${(file.similarMatches||[]).filter(match=>match.score>similarityWarningThreshold).map(match=>`<div class="similarity-match-card">${match.item.previewUrl?`<img class="similarity-thumbnail" src="${esc(match.item.previewUrl)}" alt="${esc(match.item.name)}">`:`<div class="similarity-thumbnail similarity-thumbnail-placeholder">${esc(match.item.type||'图片')}<span>暂无缩略图</span></div>`}<div class="similarity-match-info"><strong title="${esc(match.item.name)}">${esc(match.item.name)}</strong><div><span class="similarity-score">相似度 ${Math.round(match.score*1000)/10}%</span>${match.item.metadata?.version?`<span class="muted">${esc(match.item.metadata.version)}</span>`:''}</div></div></div>`).join('')}</div></section>`).join('')}</div><div class="foot">${review?`<button class="primary similarity-review-close" onclick="closeModal()">关闭</button>`:`<button onclick="cancelSimilarityWarning()">取消</button><button class="primary" onclick="acceptSimilarityWarning()">确定</button>`}</div></div></div>`;if(review)$('.similarity-review-close')?.focus?.()}
function cancelSimilarityWarning(){let prompt=pendingSimilarityPrompt;if(prompt)prompt.files.forEach(f=>f.similarityDismissed=true);pendingSimilarityPrompt=null;closeModal()}
function acceptSimilarityWarning(){let prompt=pendingSimilarityPrompt;if(!prompt)return;prompt.files.forEach(f=>{if(similarityPromptFiles().includes(f)){f.similarityAccepted=true;f.similarityDismissed=false}});pendingSimilarityPrompt=null;closeModal();paintDuplicateChecks();paintUploadAI();if(prompt.resume)submitUpload(page==='agency');else maybeShowSimilarityWarning()}

function syncDuplicateChecks(){if(page!=='upload')return;files.forEach(startDuplicateCheck);paintDuplicateChecks()}

let uploadAI={fingerprint:'',phase:'idle',token:0,mode:'success',missing:[],showValidation:false};
const uploadLabels={group:'素材组',desc:'素材简介',kind:'素材类型',product:'产品标签',channel:'使用渠道（OG）',version:'版本'};
function isFailureDemoFile(file){let name=String(file.originalName||file.name).normalize('NFKC').replace(/\s+/g,'').replace(/\.[^.]+$/,'').replace(/[—–－-]+/g,'-');return /[家京]乐素材-反/.test(name)||/^重过(?:[(（]\d+[)）])?$/.test(name)}
function isDuplicateDemoFile(file){return String(file.originalName||file.name).normalize('NFKC').replace(/\s+/g,'').replace(/\.[^.]+$/,'').includes('重不过')}
function isSuccessDemoFile(file){return isDuplicateDemoFile(file)|| !isFailureDemoFile(file)&&/^[家京]乐素材(?:[(（]\d+[)）])?$/.test(String(file.originalName||file.name).normalize('NFKC').replace(/\s+/g,'').replace(/\.[^.]+$/,''))}
function effectiveAIMode(){return activeUploadFile&&isFailureDemoFile(activeUploadFile)?'partial':activeUploadFile&&isSuccessDemoFile(activeUploadFile)?'success':uploadAI.mode}
function setAIMode(mode){captureUploadDraft();uploadAI.mode=mode;uploadAI.fingerprint='';if(!files.length)files=[{name:'春日新品_场景图.jpg',size:'8.2 MB',type:'JPG'}];render()}
function missingUploadFields(){let required=[...new Set(['group','kind','product','channel','version',...uploadAI.missing])];return required.filter(id=>{let n=$('#'+id);return !n||!String(n.value||'').trim()||n.tagName==='SELECT'&&n.selectedIndex===0})}
function paintMissingFields(){if(!['upload','agency'].includes(page))return;let missing=missingUploadFields();let highlighted=uploadAI.showValidation?missing:missing.filter(id=>uploadAI.missing.includes(id));for(let id of Object.keys(uploadLabels)){let node=$('#'+id);if(!node)continue;let target=id==='group'?$('#group-summary'):id==='product'?node.closest?.('details')?.querySelector('summary'):node;let invalid=highlighted.includes(id);target?.classList?.toggle('ai-field-error',invalid);if(invalid)target?.setAttribute?.('aria-invalid','true');else target?.removeAttribute?.('aria-invalid');let host=node.closest?.('.field')||node.parentElement;if(!host)continue;let msg=host.querySelector?.('.ai-field-message');if(invalid&&!msg){msg=document.createElement('div');msg.className='ai-field-message';host.append(msg)}if(msg){if(invalid)msg.textContent=uploadAI.missing.includes(id)?'未识别到'+uploadLabels[id]+'，请手动补充':'请填写'+uploadLabels[id];else msg.remove()}}
}
function validateUploadFields(){uploadAI.showValidation=true;let missing=missingUploadFields();paintMissingFields();if(!missing.length)return true;let node=$('#'+missing[0]);let target=missing[0]==='group'?$('#group-summary'):missing[0]==='product'?node?.closest?.('details')?.querySelector('summary'):node;target?.scrollIntoView?.({block:'center',inline:'nearest',behavior:'smooth'});target?.focus?.({preventScroll:true});toast('无法提交，请补齐红框标记的字段：'+missing.map(id=>uploadLabels[id]).join('、'));return false}
function onUploadFieldEdit(event){if(['upload','agency'].includes(page)){if(activeUploadFile&&event?.target?.id){if(event.target.id==='version'){activeUploadFile.versionMode='manual';const versionError=$('#version-error');if(versionError)versionError.textContent='';}activeUploadFile.editedFields=activeUploadFile.editedFields||[];if(!activeUploadFile.editedFields.includes(event.target.id))activeUploadFile.editedFields.push(event.target.id)}captureUploadDraft();paintMissingFields()}}
document.addEventListener?.('input',onUploadFieldEdit);document.addEventListener?.('change',onUploadFieldEdit);
function uploadFingerprint(){return files.map(f=>f.name+'|'+f.size+'|'+f.type).join(';;')}
function paintUploadAI(){let n=$('#upload-ai-status');if(!n)return;let phase=uploadAI.phase;n.innerHTML=phase==='running'?'<span class="ai-spinner" aria-hidden="true"></span><span>识别中…</span>':phase==='done'?'<span aria-hidden="true">✓</span><span>识别成功，已自动填充，可修改确认</span>':phase==='partial'?'<span aria-hidden="true">✓</span><span>识别完成</span>':phase==='failed'?'<span>AI 识别失败，请手动填写素材信息</span>':phase==='timeout'?'<span>AI 处理超时，请手动填写素材信息</span>':phase==='manual'?'<span>AI 不支持此文件类型，请手动填写</span>':'';n.className='upload-ai-status '+phase;
for(let button of document.querySelectorAll?.('.upload-top button.primary, .external .foot button.primary')||[])button.disabled=selectedUploadFiles(page==='agency').some(f=>f.duplicatePhase==='running'||f.aiState?.phase==='running');paintMissingFields();}
const queueRecognitionTimeoutMs=10000;
function startFileRecognition(f){
  ensureFileFields(f);
  const state=f.aiState;
  if(state.phase!=='idle')return;
  const token=++state.token;
  state.phase=aiSupported(f.type)||isFailureDemoFile(f)||isSuccessDemoFile(f)?'running':'manual';
  if(state.phase!=='running')return;

  const queued=items.includes(f)&&isPendingQueueItem(f);
  if(queued)setTimeout(()=>{
    if(!items.includes(f)||state.token!==token||state.phase!=='running')return;
    state.phase='timeout';
    state.missing=['desc','kind','product'];
    if(page==='queue')drawQueueRows();
  },queueRecognitionTimeoutMs);

  const demoTimeout=queued&&token===1&&[f.originalName,f.name].some(name=>/^AI\s*(?:处理|识别)超时(?:\.[^.]+)?$/i.test(name?.trim()||''));
  if(demoTimeout)return;
  setTimeout(()=>{
    const finish=()=>finishUploadAI(token,f);
    if(items.includes(f)&&f.visualPending&&f.visualPromise)f.visualPromise.then(finish);
    else finish();
  },2200);
}
function syncUploadAI(){syncDuplicateChecks();if(!['upload','agency'].includes(page)||submitted&&page==='agency')return;if(page==='upload')files.forEach(startFileRecognition);if(activeUploadFile)uploadAI=activeUploadFile.aiState;paintUploadAI()}

function finishUploadAI(token,f=activeUploadFile){if(!f||!fileIsPendingOrListed(f)||f.aiState.token!==token||f.aiState.phase!=='running')return;let state=f.aiState;let recognitionName=items.includes(f)?f.originalName||f.name:f.name;
  const simulatesFailure=[recognitionName,f.name].some(name=>/^AI\s*(?:预处理|识别)失败(?:\.[^.]+)?$/i.test(name.trim()));
  if(items.includes(f)&&(f.visualAnalysisFailed||simulatesFailure)){
    state.phase='failed';
    state.missing=['desc','kind','product'];
    if(page==='queue')drawQueueRows();
    if(page==='review')drawRows();
    return;
  }
  let product=productNames.find(p=>recognitionName.includes(p))||'鲜麻青花椒酱';let kind=materialKinds.find(k=>recognitionName.toLowerCase().includes(k.toLowerCase()))||'菜式应用';let version=recognitionName.match(/v[0-9]+(?:\.[0-9]+)*/i)?.[0]||'V1.0';let values={...initialFileFields(),...f.metadata,desc:product+'相关'+kind+'素材，展示产品特色及菜式应用，适用于品牌官方渠道内容传播。',kind,product,channel:f.externalSubmission?f.metadata.channel:f.type==='MP4'?'官抖':'官微',version:f.externalSubmission&&f.versionMode==='manual'?f.metadata.version:version,storageTags:[...new Set([...suggestedStorageTags({...f,name:recognitionName}).filter(tag=>!(f.dismissedStorageTags||[]).includes(tag)),...(f.metadata.storageTags||[])])]};state.missing=isFailureDemoFile(f)?['desc','kind','product']:[];for(let id of state.missing)values[id]='';for(let id of f.editedFields||[])if(id in values)values[id]=f.metadata[id];f.metadata=values;refreshMaterialVersion(f);state.phase=state.missing.length?'partial':'done';if(f===activeUploadFile&&['upload','agency'].includes(page)){restoreActiveFields();paintUploadAI()}else if(page==='queue'&&items.includes(f))drawQueueRows();else if(page==='review'&&f.externalSubmission)drawRows()}
let pendingLocalFiles=[];
let namingToQueue=false;
let pendingRetryItem=null;
function addFiles(list,{toQueue=false,retryItem=null}={}){
  const queueUpload=toQueue&&page!=='agency';
  const valid=[];
  let failed=0;
  for(const file of list){
    const type=file.name.split('.').pop().toUpperCase();
    const oversize=file.size>500*1024*1024;
    const uploadError=oversize?'超过 500 MB，请选择较小文件':file.size===0?'文件为空，请选择有效文件':'';
    if(queueUpload&&uploadError){
      const failure={name:file.name,type,size:(file.size/1024/1024).toFixed(1)+' MB',status:'上传失败',uploadError};
      if(retryItem&&items.includes(retryItem))Object.assign(retryItem,failure);
      else items.push(failure);
      failed++;
      continue;
    }
    if(oversize){
      toast('文件超过演示大小上限 500 MB，请调整后重新上传');
      continue;
    }
    const sourceBlob=typeof Blob!=='undefined'&&file instanceof Blob?file:null;
    valid.push({
      name:file.name,
      originalName:file.name,
      relativePath:file.webkitRelativePath||'',
      sourceBlob,
      previewUrl:sourceBlob&&typeof URL!=='undefined'?URL.createObjectURL(sourceBlob):'',
      size:(file.size/1024/1024).toFixed(1)+' MB',
      type,
    });
  }
  if(failed){
    if(!valid.length)return go('queue');
    toast(failed+' 个文件上传失败，可在待入库查看原因');
  }
  if(!valid.length)return;
  showMaterialNaming(valid,queueUpload,retryItem);
  if(page==='agency')valid.forEach(file=>{ensureFileFields(file).metadata.version=''});
  else if(!namingToQueue)prepareIncomingMaterials(valid);
}
function stageQueuedUpload(batch){
  const date=new Date().toISOString().slice(0,10);
  for(const file of batch){
    Object.assign(file,{from:'内部上传',by:'林晓',uploadedAt:date,status:'待人工审核',intakePending:true});
    items.push(file);
  }
  go('queue');
  setTimeout(()=>{
    const uploaded=batch.filter(file=>items.includes(file));
    uploaded.forEach(file=>delete file.intakePending);
    prepareIncomingMaterials(uploaded,false);
    startQueuedSimilarity(uploaded);
    if(page==='queue')drawQueueRows();
  },350);
}
function prepareIncomingMaterials(batch,checkDuplicates=true,recognize=true){
  for(const file of batch){
    ensureFileFields(file);
    beginVisualVersionAnalysis(file,recognize);
    if(recognize)startFileRecognition(file);
    else file.metadata.version='';
    if(checkDuplicates)startDuplicateCheck(file);
  }
}
const referenceMaterialGroups=[
  '根素材组-1',
  '根素材组-1 / 子素材组1.1',
  '根素材组-1 / 子素材组1.1 / 子素材组1.1.1',
  '根素材组-1 / 子素材组1.2',
  '根素材组-1 / 子素材组1.2 / 子素材组1.2.1',
  '根素材组-1 / 子素材组1.3',
  '根素材组-2','根素材组-3','根素材组-4',
  '根素材组-4 / 子素材组4.1',
  '根素材组-5','根素材组-5 / 子素材组5.1',
  '根素材组-6','根素材组-7','根素材组-8','根素材组-9','根素材组-10',
];
const referenceRelatedMaterials=[
  '根素材组-1 / 子素材组1.2 / 子素材组1.2.1 / 素材1.2.1.1',
  '根素材组-1 / 子素材组1.3 / 素材1.3.1',
  '根素材组-3 / 素材3.1',
  '根素材组-10 / 素材10.1',
];
function namingTreeOptions(paths,parent='',chooseGroups=false,groupPaths=referenceMaterialGroups){
  const children=paths.filter(path=>path.slice(0,Math.max(0,path.lastIndexOf(' / ')))===parent);
  if(!children.length)return '';
  return `<ul class="naming-tree-list">${children.map(path=>{
    const name=path.split(' / ').at(-1);
    const group=groupPaths.includes(path);
    const branch=namingTreeOptions(paths,path,chooseGroups,groupPaths);
    const select=chooseGroups?group:!group;
    return `<li><div class="naming-tree-row">
      ${branch?`<button type="button" class="naming-tree-toggle" aria-label="展开或收起 ${esc(name)}" aria-expanded="false" onclick="toggleNamingBranch(this)"><span aria-hidden="true">▸</span></button>`:'<span class="naming-tree-spacer"></span>'}
      ${select?`<button type="button" class="naming-tree-choice" data-path="${esc(path)}" onclick="chooseNamingPath(this)">${esc(name)}</button>`:
        branch?`<button type="button" class="naming-tree-choice" onclick="toggleNamingBranch(this.previousElementSibling)">${esc(name)}</button>`:
        `<span class="naming-tree-empty">${esc(name)}</span>`}
    </div>${branch?`<div class="naming-tree-branch" hidden>${branch}</div>`:''}</li>`;
  }).join('')}</ul>`;
}
function toggleNamingBranch(button){
  const branch=button.parentElement.nextElementSibling;
  branch.hidden=!branch.hidden;
  button.setAttribute('aria-expanded',String(!branch.hidden));
}
function chooseNamingPath(button){
  const picker=button.closest('.naming-tree-picker');
  const input=picker.querySelector('input');
  const summary=picker.querySelector('summary');
  const value=picker.querySelector('.naming-tree-value');
  input.value=button.dataset.path;
  value.textContent=input.value||'无需关联';
  value.title=input.value;
  summary.classList.remove('ai-field-error');
  summary.removeAttribute('aria-invalid');
  picker.open=false;
  summary.focus();
  if(input.id==='group')onUploadFieldEdit({target:input});
}
document.addEventListener('click',event=>{
  for(const picker of document.querySelectorAll('.naming-tree-picker[open]')){
    if(!picker.contains(event.target))picker.open=false;
  }
});
function namingTreeControl(id,placeholder,chooseGroups,paths,groupPaths=referenceMaterialGroups){
  return `<details class="naming-tree-picker">
    <summary id="${id}-summary" aria-labelledby="${id}-label ${id}-value"><span id="${id}-value" class="naming-tree-value">${placeholder}</span><span aria-hidden="true">⌄</span></summary>
    <input type="hidden" id="${id}" value="">
    <div class="naming-tree-panel">
      ${chooseGroups?'':`<button type="button" class="naming-tree-choice naming-tree-clear" data-path="" onclick="chooseNamingPath(this)">无需关联</button>`}
      ${namingTreeOptions(paths,'',chooseGroups,groupPaths)}
    </div>
  </details>`;
}
function namingTreeField(id,label,placeholder,chooseGroups){
  const paths=chooseGroups?referenceMaterialGroups:[...referenceMaterialGroups,...referenceRelatedMaterials];
  return `<div class="naming-row">
    <span id="${id}-label" class="naming-tree-label">${label}${chooseGroups?'<span class="required"> *</span>':''}</span>
    ${namingTreeControl(id,placeholder,chooseGroups,paths)}
  </div>`;
}
function uploadGroupPicker(){
  const groups=[...new Set([
    ...referenceMaterialGroups,'CRM 素材库 / 2026年官微官抖素材','品牌内容 / 新品发布',
    ...materialGroups.map(name=>'CRM · 品牌内容团队 / '+name),
    ...files.map(file=>file.metadata?.group),
    page==='detail'?items[selected]?.metadata?.group:null,
  ].filter(Boolean))];
  const paths=new Set();
  for(const path of [...groups,...referenceRelatedMaterials]){
    const segments=path.split(' / ');
    segments.forEach((_,index)=>paths.add(segments.slice(0,index+1).join(' / ')));
  }
  return namingTreeControl('group','请选择素材组',true,[...paths],groups);
}
function paintUploadGroup(){
  const value=$('#group-value');
  const group=$('#group')?.value||'';
  if(value){
    value.textContent=group||'请选择素材组';
    value.title=group;
  }
}
function materialNameInput(index,initialName){
  return `<input id="material-name-${index}" type="text" maxlength="150" placeholder="请输入素材名称"
    aria-label="第 ${index+1} 个文件的素材名称" value="${esc(initialName)}" aria-describedby="material-name-error-${index}"
    autocomplete="off" oninput="clearMaterialNameError(${index})" onkeydown="if(event.key==='Enter'){event.preventDefault();confirmMaterialNames()}">`;
}
function materialNameError(index){
  return `<div id="material-name-error-${index}" class="naming-error" role="alert"></div>`;
}
function materialNamingTable(files,toQueue){
  return `<div class="naming-list batch-naming-list" role="region" aria-label="素材命名文件列表" tabindex="0">
    <table>
      <thead><tr><th scope="col">原文件</th><th scope="col">素材名称<span class="required"> *</span></th>
        ${toQueue?'<th scope="col">素材存放路径<span class="required"> *</span></th><th scope="col">需关联素材</th>':''}
      </tr></thead>
      <tbody>${files.map((file,index)=>{
        const suffix=file.originalName.match(/\.[^.]+$/);
        const extension=suffix?.index?suffix[0]:'';
        const initialName=extension?file.originalName.slice(0,-extension.length):file.originalName;
        const thumbnail=file.previewUrl&&['JPG','JPEG','PNG','GIF','WEBP'].includes(file.type)
          ?`<img src="${esc(file.previewUrl)}" alt="" loading="lazy">`
          :`<span class="batch-naming-file-type" aria-hidden="true">${esc(file.type||'文件')}</span>`;
        return `<tr>
          <th scope="row"><div class="batch-naming-source">${thumbnail}<span>${esc(file.originalName)}</span></div></th>
          <td><div class="batch-naming-input">${materialNameInput(index,initialName)}${extension?`<span>${esc(extension)}</span>`:''}</div>${materialNameError(index)}</td>
          ${toQueue?`<td>${namingTreeField('material-path-'+index,'素材存放路径','请选择素材存放路径',true)}</td>
            <td>${namingTreeField('related-material-'+index,'需关联素材','无需关联',false)}</td>`:''}
        </tr>`;
      }).join('')}</tbody>
    </table>
  </div>`;
}
function showMaterialNaming(valid,toQueue=false,retryItem=null){
  pendingRetryItem=retryItem;
  namingToQueue=toQueue;
  pendingLocalFiles=valid;
  const batch=valid.length>1;
  $('#overlay').innerHTML=`<div class="modalbg"><div class="modal naming-modal ${toQueue?'naming-with-routing':''} batch-naming-modal ${batch?'':'single-naming-modal'}" role="dialog" aria-modal="true" aria-labelledby="naming-title">
    <h2 id="naming-title">${batch?'批量命名素材':'填写素材名字'}</h2>
    ${batch?`<p class="sub batch-naming-count">共 ${valid.length} 个文件</p>`:''}
    ${materialNamingTable(valid,toQueue)}
    <div class="foot"><button onclick="cancelMaterialNames()">取消</button><button class="primary" onclick="confirmMaterialNames()">确定</button></div>
  </div></div><div id="material-name-conflict"></div>`;
  $('#material-name-0')?.focus?.({preventScroll:true});
}
function clearMaterialNameError(i){let n=$('#material-name-'+i);if(n?.value.trim()){n.classList?.remove('ai-field-error');n.removeAttribute?.('aria-invalid');$('#material-name-error-'+i).textContent=''}}
function cancelMaterialNames(){pendingRetryItem=null;namingToQueue=false;pendingLocalFiles=[];closeModal();if($('#picker'))$('#picker').value=''}
function showMaterialNameConflict(index){
  $('.naming-modal')?.setAttribute('inert','');
  $('#material-name-conflict').innerHTML=`<div class="modalbg">
    <div class="modal" role="alertdialog" aria-modal="true" aria-labelledby="material-name-conflict-title">
      <h2 id="material-name-conflict-title">名字重复，请重新填写</h2>
      <div class="foot"><button id="material-name-conflict-ok" class="primary" onclick="dismissMaterialNameConflict(${index})">确定</button></div>
    </div>
  </div>`;
  $('#material-name-conflict-ok')?.focus?.();
}

function dismissMaterialNameConflict(index){
  $('#material-name-conflict').innerHTML='';
  $('.naming-modal')?.removeAttribute('inert');
  $('#material-name-'+index)?.focus?.();
}

function confirmMaterialNames(){
  if(!pendingLocalFiles.length)return;
  const names=pendingLocalFiles.map((file,index)=>{
    const name=$('#material-name-'+index).value.trim();
    const extension=file.originalName.match(/\.[^.]+$/)?.[0]||'';
    return name&&extension&&!name.toLowerCase().endsWith(extension.toLowerCase())?name+extension:name;
  });
  const nameKey=name=>name.trim().normalize('NFC').toLowerCase();
  const existing=new Set([...items,...files].filter(file=>!file.uploadError).map(file=>nameKey(file.name)));
  const counts=new Map();
  for(const name of names){
    const key=nameKey(name);
    counts.set(key,(counts.get(key)||0)+1);
  }
  let firstError=-1;
  let firstConflict=-1;
  names.forEach((name,index)=>{
    const key=nameKey(name);
    const conflict=!!name&&(existing.has(key)||counts.get(key)>1);
    const message=!name?'请填写素材名字':conflict?'名字重复，请重新填写':'';
    const input=$('#material-name-'+index);
    input.classList?.toggle('ai-field-error',!!message);
    if(message)input.setAttribute?.('aria-invalid','true');
    else input.removeAttribute?.('aria-invalid');
    $('#material-name-error-'+index).textContent=message;
    if(message&&firstError<0)firstError=index;
    if(conflict&&firstConflict<0)firstConflict=index;
  });
  if(firstConflict>=0)return showMaterialNameConflict(firstError);
  if(firstError>=0){
    $('#material-name-'+firstError)?.focus?.();
    return;
  }
  const batch=pendingLocalFiles;
  const toQueue=namingToQueue;
  const retryItem=pendingRetryItem;
  if(toQueue){
    const routes=batch.map((_,index)=>({
      group:$('#material-path-'+index).value,
      relatedAssetPath:$('#related-material-'+index).value,
    }));
    const missing=routes.findIndex(route=>!referenceMaterialGroups.includes(route.group));
    if(missing>=0){
      const field=$('#material-path-'+missing+'-summary');
      field.classList?.add('ai-field-error');
      field.setAttribute?.('aria-invalid','true');
      field.focus?.();
      return toast('请选择素材存放路径');
    }
    batch.forEach((file,index)=>{
      ensureFileFields(file);
      Object.assign(file.metadata,routes[index]);
    });
  }
  batch.forEach((file,index)=>{file.name=names[index]});
  pendingLocalFiles=[];
  namingToQueue=false;
  pendingRetryItem=null;
  captureUploadDraft();
  closeModal();
  if(toQueue){
    if(retryItem){
      const failedIndex=items.indexOf(retryItem);
      if(failedIndex>=0)items.splice(failedIndex,1);
      queueSelection.delete(retryItem);
    }
    stageQueuedUpload(batch);
    return;
  }
  uploadAI.mode=batch.some(isFailureDemoFile)?'partial':'success';
  uploadAI.fingerprint='';
  files.push(...batch);
  activeUploadFile=batch[0];
  render();
  $('.upload-meta')?.scrollTo?.({top:0,behavior:'smooth'});
  $('#desc')?.focus?.({preventScroll:true});
  maybeShowSimilarityWarning();
}

let pendingUpload=null;
function confirmationMaterialList(batch){return `<div class="confirmation-list-label">待入库素材（${batch.length}）</div><div class="confirmation-materials" role="region" aria-label="待入库素材列表，可滚动查看" tabindex="0"><ul>${batch.map(f=>`<li class="confirmation-material">${f.previewUrl&&['JPG','JPEG','PNG','GIF','WEBP'].includes(f.type)?`<img class="confirmation-thumb" src="${esc(f.previewUrl)}" alt="${esc(f.name)}">`:`<span class="confirmation-file-icon" aria-hidden="true">${esc(f.type)}</span>`}<div class="confirmation-material-info"><div class="confirmation-material-name">${esc(f.name)}</div><div class="muted">${esc(f.type)} · ${esc(f.size)}</div></div>${f.duplicatePhase==='passed'&&!f.visualAnalysisFailed?'<span class="confirmation-check" aria-label="查重通过">✓</span>':''}</li>`).join('')}</ul></div>`}
function selectedUploadFiles(ext=false){return ext?files:files.filter(f=>f.checked)}
function openUploadConfirmation(metadata){if(pendingUpload)return;let chosen=selectedUploadFiles();if(!chosen.length)return toast('请先勾选要入库的素材');pendingUpload={metadata:{...metadata},sourceFiles:chosen,files:chosen.map(f=>({...f}))};$('#overlay').innerHTML=`<div class="modalbg"><div class="modal upload-confirm" role="dialog" aria-modal="true" aria-labelledby="upload-confirm-title"><div id="upload-confirm-content"><h2 id="upload-confirm-title">是否确定上传</h2>${confirmationMaterialList(pendingUpload.files)}<div class="upload-confirm-actions"><button onclick="cancelUploadConfirmation()">否</button><button class="primary" onclick="confirmUploadYes()">是</button></div></div></div></div>`}
function cancelUploadConfirmation(){pendingUpload=null;closeModal()}
function confirmUploadYes(){if(!pendingUpload)return;if(pendingUpload.sourceFiles.some(f=>!f.approveFromQueue&&f.duplicatePhase==='similar'&&!f.similarityAccepted)){const chosen=pendingUpload.sourceFiles;cancelUploadConfirmation();blockUnconfirmedSimilarity(chosen);return}if(pendingUpload.files.some(f=>!duplicateAllowed(f))){cancelUploadConfirmation();return toast('查重尚未完成，无法入库')}if(!validateUploadBatch(false)){cancelUploadConfirmation();return}let batch=pendingUpload;pendingUpload=null;let start=items.length;batch.files.forEach(f=>{let saved={...f,from:f.from||'内部上传',by:f.by||'林晓',status:f.approveFromQueue?'已入库':'待人工审核',uploadedAt:f.uploadedAt||new Date().toISOString().slice(0,10),ai:true,manual:!aiSupported(f.type)&&!isFailureDemoFile(f)&&!isSuccessDemoFile(f),dup:false,metadata:{...(f.metadata||batch.metadata)}};if(f.approveFromQueue)saved.archivedAt=Date.now();delete saved.queueSource;delete saved.approveFromQueue;if(f.queueSource){Object.assign(f.queueSource,saved);queueSelection.delete(f.queueSource);queuedFormDrafts.delete(f.queueSource)}else items.push(saved)});selected=start;files=files.filter(f=>!batch.sourceFiles.includes(f));
  const sidebar=$('.client-sidebar');
  if(sidebar)sidebar.innerHTML=clientSidebar();
  let html=`<div class="upload-success-icon" aria-hidden="true">✓</div><h2 id="upload-confirm-title">上传成功</h2><div class="upload-confirm-actions"><button class="primary" onclick="acknowledgeUploadSuccess()">确定</button></div>`;let content=$('#upload-confirm-content');if(content)content.innerHTML=html}
function acknowledgeUploadSuccess(){closeModal();go('queue')}

function fileMissingFields(f){ensureFileFields(f);let required=[...new Set(['group','kind','product','channel','version',...f.aiState.missing])];return required.filter(id=>!String(f.metadata[id]||'').trim()||['kind','product','channel'].includes(id)&&String(f.metadata[id]).startsWith('请选择'))}
function blockUnconfirmedSimilarity(chosen){
  const unconfirmed=chosen.filter(file=>!file.approveFromQueue&&file.duplicatePhase==='similar'&&!file.similarityAccepted);
  if(!unconfirmed.length)return false;
  showSimilarityWarning(unconfirmed,true);
  return true;
}
function validateAgencyFields(chosen){
  const invalid=chosen.find(file=>{
    const {channel,version}=file.metadata;
    return !channel||channel.startsWith('请选择')||(String(version??'').trim()&&!parseMaterialVersion(version));
  });
  if(!invalid)return true;
  const channelMissing=!invalid.metadata.channel||invalid.metadata.channel.startsWith('请选择');
  switchUploadFile(files.indexOf(invalid));
  $(channelMissing?'#channel':'#version')?.focus?.();
  toast(channelMissing?'请选择使用渠道':'请输入正确的版本号，例如 V1.0 或 V1.1.2');
  return false;
}
function validateUploadBatch(ext=false){captureUploadDraft();if(!files.length){toast('请先添加至少一份素材');return false}let chosen=selectedUploadFiles(ext);if(!chosen.length){toast('请先勾选要入库的素材');return false}if(ext)return validateAgencyFields(chosen);if(blockUnconfirmedSimilarity(chosen))return false;if(chosen.some(f=>!duplicateAllowed(f))){toast('素材查重尚未完成，请等待查重通过');return false}if(chosen.some(f=>f.visualPending)){toast('正在查找相似图片，请稍候');return false}if(chosen.some(f=>f.aiState?.phase==='running')){toast('正在识别，请稍候完成后确认信息');return false}let incomplete=chosen.find(f=>fileMissingFields(f).length);if(incomplete){switchUploadFile(files.indexOf(incomplete));uploadAI.showValidation=true;validateUploadFields();return false}return validateVersionBatch(chosen)}

function submitUpload(ext){
  if(!validateUploadBatch(ext))return;
  if(!ext){
    openUploadConfirmation({
      kind:$('#kind').value,product:$('#product').value,channel:$('#channel').value,
      version:$('#version').value,desc:$('#desc').value,group:$('#group').value,
    });
    return;
  }
  const submissionNote=agencySubmissionNote.trim();
  for(const file of files){
    const version=String(file.metadata.version??'').trim();
    const submittedFile={
      ...file,from:'Agency · '+(taskMade?.agency||'青禾创意'),by:'陈悦',
      externalSubmission:true,collectionTask:taskMade||null,reviewer:taskMade?.reviewer||currentReviewer,submissionNote,
      status:'待人工审核',uploadedAt:new Date().toISOString().slice(0,10),ai:true,
      manual:!aiSupported(file.type)&&!isFailureDemoFile(file)&&!isSuccessDemoFile(file),dup:false,
      versionMode:version?'manual':'auto',
      aiState:{phase:'idle',token:0,missing:[]},
      metadata:{...file.metadata,group:agencyTargetGroup(),version:version?'V'+version.replace(/^v/i,''):'V1.0'},
    };
    items.push(submittedFile);
    beginVisualVersionAnalysis(submittedFile,false);
    startFileRecognition(submittedFile);
  }
  files=[];
  agencySubmissionNote='';
  submitted=true;
  render();
  toast('已提交，等待内部审核');
}
function collectionStatus(task){
  const submissions=items.filter(item=>item.externalSubmission&&item.collectionTask===task);
  if(submissions.some(item=>!['已入库','已退回'].includes(item.status)))return '收集中';
  if(submissions.some(item=>item.status==='已入库'))return '收集成功';
  if(task?.expiresAt&&Date.now()>=task.expiresAt)return '收集失败';
  return '收集中';
}
function tasks(){const status=collectionStatus(taskMade||null);return heading('素材收集任务','发起收集，邀请 Agency 在专属链接中提交素材',`<button class="primary" onclick="taskModal()">＋ 新建收集任务</button>`)+`<div class="notice">Agency 访客仅可访问对应任务的上传页面，不能进入或浏览内部素材库。此处可通过“预览访客页”评审该流程。</div><div class="card"><table><thead><tr><th>主题</th><th>合作组织</th><th>目标素材组</th><th>状态</th><th>操作</th></tr></thead><tbody><tr><td><b>${esc(taskMade?.name||'2026 春日焕新 · 品牌素材收集')}</b><p class="muted">发起人 林晓 · 截止 ${esc(taskMade?.date||'2026-11-30')}</p></td><td>${esc(taskMade?.agency||'青禾创意')}</td><td>${esc(agencyTargetGroup())}</td><td>${status==='收集失败'?'<span class="tag bad">收集失败</span>':tag(status)}</td><td><button onclick="copyLink()">复制演示链接</button><button onclick="previewAgency()">预览访客页 →</button></td></tr></tbody></table></div>`}
let collectionPassword='',collectionNotify='link',agencyUnlocked=false,agencySubmissionNote='';
function agencyTargetGroup(){return taskMade?.group||'素材组1-子素材组1.1-子素材组1.1.1'}
function newCollectionPassword(){let alphabet='abcdefghjkmnpqrstuvwxyz23456789';return Array.from({length:4},()=>alphabet[Math.floor(Math.random()*alphabet.length)]).join('')}
function refreshCollectionPassword(){let previous=collectionPassword;do{collectionPassword=newCollectionPassword()}while(collectionPassword===previous);if($('#task-password'))$('#task-password').value=collectionPassword}
function setCollectionNotify(mode){collectionNotify=mode;let members=$('#notify-members');if(members)members.hidden=mode!=='members'}
function taskModal(){collectionPassword=newCollectionPassword();collectionNotify='link';$('#overlay').innerHTML=`<div class="modalbg"><div class="modal collection-modal" role="dialog" aria-modal="true" aria-labelledby="collection-title"><h2 id="collection-title">创建收集素材任务</h2>${field('主题','<input id="tn" maxlength="50" placeholder="请输入主题">',true)}${field('合作组织','<input id="ta" placeholder="请输入合作组织">')}${field('目标素材组',opts(['CRM / 品牌内容','新品发布 / 产品图片'],'tg'),true)}${field('有效期','<select id="td"><option value="1">1天有效</option><option value="7" selected>7天有效</option><option value="30">30天有效</option><option value="0">永久有效</option></select>')}${field('备注','<textarea id="task-note" rows="3" placeholder="请输入任务备注"></textarea>')}<div class="collection-password-row"><label for="task-password">访问密码<span class="sub">（需输入密码才可访问）</span></label><input id="task-password" readonly value="${collectionPassword}"><button class="password-refresh" onclick="refreshCollectionPassword()">⟳ 刷新密码</button></div><div class="field"><label>通知方式</label><div class="collection-notify"><label><input type="radio" name="collection-notify" checked onchange="setCollectionNotify('link')">复制链接分享</label><label><input type="radio" name="collection-notify" onchange="setCollectionNotify('members')">通知指定成员</label></div></div><div id="notify-members" hidden>${field('指定成员','<input id="task-members" placeholder="请输入成员姓名，多人用逗号分隔">')}<p class="sub">原型仅记录通知方式，不实际发送通知。</p></div><div class="foot"><button onclick="closeModal()">取消</button><button class="primary" onclick="createTask()">生成任务</button></div></div></div>`}
function closeModal(){$('#overlay').innerHTML='';pendingSimilarityPrompt=null}
function createTask(){let name=$('#tn').value.trim(),agencyName=$('#ta').value.trim(),period=$('#td').value;if(!name||!period||!$('#tg').value)return toast('请完善任务必填信息');if(name.length>50)return toast('主题最多50个字');if(collectionNotify==='members'&&!$('#task-members').value.trim())return toast('请填写需要通知的指定成员');let days=Number(period),expiresAt=days?Date.now()+days*86400000:null;taskMade={name,agency:agencyName,reviewer:currentReviewer,group:$('#tg').value,date:expiresAt?new Date(expiresAt).toLocaleDateString('sv-SE',{timeZone:'Asia/Shanghai'}):'永久有效',expiryDays:days,expiresAt,note:$('#task-note').value,password:collectionPassword,notify:collectionNotify,members:collectionNotify==='members'?$('#task-members').value.trim():''};agencyUnlocked=false;render();showCollectionLink()}
function showCollectionLink(){let link=location.href.split('#')[0]+'#agency';$('#overlay').innerHTML=`<div class="modalbg"><div class="modal collection-modal" role="dialog" aria-modal="true" aria-labelledby="collection-result-title"><h2 id="collection-result-title">任务已生成</h2><p class="sub">${esc(taskMade.name)}</p>${field('收集链接',`<input readonly value="${esc(link)}">`)}${field('访问密码',`<input readonly value="${esc(taskMade.password)}">`)}<p class="sub">有效期：${taskMade.expiryDays?taskMade.expiryDays+'天有效':'永久有效'}</p><p class="sub">${taskMade.notify==='members'?'通知指定成员：'+esc(taskMade.members)+'（演示记录）':'复制链接分享'}</p><div class="foot"><button onclick="closeModal();previewAgency()">预览访客页</button><button class="primary" onclick="copyLink()">复制链接</button><button onclick="closeModal()">确定</button></div></div></div>`}
function copyLink(){let u=location.href.split('#')[0]+'#agency';if(!navigator.clipboard?.writeText)return toast('请使用“预览访客页”打开演示');navigator.clipboard.writeText(u).then(()=>toast('演示链接已复制（非真实授权链接）')).catch(()=>toast('请使用“预览访客页”打开演示'))}
function previewAgency(){files=[];submitted=false;agencyUnlocked=false;agencySubmissionNote='';go('agency')}
function unlockAgency(){if(taskMade.expiresAt&&Date.now()>taskMade.expiresAt)return toast('该收集任务已过期');if($('#agency-password').value.trim()!==taskMade.password)return toast('访问密码不正确，请重试');agencyUnlocked=true;render()}

function agencyReviewResults(){
  const results=items.filter(item=>item.externalSubmission&&item.collectionTask===(taskMade||null)&&item.by==='陈悦');
  if(!results.length)return '';
  return `<div class="card"><h2>提交状态</h2><ul>${results.map(item=>`<li><strong>${esc(item.name)}</strong> · ${item.status==='待人工审核'?'待审核':esc(item.status)}${item.status==='已退回'?`<p>退回原因：${esc(item.reason)}</p>`:''}</li>`).join('')}</ul></div>`;
}
function agency(){if(taskMade?.expiresAt&&Date.now()>taskMade.expiresAt)return `<div class="card"><h2>收集任务已过期</h2><p class="sub">请联系发起人更新有效期。</p><button onclick="go('tasks')">返回内部端（演示）</button></div>`;if(taskMade?.password&&!agencyUnlocked)return `<div class="card agency-password-card"><h1>${esc(taskMade.name)}</h1><p class="sub">请输入访问密码，进入素材上传页面。</p>${field('访问密码',`<input id="agency-password" placeholder="请输入访问密码" autocomplete="off" onkeydown="if(event.key==='Enter')unlockAgency()">`,true)}<div class="foot"><button onclick="go('tasks')">返回内部端（演示）</button><button class="primary" onclick="unlockAgency()">确定</button></div></div>`;if(submitted)return `<div class="card" style="text-align:center;padding:70px"><div style="font-size:45px;color:#168d78">✓</div><h1>素材提交成功</h1><p class="sub">已提交至收集任务，等待发起人审核。审核通过后归档至指定素材组。</p><button onclick="submitted=false;render()">继续提交</button> <button onclick="go('tasks')">返回内部端（演示）</button></div>`+agencyReviewResults();return heading('访客上传',`发起人 林晓　｜　合作方 ${esc(taskMade?.agency||'青禾创意')}`)+`
  <div class="card agency-task-fields">
    <div class="field"><label for="agency-task-name">收集任务名称</label>
      <input id="agency-task-name" value="${esc(taskMade?.name||'春日焕新 · 品牌素材收集')}" readonly>
    </div>
    <div class="field"><label for="agency-target-group">目标素材组</label>
      <input id="agency-target-group" value="${esc(agencyTargetGroup())}" readonly>
    </div>
  </div><div class="notice">访客专属上传入口 · 仅能向当前任务提交素材。请选择使用渠道。素材标签、简介、类型和产品标签会在提交后由系统识别。</div>${agencyReviewResults()}<div class="card"><h2>上传素材</h2><p class="sub">支持各类格式，单文件 ≤ 500 MB（原型设定）；不支持的格式转纯人工审核</p><input id="picker" type="file" multiple onchange="addFiles(this.files)">${files.length?`<div class="agency-file-list">${files.map((f,i)=>`<button type="button" class="upload-file-link ${f===activeUploadFile?'active':''}" aria-pressed="${f===activeUploadFile}" onclick="switchUploadFile(${i})">${f.previewUrl&&['JPG','JPEG','PNG','GIF','WEBP'].includes(f.type)?`<img class="agency-file-thumbnail" src="${esc(f.previewUrl)}" alt="">`:`<span class="agency-file-thumbnail agency-file-placeholder" aria-hidden="true">${esc(f.type||'文件')}</span>`}<span>${esc(f.name)}</span></button>`).join('')}</div>`:'<p>尚未选择文件</p>'}</div><div class="card">${field('使用渠道（OG）',opts(['请选择使用渠道','官微','官抖','小红书','电商'],'channel'),true)}
  ${field('版本','<input id="version" placeholder="选填，例如 V1.0">')}
  <div class="field"><label for="agency-submission-note">备注</label>
    <textarea id="agency-submission-note" rows="3" maxlength="500" placeholder="例如：第二张是替换封面的新版" oninput="agencySubmissionNote=this.value">${esc(agencySubmissionNote)}</textarea>
    <p class="sub">适用于本次提交的全部素材</p>
  </div><div class="foot"><button onclick="go('tasks')">返回内部端（演示）</button><button class="primary" onclick="submitUpload(true)">提交素材</button></div></div>`}
let storedAssetReturnPage='library';

function openStoredAsset(index){
  const item=items[index];
  if(item?.status!=='已入库')return;
  if(page!=='detail')storedAssetReturnPage=['group','archived'].includes(page)?page:'library';
  selected=index;
  item.viewCount=(Number(item.viewCount)||0)+1;
  go('detail');
}

function showStoredAssetPermissions(){
  const item=items[selected];
  if(!item)return;
  const metadata=item.metadata||{};
  const recordedPermissions=metadata.permissions??item.permissions;
  const permissions=recordedPermissions??{
    members:[
      {name:'沈知遥',role:'所有者'},
      {name:'顾南舟',role:'可编辑/删除'},
      {name:'周予桐',role:'可编辑/删除',external:true},
      {name:'林映川',role:'可编辑/删除',external:true},
      {name:'宋言溪',role:'可下载'},
      {name:'许沐晴',role:'可下载'},
    ],
    groups:[{name:'品牌内容 · 风味素材组',role:'可下载'}],
  };
  const permissionSections=[
    ['成员',permissions.members,'person'],
    ['素材组-赋权给组内所有成员',permissions.groups,'folder'],
  ];
  $('#overlay').innerHTML=`<div class="modalbg">
    <div class="modal stored-detail-permission-modal" role="dialog" aria-modal="true" aria-labelledby="stored-detail-permission-heading">
      <div class="pending-image-heading">
        <h2 id="stored-detail-permission-heading">权限信息</h2>
        <button type="button" class="stored-detail-permission-close pending-image-close" aria-label="关闭权限信息" onclick="closeModal()">×</button>
      </div>
          <section class="stored-detail-permissions">
            <p class="stored-detail-permission-scope">素材权限范围${permissions.scope?` · ${esc(permissions.scope)}`:''}${recordedPermissions==null?' · 演示数据':''}</p>
            ${permissionSections.map(([label,entries,icon])=>`<div class="stored-detail-permission">
              <h4>${label}</h4>
              ${Array.isArray(entries)&&entries.length
                ?`<ul>${entries.map(entry=>`<li>${sidebarIcon(icon)}<span>${esc(entry.name||'—')}${entry.external?' <small>外部</small>':''} - ${esc(entry.role||'—')}</span></li>`).join('')}</ul>`
                :'<p>暂无记录</p>'}
            </div>`).join('')}
          </section>
    </div>
  </div>`;
  $('.stored-detail-permission-close')?.focus?.();
}

async function copyStoredAssetAddress(address){
  try{
    await navigator.clipboard.writeText(address);
    toast('已复制文件地址');
  }catch{
    toast('复制未成功，可手动选中文件地址复制');
  }
}

function storedAssetVersions(item){
  const family=versionFamily(item);
  return items
    .map((entry,index)=>({entry,index}))
    .filter(({entry})=>entry===item||(family&&entry.status==='已入库'&&versionFamily(entry)===family))
    .sort((a,b)=>compareMaterialVersions(b.entry.metadata?.version,a.entry.metadata?.version));
}

function storedAssetHistory(item,versions){
  return `<div class="stored-detail-history">
        <table><thead><tr><th>版本</th><th>文件名</th><th>上传者</th><th>上传时间</th><th>查看</th></tr></thead>
        <tbody>${versions.map(({entry,index})=>`<tr>
          <td><strong>${esc(entry.metadata?.version||'—')}</strong></td>
          <td>${esc(entry.name)}</td>
          <td>${esc(entry.by||'—')}</td>
          <td>${esc(entry.uploadedAt||'—')}</td>
          <td>${entry===item?'<span class="stored-detail-status">当前查看</span>':`<button type="button" onclick="closeModal();openStoredAsset(${index})">查看此版</button>`}</td>
        </tr>`).join('')}</tbody></table>
      </div>`;
}

function showStoredAssetVersions(){
  const item=items[selected];
  if(item?.status!=='已入库')return;
  const versions=storedAssetVersions(item);
  $('#overlay').innerHTML=`<div class="modalbg">
    <div class="modal stored-detail-version-modal" role="dialog" aria-modal="true" aria-labelledby="stored-detail-version-heading">
      <div class="pending-image-heading">
        <h2 id="stored-detail-version-heading">版本管理</h2>
        <button type="button" class="pending-image-close stored-detail-version-close" aria-label="关闭版本历史" onclick="closeModal()">×</button>
      </div>
      <p class="sub">版本历史记录 · 共 ${versions.length} 版</p>
      ${versions.length===1?'<p>当前素材只有一版。</p>':''}
      ${storedAssetHistory(item,versions)}
    </div>
  </div>`;
  $('.stored-detail-version-close')?.focus?.();
}

const storedAssetActions=[
  ['下载素材','toggleStoredDownloadOptions','<path d="M12 3v12m-4-4 4 4 4-4M4 16v4h16v-4"/>','下载'],
  ['分享','showStoredShare','<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.5 6.8-4m-6.8 7 6.8 4"/>'],
  ['编辑素材','showStoredEdit','<path d="m14 6 4 4M4 20l4-.8L20 7l-3-3L5 16z"/>','编辑'],
  ['删除','showStoredDelete','<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 10v7m4-7v7"/>'],
  ['评论','showStoredComments','<path d="M4 5h16v11H10l-5 4v-4H4zM8 9h8m-8 3h6"/>'],
];
function storedAssetToolbar(){
  return `<div class="stored-asset-actions" role="group" aria-label="素材操作">${storedAssetActions.map(([label,action,path,visibleLabel=label])=>{
    const isDownload=action==='toggleStoredDownloadOptions';
    const button=`<button type="button" title="${label}" aria-label="${label}" onclick="${action}()" ${isDownload?'id="stored-download-trigger" aria-expanded="false" aria-controls="stored-download-options"':''}>
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${path}</svg>
      <span class="stored-asset-action-label">${visibleLabel}</span>
    </button>`;
    return isDownload?`<div class="stored-download-control">${button}
      <div id="stored-download-options" class="stored-download-options" hidden>
        <button type="button" onclick="downloadCurrentStoredAsset()">下载</button>
        <button type="button" onclick="showStoredDownloadSize()">下载指定尺寸或大小</button>
        <button type="button" onclick="downloadStoredImage(true)">下载透明底图</button>
      </div></div>`:button;
  }).join('')}</div>`;
}

function currentStoredAsset(){
  const item=items[selected];
  return page==='detail'&&item?.status==='已入库'?item:null;
}
function showStoredActionDialog(title,body,actions=''){
  $('#overlay').innerHTML=`<div class="modalbg"><div class="modal stored-action-modal" role="dialog" aria-modal="true" aria-labelledby="stored-action-title">
    <div class="pending-image-heading"><h2 id="stored-action-title">${esc(title)}</h2>
    <button type="button" class="pending-image-close" aria-label="关闭" onclick="closeModal()">×</button></div>
    ${body}${actions?`<div class="foot">${actions}</div>`:''}
  </div></div>`;
}
function toggleStoredDownloadOptions(){
  const options=$('#stored-download-options');
  if(!options)return;
  options.hidden=!options.hidden;
  $('#stored-download-trigger')?.setAttribute('aria-expanded',String(!options.hidden));
}
function closeStoredDownloadOptions(){
  const options=$('#stored-download-options');
  if(options&&!options.hidden)toggleStoredDownloadOptions();
}
function showStoredDownloadSize(){
  closeStoredDownloadOptions();
  showStoredActionDialog('下载指定尺寸或大小',`<p class="sub">填写宽度、高度或大小上限。只填一个尺寸时保留原图比例。</p>
    <div class="stored-download-dimensions">
      <label>宽度（px）<input id="stored-download-width" type="number" min="1" max="8192"></label>
      <label>高度（px）<input id="stored-download-height" type="number" min="1" max="8192"></label>
      <label>大小上限（KB）<input id="stored-download-limit" type="number" min="1"></label>
    </div>`, '<button class="primary" onclick="downloadStoredImage(false)">下载</button>');
}
function removeSolidImageBackground(context,width,height){
  const pixels=context.getImageData(0,0,width,height);
  const data=pixels.data;
  for(let i=3;i<data.length;i+=4){if(data[i]===0)return}
  const [red,green,blue]=data;
  const stack=[];
  function visit(pixel){
    const i=pixel*4;
    if(!data[i+3]||Math.max(Math.abs(data[i]-red),Math.abs(data[i+1]-green),Math.abs(data[i+2]-blue))>24)return;
    data[i+3]=0;
    stack.push(pixel);
  }
  for(let x=0;x<width;x++){visit(x);visit((height-1)*width+x)}
  for(let y=0;y<height;y++){visit(y*width);visit(y*width+width-1)}
  while(stack.length){
    const pixel=stack.pop();
    const x=pixel%width;
    if(x>0)visit(pixel-1);
    if(x<width-1)visit(pixel+1);
    if(pixel>=width)visit(pixel-width);
    if(pixel+width<width*height)visit(pixel+width);
  }
  context.putImageData(pixels,0,0);
}
async function downloadStoredImage(transparent){
  const item=currentStoredAsset();
  if(!item)return;
  closeStoredDownloadOptions();
  const url=item.metadata?.fileUrl||item.fileUrl||item.previewUrl;
  if(!url||!['JPG','JPEG','PNG','GIF','WEBP'].includes(item.type))return toast('当前素材不支持图片转换');
  const dimensions=['width','height','limit'].map(key=>transparent?'':$('#stored-download-'+key)?.value||'');
  if(!transparent&&(!dimensions.some(Boolean)||dimensions.some(value=>value&&(!Number.isInteger(Number(value))||Number(value)<1))))return toast('请填写有效的尺寸或大小上限');
  const [width,height,limit]=dimensions.map(Number);
  try{
    const image=new Image();
    image.crossOrigin='anonymous';
    image.src=url;
    await image.decode();
    const w=width||(height?Math.max(1,Math.round(height*image.naturalWidth/image.naturalHeight)):image.naturalWidth);
    const h=height||(width?Math.max(1,Math.round(width*image.naturalHeight/image.naturalWidth)):image.naturalHeight);
    if(Math.max(w,h)>8192||w*h>16000000)return toast('输出尺寸过大，请缩小后重试');
    const canvas=document.createElement('canvas');
    canvas.width=w;
    canvas.height=h;
    const context=canvas.getContext('2d');
    context.drawImage(image,0,0,w,h);
    if(transparent)removeSolidImageBackground(context,w,h);
    const format=limit?'image/jpeg':'image/png';
    let blob;
    for(const quality of (limit?[.92,.75,.55,.35,.15]:[1])){
      blob=await new Promise(resolve=>canvas.toBlob(resolve,format,quality));
      if(blob&&(!limit||blob.size<=limit*1024))break;
    }
    if(!blob)return toast('无法转换此图片');
    if(limit&&blob.size>limit*1024)return toast('未达到大小上限，请同时缩小尺寸或提高大小上限');
    if(currentStoredAsset()!==item)return;
    const address=URL.createObjectURL(blob);
    startStoredDownload(item,address,item.name.replace(/\.[^.]+$/,'')+(transparent?'-透明底':'')+(limit?'.jpg':'.png'));
    setTimeout(()=>URL.revokeObjectURL(address),10000);
    if(!transparent)closeModal();
    render();
  }catch{
    toast('图片转换失败，请下载原文件');
  }
}
function downloadCurrentStoredAsset(){
  const item=currentStoredAsset();
  if(!item)return;
  closeStoredDownloadOptions();
  if(!startStoredDownload(item))return toast('当前素材暂无可下载文件');
  render();
}
function startStoredDownload(item,url=item.metadata?.fileUrl||item.fileUrl||item.previewUrl||'',name=item.name){
  if(!/^(blob:|https?:\/\/)/i.test(url))return false;
  const link=document.createElement('a');
  link.href=url;
  link.download=name;
  link.target='_blank';
  link.rel='noopener';
  document.body.append(link);
  link.click();
  link.remove();
  item.downloadCount=(Number(item.downloadCount)||0)+1;
  return true;
}
let storedShareSequence=0;
const storedShareLinks=new Map();
function storedShareAddress(item){
  item.shareKey??=String(++storedShareSequence);
  return formatStoredShareAddress(item.shareKey);
}
function formatStoredShareAddress(key){
  return location.href.split('#')[0]+'#asset='+encodeURIComponent(key);
}
function showStoredShare(){
  if(!currentStoredAsset())return;
  showStoredActionDialog('分享',`<p class="stored-share-heading">常用分享方式</p>
    <div class="stored-share-row">
      <div class="stored-share-link">
        <input id="stored-share-link" aria-label="素材详情链接" placeholder="点击创建链接" readonly>
        <button id="stored-share-create" type="button" class="primary" onclick="createOrCopyStoredShare()">创建链接</button>
      </div>
      <button type="button" aria-label="通过邮件分享" title="通过邮件分享" onclick="emailStoredShare()">
        <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></svg>
      </button>
    </div>
    <div class="stored-share-settings">
      <span>分享给系统内用户</span>
      <select id="stored-share-expiry" aria-label="链接有效期" onchange="resetStoredShareDraft()"><option value="7">7天有效</option><option value="1">1天有效</option><option value="30">30天有效</option></select>
      <details><summary>分享设置</summary><p class="sub">此演示链接可在保留该素材的当前会话内打开。</p></details>
    </div>`);
}
function resetStoredShareDraft(){
  $('#stored-share-link').value='';
  $('#stored-share-create').textContent='创建链接';
}
function createOrCopyStoredShare(){
  const item=currentStoredAsset();
  const input=$('#stored-share-link');
  if(!item||!input)return;
  if(input.value)return copyStoredShare();
  const key=String(++storedShareSequence);
  const expiresAt=Date.now()+(Number($('#stored-share-expiry')?.value)||7)*86400000;
  storedShareLinks.set(key,{item,expiresAt});
  input.value=formatStoredShareAddress(key);
  $('#stored-share-create').textContent='复制链接';
}
function emailStoredShare(){
  const item=currentStoredAsset();
  const address=$('#stored-share-link')?.value;
  if(!item||!address)return toast('请先创建链接');
  location.href='mailto:?subject='+encodeURIComponent(item.name)+'&body='+encodeURIComponent(address);
}
async function copyStoredShare(){
  const item=currentStoredAsset();
  const input=$('#stored-share-link');
  if(!item||!input)return;
  try{
    await navigator.clipboard.writeText(input.value);
    item.shareCount=(Number(item.shareCount)||0)+1;
    render();
    toast('已复制素材链接');
  }catch{
    input.select?.();
    toast('请手动复制选中的链接');
  }
}
function openStoredShareLink(){
  if(!location.hash.startsWith('#asset='))return;
  const key=location.hash.slice('#asset='.length);
  const link=storedShareLinks.get(key);
  if(link?.expiresAt<=Date.now())return toast('分享链接已过期');
  const index=items.findIndex(item=>item.status==='已入库'&&(link?item===link.item:item.shareKey===key));
  if(index<0)return toast('当前会话中找不到此素材');
  openStoredAsset(index);
}
function showStoredEdit(){
  const item=currentStoredAsset();
  if(!item)return;
  const metadata=item.metadata||{};
  storedEditDraft={metadata:{storageTags:[...(metadata.storageTags||[])]}};
  render();
  for(const id of ['group','kind','product','channel'])$('#'+id).value=metadata[id]||'';
  paintUploadGroup();
  paintProductSelection();
  paintStorageTags();
  $('#stored-edit-name')?.focus?.({preventScroll:true});
}
function cancelStoredEdit(){
  storedEditDraft=null;
  render();
}
function storedEditFields(item,metadata){
  return `<div class="field"><label for="stored-edit-name">素材名称</label><input id="stored-edit-name" value="${esc(item.name)}" maxlength="150"></div>
    <div class="field"><label id="group-label">素材组</label>${uploadGroupPicker()}</div>
    ${field('素材类型',opts([...new Set([...materialKinds,metadata.kind].filter(Boolean))],'kind'),true)}
    ${field('产品标签',productDropdown(),true)}
    ${field('使用渠道（OG）',opts([...new Set(['官微','官抖','小红书','电商',metadata.channel].filter(Boolean))],'channel'),true)}
    ${storageTagControl('标签')}`;
}
function saveStoredEdit(){
  const item=currentStoredAsset();
  if(!item||!storedEditDraft)return;
  const name=$('#stored-edit-name').value.trim();
  if(!name)return toast('请填写素材名称');
  const extension=item.name.match(/\.[^.]+$/)?.[0];
  if(extension&&!name.toLowerCase().endsWith(extension.toLowerCase()))return toast('请保留原文件扩展名');
  const nameKey=value=>value.normalize('NFC').toLowerCase();
  if(items.some(other=>other!==item&&!other.uploadError&&nameKey(other.name)===nameKey(name)))return toast('名字重复，请重新填写');
  const group=$('#group').value,kind=$('#kind').value,product=$('#product').value,channel=$('#channel').value;
  if(!group||!kind||!product||!channel)return toast('请填写素材组、素材类型、产品标签和使用渠道');
  item.name=name;
  item.metadata={...item.metadata,group,kind,product,channel,desc:$('#stored-edit-desc').value.trim(),
    storageTags:storedEditDraft.metadata.storageTags};
  storedEditDraft=null;
  render();
  toast('素材信息已保存');
}
function showStoredDelete(){
  const item=currentStoredAsset();
  if(!item)return;
  showStoredActionDialog('删除素材',`<p>确定将「${esc(item.name)}」移入回收站吗？</p>`,
    '<button onclick="closeModal()">取消</button><button class="danger" onclick="deleteCurrentStoredAsset()">确认删除</button>');
}
function deleteCurrentStoredAsset(){
  const item=currentStoredAsset();
  if(!item)return;
  selectedStoredAssets.delete(item);
  storedAssetBasket.delete(item);
  recycledAssets.unshift(items.splice(selected,1)[0]);
  closeModal();
  go(storedAssetReturnPage);
  toast('已移入回收站');
}
function storedTrashContent(){
  return heading('回收站','已删除的入库素材')+`<div class="card">
    ${recycledAssets.length?`<table><thead><tr><th>素材名称</th><th>素材组</th><th>上传时间</th></tr></thead>
      <tbody>${recycledAssets.map(item=>`<tr><td>${esc(item.name)}</td><td>${esc(item.metadata?.group||'—')}</td><td>${esc(item.uploadedAt||'—')}</td></tr>`).join('')}</tbody></table>`
      :'<div class="empty">回收站暂无素材</div>'}
  </div>`;
}
const demoStoredComments=[
  {author:'许晴',date:'2026/11/09 09:15',text:'这张适合做菜谱封面，主菜很突出。'},
  {author:'周远',date:'2026/11/09 09:42',text:'官微推文可以用这版，排版时给标题留一点空间。'},
  {author:'陈禾',date:'2026/11/09 10:10',text:'建议补一张横版，方便和做法步骤放在一起。'},
  {author:'沈悦',date:'2026/11/09 10:36',text:'产品名和菜名确认后，可以一起加到标签里。'},
  {author:'陆宁',date:'2026/11/09 11:02',text:'出锅细节拍得不错，短视频封面也能用。'},
  {author:'顾言',date:'2026/11/09 11:28',text:'如果还有原图，麻烦一起放到同一个素材组。'},
];
function showStoredComments(){
  const item=currentStoredAsset();
  if(!item)return;
  const comments=[...demoStoredComments,...(item.comments||[])];
  showStoredActionDialog('评论（'+comments.length+'）',`<p class="sub">${esc(item.name)} · ${esc(item.metadata?.version||'—')}</p>
    <div class="stored-comment-history" role="region" aria-label="过往评论" tabindex="0">
      <ul class="stored-comment-list">${comments.map((comment,index)=>`<li><strong>${esc(comment.author)}</strong>
        <small>${esc(comment.date)}</small>${index<demoStoredComments.length?'<small>演示</small>':''}
        <p>${esc(comment.text)}</p></li>`).join('')}</ul>
    </div>
    <div class="field"><label for="stored-comment">写评论</label><textarea id="stored-comment" rows="3" maxlength="500" placeholder="给这张素材留句话吧…"></textarea></div>`,
    '<button class="primary" onclick="sendStoredComment()">发送</button>');
  $('#stored-comment')?.focus?.({preventScroll:true});
}
function sendStoredComment(){
  const item=currentStoredAsset();
  const message=$('#stored-comment')?.value.trim();
  if(!item)return;
  if(!message)return toast('请先填写评论');
  item.comments=[...(item.comments||[]),{author:currentReviewer,text:message,date:new Date().toLocaleString('zh-CN')}];
  showStoredComments();
}

function storedImageSection(title,entries,emptyText){
  return `<section class="stored-detail-panel"><h2>${title}</h2>
    ${entries.length?`<div class="stored-related-images">${entries.map(({asset,index})=>
      `<button type="button" onclick="openStoredAsset(${index})">
        ${asset.previewUrl?`<img src="${esc(asset.previewUrl)}" alt="" loading="lazy">`:`<span class="stored-related-placeholder">${esc(asset.type)}</span>`}
        <span>${esc(asset.name)}</span>
      </button>`).join('')}</div>`:`<p class="sub">${emptyText}</p>`}
  </section>`;
}
function storedImageRecommendations(item){
  const {kind,product,storageTags=[],channel}=item.metadata||{};
  const products=new Set(String(product||'').split('、').filter(Boolean));
  const tags=new Set(storageTags);
  const candidates=items.map((asset,index)=>({asset,index})).filter(({asset})=>
    asset!==item&&asset.status==='已入库'&&['JPG','JPEG','PNG','GIF','WEBP'].includes(asset.type));
  const newest=(a,b)=>(b.asset.archiveOrder??0)-(a.asset.archiveOrder??0)||b.index-a.index;
  const sameType=kind?candidates.filter(({asset})=>asset.metadata?.kind===kind).sort(newest).slice(0,4):[];
  const recommended=candidates.filter(entry=>!sameType.includes(entry)).map(entry=>{
    const metadata=entry.asset.metadata||{};
    const productMatches=String(metadata.product||'').split('、').filter(value=>products.has(value)).length;
    const tagMatches=(metadata.storageTags||[]).filter(value=>tags.has(value)).length;
    return {...entry,score:productMatches*3+tagMatches*2+(channel&&metadata.channel===channel?1:0)};
  }).sort((a,b)=>b.score-a.score||newest(a,b)).slice(0,4);
  return storedImageSection('同类型图片',sameType,'暂无同类型图片')
    +storedImageSection('猜你喜欢',recommended,'暂无其他推荐图片');
}
function storedAssetDetail(item){
  const metadata=item.metadata||{};
  const versions=storedAssetVersions(item);
  const tags=metadata.storageTags||[];
  const fields=[
    ['素材组',metadata.group],['素材类型',metadata.kind],
    ['产品标签',metadata.product],['使用渠道（OG）',metadata.channel],
  ];
  const distributionPlatform=metadata.distributionPlatform||item.distributionPlatform;
  const fileAddress=metadata.fileUrl||item.fileUrl||item.previewUrl;
  const fileFields=[
    ['创建时间',metadata.createdAt||item.createdAt],['更新时间',metadata.updatedAt||item.updatedAt],
    ['文件尺寸',metadata.dimensions||item.dimensions],['素材ID',metadata.assetId??item.assetId??item.id],
    ['文件格式',item.type],['文件大小',item.size],
  ];
  const canPreview=item.previewUrl&&['JPG','JPEG','PNG','GIF','WEBP'].includes(item.type);
  const preview=canPreview
    ?`<img src="${esc(item.previewUrl)}" alt="${esc(item.name)}" onload="document.getElementById('stored-detail-dimensions').textContent=this.naturalWidth+'×'+this.naturalHeight">`
    :`<div class="stored-asset-format">${esc(item.type||'文件')} · 暂无图片预览</div>`;
  return `<div class="stored-detail">
    <div class="stored-detail-header">
      <div><span class="stored-detail-status">已入库</span><h1>${esc(item.name)}</h1></div>
      <button type="button" onclick="go(storedAssetReturnPage)">← 返回列表</button>
    </div>
    <div class="stored-detail-overview">
      <section class="stored-detail-panel stored-detail-media-panel">
        <h2>素材预览</h2>
        <div class="stored-detail-preview">
          ${preview}
          ${canPreview?`<button type="button" class="stored-asset-preview-button" aria-label="查看 ${esc(item.name)} 大图" onclick="showAssetImage(${items.indexOf(item)})"></button>`:''}
        </div>
        <h3>素材简介</h3>
        ${storedEditDraft?`<textarea id="stored-edit-desc" aria-label="素材简介" rows="4" maxlength="500">${esc(metadata.desc||'')}</textarea>`
          :`<p class="stored-detail-description">${esc(metadata.desc||'暂无素材简介')}</p>`}
      </section>
      <section class="stored-detail-panel stored-detail-basic">
        <h2 id="stored-detail-basic-heading">基本信息</h2>
        <div class="stored-detail-basic-scroll" role="region" aria-labelledby="stored-detail-basic-heading" tabindex="0">
          ${storedEditDraft?storedEditFields(item,metadata):`<dl class="stored-detail-fields">
            <div><dt>素材名称</dt><dd>${esc(item.name)}</dd></div>
            <div><dt>权限信息</dt><dd><button type="button" class="stored-detail-permission-button" onclick="showStoredAssetPermissions()">查看权限</button></dd></div>
            ${fields.map(([label,value])=>`<div><dt>${label}</dt><dd>${esc(value||'—')}</dd></div>`).join('')}
            <div class="stored-detail-tag-field"><dt>标签</dt><dd class="stored-asset-tags">${tags.map(label=>`<span class="storage-tag">${esc(label)}</span>`).join('')||'—'}</dd></div>
          </dl>`}
          <dl class="stored-detail-fields stored-detail-version-info">
            <div><dt>上传时间</dt><dd>${esc(item.uploadedAt||'—')}</dd></div>
            <div><dt>当前版本</dt><dd><button type="button" class="stored-detail-permission-button" aria-haspopup="dialog" onclick="showStoredAssetVersions()">${esc(metadata.version||'—')} · 共 ${versions.length} 版</button></dd></div>
            <div><dt>分发平台</dt><dd>${distributionPlatform?`<span class="storage-tag">${esc(distributionPlatform)}</span>`:'—'}</dd></div>
            <div><dt>文件地址</dt><dd class="stored-detail-file-address">${fileAddress?`
              <span>${esc(fileAddress)}</span>
              <button type="button" aria-label="复制文件地址" title="复制文件地址" data-address="${esc(fileAddress)}" onclick="copyStoredAssetAddress(this.dataset.address)">
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>
              </button>`:'—'}</dd></div>
          </dl>
          <details class="stored-detail-extra">
            <summary>文件属性</summary>
            <dl class="stored-detail-fields">
              ${fileFields.map(([label,value])=>`<div><dt>${label}</dt><dd${label==='文件尺寸'?' id="stored-detail-dimensions"':''}>${esc(value??'—')}</dd></div>`).join('')}
            </dl>
          </details>
        </div>
        ${storedEditDraft?`<div class="foot"><button type="button" onclick="cancelStoredEdit()">取消</button>
          <button type="button" class="primary" onclick="saveStoredEdit()">确定</button></div>`:storedAssetToolbar()}
      </section>
    </div>
    ${storedImageRecommendations(item)}
  </div>`;
}

function detail(){let x=items[selected];if(x.status==='已入库')return storedAssetDetail(x);let m=x.metadata||{kind:'菜式应用',product:'鲜麻青花椒酱',channel:'官微',version:'V1.0',desc:'春日新品传播主视觉，用于品牌官方渠道。'};return heading(esc(x.name),x.externalSubmission?'待审核 · '+esc(x.from):'素材库 / 待入库 / 审核 · '+esc(x.from),`<button onclick="go('${x.externalSubmission?'review':'queue'}')">← 返回列表</button>`)+`<div class="notice">${x.dup?'库内存在相似图片，请查看相似项并确认是否继续上传。':x.status==='已退回'?'审核未通过：'+esc(x.reason||'请更新横版视频封面，并确认最新版本信息。'):x.status==='待补充字段'?'未识别到完整的素材类别、业务字段及标签，请上传人补充并重新校验。':x.status==='已入库'?'审核已通过，素材已归档，可进入素材库查看与使用。':x.manual?'该格式不在 处理范围，已直接进入纯人工审核。':'必要字段已完整，查重通过；请核对 输出结果后进行人工审核。'}</div><div class="grid"><div><div class="card"><div class="preview">${x.externalSubmission&&x.previewUrl&&['JPG','JPEG','PNG','GIF','WEBP'].includes(x.type)?`<img class="external-review-image" src="${esc(x.previewUrl)}" alt="${esc(x.name)}">`:`${x.type==='MP4'?'▶':'◇'}　素材示意预览`}</div><p class="sub">${esc(x.name)} · ${esc(x.size)}</p>${x.externalSubmission?`<p class="sub">目标素材组：${esc(m.group)}</p>${x.submissionNote?`<div class="notice"><strong>上传者备注</strong><div style="white-space:pre-wrap;overflow-wrap:anywhere">${esc(x.submissionNote)}</div></div>`:''}`:''}<div class="fields">${Object.entries({'素材类型':m.kind,'产品标签':m.product,'使用渠道（OG）':m.channel,'版本':m.version}).map(([k,v])=>`<div class="field"><label class="sub">${k}</label><b>${esc(v)}</b></div>`).join('')}</div><p class="sub">素材简介：${esc(m.desc)}</p><div class="detail-storage-tags"><span class="sub">入库标签：</span>${(m.storageTags||[]).map(tag=>`<span class="storage-tag">${esc(tag)}</span>`).join('')}</div></div>${aiReviewPanel(x,m)}<div class="card"><h2>人工审核</h2>${canReview(x)?'<button onclick="editMeta()">补充 / 修改素材信息</button>':''}<p class="sub">内部上传由本人确认；Agency 上传由收集任务发起人审核。</p>${canReview(x)?`<textarea id="reviewnote" rows="3" placeholder="审核备注；退回时必填修改原因"></textarea><div class="foot"><button class="danger" onclick="reviewAction(false)">退回修改</button><button class="primary" onclick="reviewAction(true)">确认通过并入库</button></div>`:x.status==='待补充字段'?`<button class="primary" onclick="editMeta()">补充必要字段</button>`:x.status==='已退回'?`<button class="primary" onclick="editMeta()">修改信息并重新提交</button>`:x.dup?`<button onclick="files=[];go('upload')">上传修订版本</button>`:`<button class="primary" onclick="go('library')">前往素材库</button>`}</div></div><div><div class="card"><h2>预处理结果</h2><p class="row">信息处理 ${tag(x.manual?'已跳过 · 纯人工审核':x.ai?'必要字段完整':'待补充字段')}</p><p class="sub">识别素材类别、业务信息与标签，生成素材简介。</p><hr style="border:0;border-top:1px solid #eee;margin:20px 0"><p class="row">文件查重 ${tag(x.dup?'发现重复':'查重通过')}</p><p class="sub">文件查重独立执行，不受 字段完整性和识别结果影响。</p>${x.dup?`<div class="notice">重复对象：产品细节_场景图_终版.jpg<br>归档路径：CRM / 品牌内容<br>上传时间：2026-11-01<br>状态：相似素材，等待确认</div>`:''}</div><div class="card"><h2>处理记录</h2><div class="timeline"><div>素材上传完成<br><small>上传人：${esc(x.by)}</small></div><div>信息处理<br><small>${x.manual?'格式不支持，跳过 预处理':x.ai?'必要字段完整':'待上传人补充信息'}</small></div><div>文件查重<br><small>${x.dup?'发现重复，拒绝入库':'未发现重复，通过'}</small></div><div>${x.status}<br><small>${x.status==='待人工审核'?'两项检查通过，进入人工审核':x.status==='已入库'?'已归档至指定素材组':'等待相应处理'}</small></div></div></div></div></div>`}
function openReviewReturn(){
  if(!canReview(externalReviewItem))return;
  $('#overlay').innerHTML=`<div class="modalbg"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="review-return-title">
    <h2 id="review-return-title">退回修改</h2>
    <p>${esc(externalReviewItem.name)}</p>
    <div class="field">
      <label for="review-return-reason">退回原因 <span class="required">*</span></label>
      <textarea id="review-return-reason" rows="4" required placeholder="请填写需要上传者修改的内容" oninput="this.classList.remove('ai-field-error');this.removeAttribute('aria-invalid')"></textarea>
    </div>
    <div class="foot"><button onclick="closeModal()">取消</button><button class="danger" onclick="reviewAction(false,'review-return-reason')">确认退回</button></div>
  </div></div>`;
  $('#review-return-reason')?.focus?.();
}
function reviewAction(pass,noteId='reviewnote'){
  const item=externalReviewItem||items[selected];
  if(!canReview(item))return toast('此素材当前不可审核');
  const note=$('#'+noteId);
  const reason=note?.value.trim()||'';
  if(!pass&&!reason){
    note?.classList.add('ai-field-error');
    note?.setAttribute('aria-invalid','true');
    note?.focus();
    return toast('请填写退回原因');
  }
  if(item.aiState?.phase==='running')return toast('AI 正在识别，请稍候');
  if(pass&&externalReviewItem){
    const draft=activeUploadFile;
    captureUploadDraft();
    if(fileMissingFields(draft).length){
      uploadAI.showValidation=true;
      validateUploadFields();
      return;
    }
    item.metadata={...draft.metadata};
    item.versionMode=draft.versionMode;
  }else if(pass&&fileMissingFields(item).length){
    return toast('请先补全必填信息');
  }
  if($('#ai-title')&&!item.manual){
    item.aiTitle=$('#ai-title').value;
    item.aiScene=$('#ai-scene').value;
    item.aiTags=$('#ai-tags').value;
    item.aiSummary=$('#ai-summary').value;
  }
  item.reason=reason;
  item.status=pass?'已入库':'已退回';
  if(pass){
    item.archiveOrder=++archiveOrder;
    item.archivedAt=Date.now();
  }
  item.reviewHistory=[...(item.reviewHistory||[]),{
    action:pass?'审核通过':'已退回',reviewer:currentReviewer,reason,at:new Date().toISOString(),
    name:item.name,version:item.metadata?.version,group:item.metadata?.group,uploader:item.by,
  }];
  const remaining=items.some(canReview);
  go(remaining?'review':'queue');
  toast(pass?'审核通过，已归档至素材库':'已退回，上传者可查看原因');
}
function editMeta(){$('#overlay').innerHTML=`<div class="modalbg"><div class="modal"><h2>补充 / 修改素材信息</h2><p class="sub">保存后重新校验必要字段与文件重复状态。</p>${meta()}<div class="foot"><button onclick="closeModal()">取消</button><button class="primary" onclick="saveMeta()">保存并重新校验</button></div></div></div>`;let m=items[selected].metadata;if(m){for(let id of ['group','kind','product','channel','version','desc']){let n=$('#'+id);if(n)n.value=m[id]||''}paintUploadGroup();paintProductSelection()}paintStorageTags()}function saveMeta(){for(let id of ['kind','product','channel'])if(!$('#'+id).value||$('#'+id).selectedIndex===0)return toast('请补全必填字段');if(!$('#version').value.trim())return toast('请填写版本');let x=items[selected];x.metadata={...x.metadata,group:$('#group').value||x.metadata?.group,kind:$('#kind').value,product:$('#product').value,channel:$('#channel').value,version:$('#version').value,desc:$('#desc').value};x.ai=true;x.status=x.dup?'相似待确认':'待人工审核';closeModal();render();toast('信息已保存，重新校验完成')}
function guide(){return heading('流程与原型范围','供产品、业务和研发共同评审的第一版交互方案')+`<div class="flow">${[['01 · 双入口上传','内部人员选择本地素材；发起人创建收集任务、选择素材组，再将专属链接发送给 Agency。访客仅访问任务上传页。'],['02 · 统一填写与校验','保留素材组、素材简介、素材类型、产品标签、年份月份、使用渠道及文件夹结构选项，新增版本。格式、大小及必填校验失败则提示原因。'],['03 · 并行预处理','接收图片、视频、文档、设计源文件、纯文本、表格、字体文件、音频、压缩包及其他格式。仅限定范围执行：判断类别、按类别规范模板预提取字段、打标、生成简介；不支持的类型直接纯人工审核。查重独立执行。'],['04 · 条件汇合','必要字段缺失由上传人补充后再次校验。发现相似度超过60%的图片时展示缩略图，用户确定后可继续，取消返回上传页。支持的文件在字段完整且查重通过后进入人工审核；不支持的类型跳过 流程，直接人工审核。相似图片需确认后继续。'],['05 · 人工审核','人工审核页展示 类别、规范字段、素材标签与简介，用户可修改并审核确认。内部素材由本人确认；Agency 素材由收集发起人审核。退回需填写原因，上传人修改后重新校验并提交。'],['06 · 归档与复用','审核通过后通知相关方、归档到指定素材组，在素材库浏览与复用。通知在本原型中以状态及提示模拟。']].map(([t,d])=>`<div class="card"><h2>${t}</h2><p class="sub">${d}</p></div>`).join('')}</div><div class="notice">评审假设：标星字段、500 MB 大小上限与任务截止时间为原型建议。演示支持 JPG/JPEG/PNG/MP4/PDF/TXT，其余格式直接纯人工审核；实际 支持范围及各类别规范模板待业务配置。访客鉴权、任务有效期、真实文件上传、识别、指纹查重、通知与下载均需后端接入。本原型不提供真实访问控制；返回内部端按钮仅供评审切换。</div><div class="card"><h2>建议体验顺序</h2><p>① 上传素材 → 添加示例并填字段 → 提交 → 审核通过入库<br>② 待补充字段 → 补充信息 → 再次校验 → 审核<br>③ 收集任务 → 新建任务 → 访客页提交 → 内部审核退回 → 修改重提<br>④ 相似待确认 → 查看重复对象 → 上传修订版本</p></div>`}
function fitApplicationViewport(){if(typeof window==='undefined')return;let shell=document.querySelector('.client-shell');if(!shell)return;let visual=window.visualViewport;let width=visual?.width||document.documentElement.clientWidth||window.innerWidth;let height=visual?.height||window.innerHeight;let left=visual?.offsetLeft||0,top=visual?.offsetTop||0;shell.style.position='fixed';shell.style.left=left+'px';shell.style.top=top+'px';shell.style.width=width+'px';shell.style.height=height+'px';shell.style.margin='0';window.__prototypeLayout={build:'portfolio-viewport-1105',page,viewport:{width,height,left,top,scale:visual?.scale||1},shell:{left:shell.getBoundingClientRect().left,width:shell.getBoundingClientRect().width},sidebar:document.querySelector('.client-sidebar')?.getBoundingClientRect().toJSON?.()};}
document.addEventListener('click',closePopularSearchOutside);
document.addEventListener('click',event=>{if(!event.target.closest('.stored-download-control'))closeStoredDownloadOptions()});
document.addEventListener('focusin',closePopularSearchOutside);
document.addEventListener('keydown',closePopularSearchWithEscape);
if(typeof window!=='undefined'){window.setInterval(rotateSearchRecommendation,3500);window.addEventListener('resize',fitApplicationViewport);window.addEventListener('hashchange',openStoredShareLink);window.visualViewport?.addEventListener('resize',fitApplicationViewport);window.visualViewport?.addEventListener('scroll',fitApplicationViewport)}
if(location.hash==='#agency')page='agency';
if(location.hash==='#tasks')page='tasks';
render();
openStoredShareLink();
