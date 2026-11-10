const fs=require('fs'),vm=require('vm'),assert=require('assert');const nodes={},timers=[];
function node(s){if(nodes[s])return nodes[s];let val='';let n={tagName:['#group','#kind','#channel'].includes(s)?'SELECT':'INPUT',innerHTML:'',textContent:'',checked:false,selectedIndex:0,classList:{toggle(){},add(){},remove(){}},closest(){return null},focus(){},setAttribute(){},removeAttribute(){},scrollTo(){},scrollIntoView(){}};Object.defineProperty(n,'value',{get(){return val},set(v){val=String(v);n.selectedIndex=!val||val.startsWith('请选择')?0:1}});return nodes[s]=n}
const ctx={document:{querySelector:node,querySelectorAll:()=>[],addEventListener(){},createElement:()=>({remove(){}}),body:{append(){}}},location:{hash:''},setTimeout:(fn,ms)=>timers.push({fn,ms})};vm.createContext(ctx);vm.runInContext(fs.readFileSync('src/prototype.js','utf8'),ctx);const run=s=>vm.runInContext(s,ctx);const get=node;
run("go('upload');addFiles([{name:'家乐素材.jpeg',size:700000},{name:'重过.jpeg',size:300000},{name:'重不过.jpeg',size:200000}])");assert.equal(run('files.length'),0);for(let i=0;i<3;i++)get('#material-name-'+i).value=['111','222','333'][i];run('confirmMaterialNames()');assert.equal(run('files.length'),3);assert.equal(run('activeUploadFile.name'),'111.jpeg');assert.equal(run('uploadAI.phase'),'running');assert.equal(timers.filter(t=>t.ms===2200).length,3);assert(get('#app').innerHTML.includes('onclick="switchUploadFile(1)"'));
run('switchUploadFile(1)');assert.equal(run('activeUploadFile.name'),'222.jpeg');assert.equal(run('uploadAI.phase'),'running');assert.equal(timers.filter(t=>t.ms===2200).length,3,'switch does not restart recognition');
// Completing a background file must not change the active file's field group.
timers.filter(t=>t.ms===2200)[0].fn();assert.equal(run('uploadAI.phase'),'running');assert.equal(get('#desc').value,'');timers.filter(t=>t.ms===2200)[1].fn();assert.equal(run('uploadAI.phase'),'partial');assert.equal(get('#desc').value,'');timers.filter(t=>t.ms===2200)[2].fn();timers.filter(t=>t.ms===1600).forEach(t=>t.fn());
run('switchUploadFile(0)');assert.equal(run('uploadAI.phase'),'done');assert(get('#desc').value.length>0);assert.equal(run('files[0].duplicatePhase'),'passed');get('#desc').value='第一张的独立描述';run("onUploadFieldEdit({target:{id:'desc'}});switchUploadFile(1)");assert.equal(run('uploadAI.phase'),'partial');assert.equal(get('#desc').value,'');assert.equal(get('#product').value,'');run('switchUploadFile(2)');assert.equal(run('uploadAI.phase'),'done');assert.equal(run('files[2].duplicatePhase'),'similar');assert(get('#desc').value.length>0);run('switchUploadFile(0)');assert.equal(get('#desc').value,'第一张的独立描述');
// Unchecked files do not block a valid checked file, even when being viewed.
run("files[0].checked=true;switchUploadFile(1);submitUpload(false)");assert.equal(run('pendingUpload.files.length'),1);assert.equal(run('pendingUpload.files[0].name'),'111.jpeg');run('cancelUploadConfirmation()');
// Checked incomplete files block the batch and are opened for correction.
run('files[1].checked=true;switchUploadFile(0);submitUpload(false)');assert.equal(run('pendingUpload'),null);assert.equal(run('activeUploadFile.name'),'222.jpeg');assert.equal(run('uploadAI.showValidation'),true);
get('#desc').value='第二张的补充描述';get('#kind').value='案例';run("onUploadFieldEdit({target:{id:'desc'}});toggleProduct(3,true);toggleProduct(4,true);toggleProduct(5,true);toggleProduct(5,false);switchUploadFile(0)");
assert.equal(get('#product').value,'鲜麻青花椒酱');
run('switchUploadFile(1)');
assert.equal(get('#product-label').textContent,'辣鲜露、浓缩鸡汁');
assert.equal(get('#desc').value,'第二张的补充描述');assert.equal(get('#kind').value,'案例');assert.equal(get('#product').value,'辣鲜露、浓缩鸡汁');run('submitUpload(false)');assert.equal(run('pendingUpload.files.length'),2);run('confirmUploadYes()');assert.equal(run('items.length'),2);assert.equal(run('items[0].metadata.desc'),'第一张的独立描述');assert.equal(run('items[1].metadata.desc'),'第二张的补充描述');assert.equal(run('items[1].metadata.kind'),'案例');assert.equal(run('items[1].metadata.product'),'辣鲜露、浓缩鸡汁');assert(run('storedAssetDetail(items[1])').includes('辣鲜露、浓缩鸡汁'));assert.equal(run('files.length'),1);assert.equal(run('files[0].name'),'333.jpeg');run("acknowledgeUploadSuccess();go('upload');files[0].checked=true;submitUpload(false)");assert(get('#overlay').innerHTML.includes('库内已存在相似图片'));assert.equal(run('items.length'),2);
console.log('PASS: clickable names, independent concurrent AI and duplicate statuses, edits persist across switches, background callbacks do not overwrite active fields, checked-only per-file validation, correct per-file metadata committed, unselected files preserved.');
// Browser inline handlers resolve `files` to the input element's files property.
// Checkbox inputs expose files=null, so handlers must call a separate function.
const mark=timers.length;run("closeModal();files=[];pendingUpload=null;go('upload');addFiles([{name:'家乐素材.jpeg',size:700000},{name:'fresh.jpeg',size:500000}])");get('#material-name-0').value='114';get('#material-name-1').value='224';run('confirmMaterialNames()');timers.slice(mark).filter(t=>t.ms===1600).forEach(t=>t.fn());timers.slice(mark).filter(t=>t.ms===2200).forEach(t=>t.fn());ctx.checkbox={files:null,checked:true};
run('(function(){with(this){setUploadChecked(0,this.checked)}}).call(checkbox)');assert.equal(run('files[0].checked'),true);assert(get('#app').innerHTML.includes('已选 1 项'));run('switchUploadFile(1)');assert.equal(run('files[0].checked'),true);assert(!run('files[1].checked'));run('submitUpload(false)');assert.equal(run('pendingUpload.files.length'),1);assert.equal(run('pendingUpload.files[0].name'),'114.jpeg');run('cancelUploadConfirmation()');
run('(function(){with(this){setAllUploadChecked(this.checked)}}).call(checkbox)');assert(get('#app').innerHTML.includes('已选 2 项'));assert(run('files.every(f=>f.checked)'));run('submitUpload(false)');assert.equal(run('pendingUpload.files.length'),2);run('cancelUploadConfirmation()');ctx.checkbox.checked=false;run('(function(){with(this){setAllUploadChecked(this.checked)}}).call(checkbox)');assert(get('#app').innerHTML.includes('已选 0 项'));run('submitUpload(false)');assert.equal(run('pendingUpload'),null);
console.log('PASS: checkbox inline scope with files=null no longer shadows data; single/all selection updates count, survives filename switches and drives confirmation accurately.');
run("closeModal();go('queue')");let menu=run('addMenu()');const labels=['上传文件','上传文件夹','百度网盘导入','MUSE导入','新建纯文本','从素材库添加','新建子素材组'];let last=-1;for(const label of labels){assert(menu.indexOf(label)>last);last=menu.indexOf(label)}assert(menu.includes('<details'));assert.equal((menu.match(/chooseAddAction/g)||[]).length,7);
const nativePickers=[];const originalCreateElement=ctx.document.createElement;ctx.document.createElement=tag=>{if(tag!=='input')return originalCreateElement(tag);let picker={attrs:[],setAttribute(k){this.attrs.push(k)},click(){this.clicked=true},remove(){this.removed=true}};nativePickers.push(picker);return picker};
const nativeUploadMark=timers.length;
run("closeModal();items=[];go('library');chooseAddAction('file')");
assert(nativePickers[0].clicked);
nativePickers[0].files=[{name:'家乐素材.jpeg',size:700000}];
nativePickers[0].onchange();
assert.equal(run('page'),'library');
assert.equal(run('items.length'),0);
assert(get('#overlay').innerHTML.includes('填写素材名字'));
get('#material-name-0').value='';
run('confirmMaterialNames()');
assert.equal(get('#material-name-error-0').textContent,'请填写素材名字');
assert.equal(run('items.length'),0);
get('#material-name-0').value='本地文件';
get('#material-path-0').value='';
run('confirmMaterialNames()');
assert.equal(run('items.length'),0);
assert(get('#overlay').innerHTML.includes('素材1.2.1.1'));
assert(get('#overlay').innerHTML.includes('class="naming-tree-branch" hidden'));
const namingBranch={hidden:true};
const namingToggle={parentElement:{nextElementSibling:namingBranch},setAttribute(name,value){this[name]=value}};
ctx.namingToggle=namingToggle;
run('toggleNamingBranch(namingToggle)');
assert.equal(namingBranch.hidden,false);
assert.equal(namingToggle['aria-expanded'],'true');
const routingPicker={open:true,querySelector(selector){
  return get({input:'#material-path-0',summary:'#material-path-0-summary','.naming-tree-value':'#material-path-0-value'}[selector]);
}};
ctx.routingChoice={dataset:{path:'根素材组-1'},closest:()=>routingPicker};
run('chooseNamingPath(routingChoice)');
assert.equal(routingPicker.open,false);
assert.equal(get('#material-path-0-value').textContent,'根素材组-1');
run('confirmMaterialNames()');
assert.equal(run('page'),'queue');
assert.equal(get('#overlay').innerHTML,'');
assert(run('queueContent()').includes('<th>状态</th>'));
assert(get('#rows').innerHTML.includes('上传中'));
assert.equal(run('items[0].duplicatePhase'),undefined);
assert(run('clientSidebar()').includes('<span>待入库</span><span class="cms-nav-count">1</span>'));
run('storeQueuedMaterial(0)');
assert.equal(get('#overlay').innerHTML,'');
timers.slice(nativeUploadMark).filter(t=>t.ms===350).forEach(t=>t.fn());
assert(get('#rows').innerHTML.includes('AI 识别中'));
timers.slice(nativeUploadMark).filter(t=>t.ms===2200).forEach(t=>t.fn());
assert(get('#rows').innerHTML.includes('pending-status-label ready">待入库'));
assert(!get('#rows').innerHTML.includes('已生成 4 个标签'));
assert(!get('#rows').innerHTML.includes('查重通过'));
run('storeQueuedMaterial(0)');
assert.equal(get('#overlay').innerHTML,'');
assert.equal(run('page'),'upload');
assert.equal(run('activeUploadFile.name'),'本地文件.jpeg');
assert.equal(run('items[0].status'),'待人工审核');
assert.equal(run('pendingQueueItems().length'),0);
assert(get('#app').innerHTML.includes('<span>待入库</span><span class="cms-nav-count">0</span>'));
run("go('queue',{cancelApproval:true})");
assert.equal(run('pendingQueueItems().length'),1);
assert(get('#app').innerHTML.includes('<span>待入库</span><span class="cms-nav-count">1</span>'));
run('deleteQueueItem(0)');

run("go('queue');chooseAddAction('folder')");assert.equal(run('page'),'queue');assert(nativePickers[1].attrs.includes('webkitdirectory'));nativePickers[1].oncancel();assert.equal(run('page'),'queue');assert.equal(get('#overlay').innerHTML,'');
run("go('queue');chooseAddAction('baidu')");assert(get('#overlay').innerHTML.includes('百度网盘导入'));assert(get('#overlay').innerHTML.includes('不连接外部服务'));get('#import-reference').value='https://pan.baidu.com/s/demo';get('#import-name').value='网盘素材';run("confirmAddAction('baidu')");assert.equal(run('pendingLocalFiles[0].name'),'网盘素材.pdf');assert(get('#overlay').innerHTML.includes('填写素材名字'));run("cancelMaterialNames();go('queue');chooseAddAction('muse')");assert(get('#overlay').innerHTML.includes('MUSE导入'));
run("closeModal();chooseAddAction('group')");get('#subgroup-name').value='演示子组';run("confirmAddAction('group')");assert(run("materialGroups.includes('演示子组')"));assert(!run('clientSidebar()').includes('reference-tree'));assert(run("opts(['默认'],'group')").includes('演示子组'));
ctx.File=File;run("chooseAddAction('text')");get('#text-name').value='测试文本';get('#text-content').value='这是一段纯文本';run("confirmAddAction('text')");assert.equal(run('pendingLocalFiles[0].name'),'测试文本.txt');
console.log('PASS: seven-item add menu ordering, file/folder picker routing, simulated import naming, text creation and subgroup dialog. Existing per-file workflow tests remain passing.');
const beforeNavigationCount=run('items.length');run("closeModal();go('library')");let globalPage=run('content()');assert(globalPage.includes('client-upload-all'));assert(globalPage.includes('>↥ 上传</button>'));assert(!globalPage.includes('client-collect'));assert(!globalPage.includes('client-add-menu'));assert(!globalPage.includes('group-folder-section'));
run("openMaterialGroup('Portfolio-辣鲜露系列')");assert.equal(run('page'),'group');let groupPage=run('content()');assert(groupPage.includes('client-collect'));assert(groupPage.includes('client-add-menu'));assert(!groupPage.includes('client-upload-all'));assert.equal((groupPage.match(/class="group-folder-card"/g)||[]).length,4);assert(get('#app').innerHTML.includes('Portfolio-辣鲜露系列'));assert(run("sidebarGroupRow('演示子组','','folder')").includes('onclick="openMaterialGroup(this.dataset.group)"'));
run("openMaterialGroup('家乐鲜露')");assert.equal(run('activeMaterialGroup'),'家乐鲜露');assert(!run('content()').includes('group-folder-section'));assert(run('content()').includes('client-add-menu'));run("go('library')");assert(!run('content()').includes('client-add-menu'));assert.equal(run('items.length'),beforeNavigationCount);
console.log('PASS: 全部素材 shows upload only; group rows open group view with collection/add menu and child folders; switching back restores global view; no material mutations.');
ctx.location.href='file:///prototype.html';run("closeModal();go('tasks');taskModal()");let taskDialog=get('#overlay').innerHTML;for(const label of ['主题','有效期','备注','访问密码','刷新密码','复制链接分享','通知指定成员','生成任务'])assert(taskDialog.includes(label));assert(!taskDialog.includes('收集截止时间'));assert(!taskDialog.includes('任务名称'));let firstPassword=run('collectionPassword');assert.equal(firstPassword.length,4);run('refreshCollectionPassword()');assert.notEqual(run('collectionPassword'),firstPassword);get('#tn').value='新品素材收集';get('#ta').value='青禾创意';get('#tg').value='CRM / 品牌内容';get('#td').value='7';get('#task-note').value='只提交终版';run("setCollectionNotify('members')");assert.equal(get('#notify-members').hidden,false);get('#task-members').value='';let taskBefore=run('taskMade');run('createTask()');assert.equal(run('taskMade'),taskBefore);get('#task-members').value='张三，李四';run('createTask()');assert.equal(run('taskMade.name'),'新品素材收集');assert.equal(run('taskMade.expiryDays'),7);assert.equal(run('taskMade.note'),'只提交终版');assert.equal(run('taskMade.notify'),'members');assert.equal(run('taskMade.members'),'张三，李四');assert(get('#overlay').innerHTML.includes('任务已生成'));assert(get('#overlay').innerHTML.includes('file:///prototype.html#agency'));run('closeModal();previewAgency()');assert(get('#app').innerHTML.includes('请输入访问密码'));get('#agency-password').value='wrong';run('unlockAgency()');assert.equal(run('agencyUnlocked'),false);get('#agency-password').value=run('taskMade.password');run('unlockAgency()');assert.equal(run('agencyUnlocked'),true);assert(get('#app').innerHTML.includes('访客专属上传入口'));run('taskMade.expiresAt=Date.now()-1;render()');assert(get('#app').innerHTML.includes('收集任务已过期'));
console.log('PASS: task terminology, validity select, password refresh, member notification validation/recording, generated link, same-session password preview and expiry. No notifications sent.');
const backgroundMark=timers.length;run("closeModal();files=[];pendingLocalFiles=[];go('upload');addFiles([{name:'顺德鱼生.jpeg',size:700000},{name:'排骨.jpeg',size:400000}])");assert.equal(run('files.length'),0);assert.equal(run('pendingLocalFiles[0].aiState.phase'),'running');assert.equal(run('pendingLocalFiles[0].duplicatePhase'),'running');assert(get('#overlay').innerHTML.includes('批量命名素材'));assert.equal(timers.slice(backgroundMark).filter(t=>t.ms===2200).length,2);timers.slice(backgroundMark).filter(t=>t.ms===1600||t.ms===2200).forEach(t=>t.fn());assert.equal(run('pendingLocalFiles[0].aiState.phase'),'done');assert.deepEqual(Array.from(run('pendingLocalFiles[0].metadata.storageTags')),['顺德鱼生']);get('#material-name-0').value='图一';get('#material-name-1').value='图二';run("confirmMaterialNames()");assert.equal(run('page'),'upload');assert.equal(run('page'),'upload');assert.equal(run('uploadAI.phase'),'done');assert(get('#storage-tags-list').innerHTML.includes('顺德鱼生'));assert(run('upload()').indexOf('加入素材组')<run('upload()').indexOf('入库标签'));run('openStorageTag()');get('#custom-storage-tag-input').value='自定义美食';run('addStorageTag()');assert.deepEqual(Array.from(run('files[0].metadata.storageTags')),['顺德鱼生','自定义美食']);run('switchUploadFile(1)');assert(get('#storage-tags-list').innerHTML.includes('排骨'));assert(!get('#storage-tags-list').innerHTML.includes('自定义美食'));run('switchUploadFile(0)');assert(get('#storage-tags-list').innerHTML.includes('自定义美食'));run('setUploadChecked(1,false);setUploadChecked(0,true);submitUpload(false);confirmUploadYes()');assert(run('items[items.length-1].metadata.storageTags').includes('自定义美食'));
const cancellationMark=timers.length;run("closeModal();addFiles([{name:'取消识别.jpeg',size:400000}]);cancelMaterialNames()");timers.slice(cancellationMark).forEach(t=>t.fn());assert.equal(run('pendingLocalFiles.length'),0);
console.log('PASS: recognition and duplicate checking begin immediately on local selection during naming; completed results retained after rename; automatic/custom tags isolate and persist per file and into storage; cancel safely discards pending work.');
run("closeModal();go('upload');paintStorageTags()");assert(run('storageTagControl()').includes('storage-tags-picker'));get('#storage-tags-dropdown').hidden=true;run('toggleStorageTagDropdown()');assert.equal(get('#storage-tags-dropdown').hidden,false);assert(get('#storage-tags-options').innerHTML.includes('排骨'));run("selectStorageTag('西餐')");assert(run("activeUploadFile.metadata.storageTags.includes('西餐')"));assert(get('#storage-tags-options').innerHTML.includes('删除标签 西餐'));assert(get('#storage-tags-options').innerHTML.includes('storage-tag-remove'));let storageTagsBefore=Array.from(run('activeUploadFile.metadata.storageTags'));run(`removeStorageTag(${storageTagsBefore.indexOf('西餐')})`);assert(!run("activeUploadFile.metadata.storageTags.includes('西餐')"));run('render()');assert(!run("activeUploadFile.metadata.storageTags.includes('西餐')"));run('openStorageTag()');get('#custom-storage-tag-input').value='自定义可删';run('addStorageTag()');assert(get('#storage-tags-options').innerHTML.includes('删除标签 自定义可删'));let index=run("activeUploadFile.metadata.storageTags.indexOf('自定义可删')");run(`removeStorageTag(${index})`);assert(!run("activeUploadFile.metadata.storageTags.includes('自定义可删')"));
const tagDeleteMark=timers.length;run("addFiles([{name:'顺德鱼生.jpeg',size:700000}])");get('#material-name-0').value='识别过程删除测试';run("confirmMaterialNames();selectStorageTag('顺德鱼生');removeStorageTag(0)");timers.slice(tagDeleteMark).filter(t=>t.ms===1600||t.ms===2200).forEach(t=>t.fn());assert(!run("activeUploadFile.metadata.storageTags.includes('顺德鱼生')"));
console.log('PASS: white bordered tag selector/dropdown, selectable scroll options, delete crosses for automatic/custom tags, deletion survives render and background recognition, custom plus retained.');
assert.equal(run("nextMaterialVersion('V1.0','major')"),'V2.0');assert.equal(run("nextMaterialVersion('V2.0','minor')"),'V2.1');assert.equal(run("nextMaterialVersion('V2.1','patch')"),'V2.1.1');assert.equal(run("nextMaterialVersion('V2.1.1','patch')"),'V2.1.2');assert.equal(run("compareMaterialVersions('V2.10','V2.9')"),1);for(const value of ['V1','V1.0.0.1','V01.0','V2.-1'])assert.equal(run(`parseMaterialVersion(${JSON.stringify(value)})`),null);
ctx.versionDescriptor={bits:Array.from({length:256},(_,i)=>i%3===0?1:0),hist:Array.from({length:24},()=>1/8),aspect:1.5,variance:500};let beforeVersionTest=run('items.length');run("closeModal();pendingUpload=null;items.push({name:'历史菜品照片.jpeg',type:'JPEG',status:'已入库',versionFamily:'test-dish',visualDescriptor:versionDescriptor,metadata:{version:'V1.0'}});files=[{name:'完全不同的文件名.jpeg',type:'JPEG',size:'1 MB',checked:true,duplicatePhase:'passed',visualDescriptor:versionDescriptor,metadata:{...initialFileFields(),kind:'案例',product:'金客满',channel:'官微',desc:'素材'},aiState:{phase:'done',token:1,missing:[]}}];go('upload');refreshMaterialVersion(files[0]);restoreActiveFields()");assert.equal(run('files[0].metadata.version'),'V2.0');assert.equal(run('files[0].versionMatch.name'),'历史菜品照片.jpeg');assert(get('#version-panel').innerHTML.includes('已关联历史素材'));run("changeVersionLevel('minor')");assert.equal(get('#version').value,'V1.1');run("items.push({name:'历史菜品照片-优化.jpeg',type:'JPEG',status:'已入库',versionFamily:'test-dish',visualDescriptor:versionDescriptor,metadata:{version:'V2.1'}});refreshMaterialVersion(files[0]);changeVersionLevel('patch')");assert.equal(get('#version').value,'V2.1.1');get('#version').value='V2.1';run("onUploadFieldEdit({target:{id:'version'}});submitUpload(false)");assert.equal(run('pendingUpload'),null);assert(get('#version-error').textContent.includes('必须高于'));get('#version').value='V2.1.1';run("onUploadFieldEdit({target:{id:'version'}});submitUpload(false)");assert.equal(run('pendingUpload.files[0].metadata.version'),'V2.1.1');run('confirmUploadYes()');assert.equal(run('items[items.length-1].versionFamily'),'test-dish');assert.equal(run('items[items.length-1].metadata.version'),'V2.1.1');assert.equal(run(`items[${beforeVersionTest}].metadata.version`),'V1.0');
run("closeModal();files=[{name:'无关图片.jpeg',type:'JPEG',metadata:initialFileFields(),aiState:{phase:'done',missing:[]}}];refreshMaterialVersion(files[0])");assert.equal(run('files[0].metadata.version'),'V1.0');
run("files=[{name:'批量一.jpeg',type:'JPEG',checked:true,duplicatePhase:'passed',visualDescriptor:versionDescriptor,metadata:{...initialFileFields(),kind:'案例',product:'金客满',channel:'官微'},aiState:{phase:'done',missing:[]}},{name:'批量二.jpeg',type:'JPEG',checked:true,duplicatePhase:'passed',visualDescriptor:versionDescriptor,metadata:{...initialFileFields(),kind:'案例',product:'金客满',channel:'官微'},aiState:{phase:'done',missing:[]}}];go('upload');validateVersionBatch(files)");assert.equal(run('files[0].metadata.version'),'V3.0');assert.equal(run('files[1].metadata.version'),'V4.0');run('makeIndependentVersion()');assert.equal(run('files[0].metadata.version'),'V1.0');assert.equal(run('files[0].versionIndependent'),true);
console.log('PASS: visual-descriptor association regardless of name, numerical version ordering, V1.0→V2.0 / V2.0→V2.1 / V2.1→V2.1.1, format/rollback checks, history preserved, batch unique versions, independent-asset override.');
const previousCreate=ctx.document.createElement;ctx.createImageBitmap=async()=>({width:600,height:400,close(){}});ctx.document.createElement=tag=>tag==='canvas'?{getContext:()=>({drawImage(){},getImageData:()=>({data:Uint8ClampedArray.from({length:1024},(_,i)=>i%4===3?255:Math.floor(i/4)%2?220:30)})})}:previousCreate(tag);ctx.analysisTestFile={sourceBlob:{},type:'JPEG'};run('describeLocalImage(analysisTestFile)').then(()=>{assert.equal(ctx.analysisTestFile.visualDescriptor.bits.length,256);assert.equal(ctx.analysisTestFile.visualDescriptor.hist.length,24);assert.equal(ctx.analysisTestFile.visualDescriptor.aspect,1.5);assert(Math.abs(run('imageSimilarity(analysisTestFile.visualDescriptor,analysisTestFile.visualDescriptor)')-1)<1e-9);console.log('PASS: local image descriptor extraction from pixel data.');});
const shellNode=get('.client-shell');shellNode.style={};shellNode.getBoundingClientRect=()=>({left:55,width:1280});get('.client-sidebar').getBoundingClientRect=()=>({toJSON:()=>({left:55,width:250})});ctx.document.documentElement={clientWidth:1440};ctx.window={innerWidth:1440,innerHeight:900,visualViewport:{width:1280,height:800,offsetLeft:55,offsetTop:10,scale:1.125}};run('fitApplicationViewport()');assert.equal(shellNode.style.left,'55px');assert.equal(shellNode.style.top,'10px');assert.equal(shellNode.style.width,'1280px');assert.equal(shellNode.style.height,'800px');assert.equal(ctx.window.__prototypeLayout.build,'portfolio-viewport-1105');delete ctx.window;const published=fs.readFileSync('src/prototype.js','utf8')+fs.readFileSync('index.html','utf8');assert(published.includes("let page='library'"));assert(published.includes('素材库 · 全部素材'));
console.log('PASS: frame follows visible viewport width, height and offsets; default 全部素材 view preserved. ');
const realSimilarity=run('imageSimilarity');run('imageSimilarity=(a,b)=>b.testScore||0');run("closeModal();files=[];pendingLocalFiles=[];pendingUpload=null;items=[{name:'低于阈值.jpeg',type:'JPEG',status:'已入库',previewUrl:'blob:low',visualDescriptor:{testScore:.59},metadata:{version:'V1.0'}},{name:'恰好60.jpeg',type:'JPEG',status:'已入库',previewUrl:'blob:boundary',visualDescriptor:{testScore:.60},metadata:{version:'V1.0'}},{name:'相似甲.jpeg',type:'JPEG',status:'已入库',previewUrl:'blob:a',visualDescriptor:{testScore:.61},metadata:{version:'V1.0'}},{name:'相似乙.jpeg',type:'JPEG',status:'已入库',previewUrl:'blob:b',visualDescriptor:{testScore:.85},metadata:{version:'V1.0'}}];files=[{name:'当前图片.jpeg',originalName:'当前图片.jpeg',type:'JPEG',size:'1 MB',checked:true,duplicatePhase:'running',visualDescriptor:{bits:[]},metadata:{...initialFileFields(),desc:'保留说明',kind:'案例',product:'金客满',channel:'官微'},aiState:{phase:'done',missing:[]}}];go('upload');finishDuplicateCheck(files[0])");assert.equal(run('files[0].duplicatePhase'),'similar');assert.equal(run('files[0].similarMatches.length'),2);let similarDialog=get('#overlay').innerHTML;assert(similarDialog.includes('库内已存在相似图片'));assert(similarDialog.includes('blob:a'));assert(similarDialog.includes('blob:b'));assert(!similarDialog.includes('恰好60'));assert(!similarDialog.includes('低于阈值'));assert.equal((similarDialog.match(/class="similarity-match-card"/g)||[]).length,2);assert(similarDialog.includes('>确定<'));assert(similarDialog.includes('>取消<'));const similarCount=run('items.length');run('cancelSimilarityWarning()');assert.equal(get('#overlay').innerHTML,'');assert.equal(run('files.length'),1);assert.equal(get('#desc').value,'保留说明');assert.equal(run('items.length'),similarCount);run('submitUpload(false)');assert(get('#overlay').innerHTML.includes('库内已存在相似图片'));run('acceptSimilarityWarning()');assert.equal(run('files[0].similarityAccepted'),true);assert(get('#overlay').innerHTML.includes('是否确定上传'));run('confirmUploadYes()');assert.equal(run('items.length'),similarCount+1);assert(get('#upload-confirm-content').innerHTML.includes('上传成功'));
run("closeModal();files=[];pendingLocalFiles=[{name:'命名中的图片.jpeg',type:'JPEG',visualDescriptor:{bits:[]},metadata:initialFileFields(),aiState:{phase:'done',missing:[]}}]");get('#overlay').innerHTML='填写素材名字';run('finishDuplicateCheck(pendingLocalFiles[0])');assert.equal(get('#overlay').innerHTML,'填写素材名字','similarity check must not overwrite a naming dialog');assert.equal(run('pendingLocalFiles[0].duplicatePhase'),'similar');run("files=pendingLocalFiles;pendingLocalFiles=[];closeModal();go('upload');maybeShowSimilarityWarning()");assert(get('#overlay').innerHTML.includes('库内已存在相似图片'));
ctx.realSimilarity=realSimilarity;run('imageSimilarity=realSimilarity');
console.log('PASS: >60% strict threshold; thumbnail gallery only eligible matches; immediate warning; cancel preserves fields/files; confirm allows normal upload confirmation; naming is not interrupted. Old duplicate rejection removed.');

// Uploads first land in the pending queue; only the existing second-stage
// upload confirmation archives a queued item, without creating a duplicate.
run("closeModal();pendingUpload=null;pendingLocalFiles=[];items=[];files=[{name:'客户机密素材.jpeg',type:'JPEG',size:'1 MB',checked:true,duplicatePhase:'passed',metadata:{...initialFileFields(),desc:'说明',kind:'案例',product:'金客满',channel:'官微'},aiState:{phase:'done',missing:[]}}];go('upload');submitUpload(false);confirmUploadYes();acknowledgeUploadSuccess()");
assert.equal(run('page'),'queue');assert.equal(run('items.length'),1);assert.equal(run('items[0].status'),'待人工审核');assert.equal(run('items[0].name'),'客户机密素材.jpeg');
run('drawQueueRows()');assert(get('#rows').innerHTML.includes('客户机密素材.jpeg'));assert(run('queueContent()').includes('查看待入库素材和上传异常'));assert.equal(run('items.filter(groupMatchesItem).length'),0);
run('setQueueChecked(0,true)');assert.equal(run('queueSelection.size'),1);run('storeQueuedMaterial()');assert.equal(run('page'),'upload');assert.equal(run('files[0].metadata.desc'),'说明');assert.equal(run('files[0].checked'),true);assert.equal(run('files[0].queueSource'),run('items[0]'));
run('submitUpload(false);confirmUploadYes()');assert.equal(run('items.length'),1);assert.equal(run('items[0].status'),'已入库');assert(get('.client-sidebar').innerHTML.includes('<span>待入库</span><span class="cms-nav-count">0</span>'));run('acknowledgeUploadSuccess();drawQueueRows()');assert.equal(run('pendingQueueItems().length'),0);assert.equal(run('queueSelection.size'),0);assert(get('#rows').innerHTML.includes('暂无待入库素材'));
run("items.push({name:'第二份.png',type:'PNG',status:'待人工审核'},{name:'第三份.jpg',type:'JPG',status:'待补充字段'});go('queue');setAllQueueChecked(true)");assert.equal(run('queueSelection.size'),2);run('deleteQueueSelection()');assert.equal(run('items.length'),1);assert.equal(run('items[0].status'),'已入库');assert.equal(run('queueSelection.size'),0);
console.log('PASS: uploads land in pending queue, entered names displayed, per-file metadata retained, checked queue items use existing validation/confirmation and archive without duplicates, deletion preserves archived items.');

// AI tags start on arrival. Duplicate checks wait for the queue action and use archived images only.
const stageTimerMark=timers.length;
run("closeModal();items=[];files=[];pendingLocalFiles=[];queueSelection.clear();go('library');addFiles([{name:'重不过.jpeg',size:700000}],{toQueue:true})");
get('#material-name-0').value='入库终版';
get('#material-path-0').value='根素材组-1 / 子素材组1.2 / 子素材组1.2.1';
get('#related-material-0').value='根素材组-3 / 素材3.1';
run("confirmMaterialNames();addFiles([{name:'家乐素材.jpeg',size:300000}],{toQueue:true})");
get('#material-name-0').value='入库终版';
run('confirmMaterialNames()');
assert(get('#material-name-conflict').innerHTML.includes('名字重复，请重新填写'));
assert.equal(run('items.length'),1);
run('dismissMaterialNameConflict(0)');
get('#material-name-0').value='待入库第二张';
get('#material-path-0').value='根素材组-2';
get('#related-material-0').value='';
run('confirmMaterialNames()');
assert.equal(run('page'),'queue');
assert.equal(run('pendingQueueItems().length'),2);
assert.equal(run('files.length'),0);
assert.equal(run("items.filter(x=>x.status==='已入库').length"),0);
assert(run('clientSidebar()').includes('<span>待入库</span><span class="cms-nav-count">2</span>'));
run("imageSimilarity=(a,b)=>b.testScore;items[0].visualDescriptor={testScore:1};items[1].visualDescriptor={testScore:1};items.push({name:'已有.jpeg',type:'JPEG',status:'已入库',visualDescriptor:{testScore:.86}},{name:'另一张已入库.jpeg',type:'JPEG',status:'已入库',visualDescriptor:{testScore:.72}},{name:'阈值.jpeg',type:'JPEG',status:'已入库',visualDescriptor:{testScore:.60}});setQueueChecked(0,true)");
timers.slice(stageTimerMark).filter(t=>t.ms===350).forEach(t=>t.fn());
assert.equal(run('items[0].aiState.phase'),'running');
assert.equal(run('items[0].duplicatePhase'),'similar');
assert(!get('#rows').innerHTML.includes('发现相似图片'));
assert.equal(get('#overlay').innerHTML,'');
timers.slice(stageTimerMark).filter(t=>t.ms===2200).forEach(t=>t.fn());
run('storeQueuedMaterial(0)');
assert.equal(run('page'),'upload');
assert.equal(get('#overlay').innerHTML,'');
assert(get('#duplicate-0').innerHTML.includes('发现相似图片'));
run('submitUpload(false)');
assert(get('#overlay').innerHTML.includes('是否确定上传'));
run('cancelUploadConfirmation();openDuplicateDetails(0)');
assert(get('#overlay').innerHTML.includes('相似度 86%'));
assert(get('#overlay').innerHTML.includes('相似度 72%'));
assert(!get('#overlay').innerHTML.includes('相似度 100%'));
assert(!get('#overlay').innerHTML.includes('阈值.jpeg'));
run('cancelSimilarityWarning()');
assert.equal(get('#overlay').innerHTML,'');
assert.notEqual(run('files[0].similarityAccepted'),true);
assert.equal(run('files[0].aiState.phase'),'done');
assert.equal(run('items[0].status'),'待人工审核');
assert.equal(run('pendingQueueItems().length'),1);
assert(get('#app').innerHTML.includes('<span>待入库</span><span class="cms-nav-count">1</span>'));
assert.equal(get('#group').value,'根素材组-1 / 子素材组1.2 / 子素材组1.2.1');
assert.equal(get('#group-value').textContent,get('#group').value);
assert(get('#app').innerHTML.includes('id="group-summary"'));
assert(get('#app').innerHTML.includes('data-path="根素材组-1 / 子素材组1.2 / 子素材组1.2.1"'));
assert(!get('#app').innerHTML.includes('data-path="根素材组-1 / 子素材组1.2 / 子素材组1.2.1 / 素材1.2.1.1"'));

run('submitUpload(false);cancelUploadConfirmation()');
assert.equal(run('pendingQueueItems().length'),1);
run('submitUpload(false);confirmUploadYes();acknowledgeUploadSuccess()');
assert.equal(run('items.length'),5);
assert.equal(run('pendingQueueItems().length'),1);
assert.equal(run('items[0].name'),'入库终版.jpeg');
run("go('library')");
assert(get('#rows').innerHTML.includes('入库终版.jpeg'));
assert.equal(run('items[0].metadata.relatedAssetPath'),'根素材组-3 / 素材3.1');
run("openMaterialGroup('根素材组-1 / 子素材组1.2 / 子素材组1.2.1')");
assert(get('#rows').innerHTML.includes('入库终版.jpeg'));
run('imageSimilarity=realSimilarity');
console.log('PASS: similarity and AI tagging run together; viewing and accepting similarity are optional before upload.');

// Similarity warnings include previous pending uploads, not just archived assets,
// while never treating the current pending record as its own match.
run("closeModal();pendingSimilarityPrompt=null;pendingLocalFiles=[];items=[];files=[];imageSimilarity=(a,b)=>b.testScore||0;items=[{name:'待入库相似图片.jpeg',type:'JPEG',status:'待人工审核',previewUrl:'blob:prior-pending',visualDescriptor:{testScore:.81},metadata:{version:'V1.0'}},{name:'刚好60.jpeg',type:'JPEG',status:'待人工审核',visualDescriptor:{testScore:.60},metadata:{version:'V1.0'}}];files=[{name:'新上传.jpeg',type:'JPEG',status:'待人工审核',size:'1 MB',checked:true,duplicatePhase:'running',visualDescriptor:{testScore:1},metadata:{...initialFileFields(),desc:'独立内容',kind:'案例',product:'金客满',channel:'官微'},aiState:{phase:'done',missing:[]}}];files[0].queueSource=files[0];items.push(files[0]);go('upload');finishDuplicateCheck(files[0])");assert.equal(run('files[0].similarMatches.length'),1);assert.equal(run('files[0].similarMatches[0].item.name'),'待入库相似图片.jpeg');assert.equal(run('files[0].duplicatePhase'),'similar');assert(get('#overlay').innerHTML.includes('库内已存在相似图片'));assert(get('#overlay').innerHTML.includes('blob:prior-pending'));assert(get('#overlay').innerHTML.includes('>确定<'));assert(get('#overlay').innerHTML.includes('>取消<'));run('cancelSimilarityWarning();submitUpload(false)');assert.equal(run('pendingUpload'),null);assert(get('#overlay').innerHTML.includes('库内已存在相似图片'));run('acceptSimilarityWarning()');assert.equal(run('files[0].similarityAccepted'),true);assert(get('#overlay').innerHTML.includes('是否确定上传'));run('cancelUploadConfirmation();imageSimilarity=realSimilarity');
console.log('PASS: >60% similarity against pending images opens thumbnail confirmation, excludes self and the 60% boundary, and blocks submission until confirmed.');

// Pending identical images join the same version family, ordered by upload.
// Earlier images must not later upgrade themselves using a newer pending image.
run("closeModal();pendingSimilarityPrompt=null;pendingUpload=null;items=[];files=[];pendingLocalFiles=[];items=[{name:'第一版.jpeg',type:'JPEG',status:'待人工审核',visualDescriptor:versionDescriptor,metadata:{...initialFileFields(),version:'V1.0'},aiState:{phase:'done',missing:[]}}];refreshMaterialVersion(items[0]);items.push({name:'第二版.jpeg',type:'JPEG',status:'待人工审核',visualDescriptor:versionDescriptor,metadata:initialFileFields(),aiState:{phase:'done',missing:[]}});refreshMaterialVersion(items[1])");assert.equal(run('items[0].metadata.version'),'V1.0');assert.equal(run('items[1].metadata.version'),'V2.0');assert.equal(run('items[1].versionBase.name'),'第一版.jpeg');assert.equal(run('items[1].versionFamily'),run('items[0].versionFamily'));run('refreshMaterialVersion(items[0])');assert.equal(run('items[0].metadata.version'),'V1.0');run("items[1].duplicatePhase='passed';go('queue');storeQueuedMaterial(1)");run('paintVersionPanel()');assert(get('#version-panel').innerHTML.includes('第一版.jpeg'));assert(get('#version-panel').innerHTML.includes('V1.0'));assert(!get('#version-panel').innerHTML.includes('未找到'));
run("items.push({name:'第三版.jpeg',type:'JPEG',status:'待人工审核',visualDescriptor:versionDescriptor,metadata:initialFileFields(),aiState:{phase:'done',missing:[]}});refreshMaterialVersion(items[2])");assert.equal(run('items[2].metadata.version'),'V3.0');assert.equal(run('items[2].versionBase.version'),'V2.0');
console.log('PASS: identical pending images associate V1.0→V2.0→V3.0; version panel shows prior image; self and later uploads cannot cause reverse/circular upgrades.');

// Both similarity and version association use all three storage locations.
assert.deepEqual(Array.from(run("parseMaterialVersion('1.1.2')")),[1,1,2]);assert.deepEqual(Array.from(run("parseMaterialVersion('V1.1.2')")),[1,1,2]);
run("closeModal();pendingUpload=null;pendingSimilarityPrompt=null;items=[];files=[];pendingLocalFiles=[];items=[{name:'已入库.jpeg',type:'JPEG',status:'已入库',visualDescriptor:versionDescriptor,metadata:{...initialFileFields(),version:'V1.0'}}];files=[{name:'已上传.jpeg',type:'JPEG',visualDescriptor:versionDescriptor,metadata:initialFileFields(),aiState:{phase:'done',missing:[]}}];refreshMaterialVersion(files[0]);pendingLocalFiles=[{name:'待命名.jpeg',type:'JPEG',visualDescriptor:versionDescriptor,metadata:initialFileFields(),aiState:{phase:'done',missing:[]}}];refreshMaterialVersion(pendingLocalFiles[0])");assert.equal(run('files[0].metadata.version'),'V2.0');assert.equal(run('pendingLocalFiles[0].metadata.version'),'V3.0');assert.equal(run('collectSimilarMatches(pendingLocalFiles[0]).length'),2);assert.equal(run('collectSimilarMatches(files[0]).length'),2);
run("items.push({name:'待入库.jpeg',type:'JPEG',status:'待人工审核',visualDescriptor:versionDescriptor,metadata:{...initialFileFields(),version:'V1.0'}})");assert.equal(run('collectSimilarMatches(pendingLocalFiles[0]).length'),3);run('files[0].queueSource=items[0]');assert.equal(run('similarityCandidatePool().length'),3);run('delete files[0].queueSource');
run("items=[];pendingLocalFiles=[];files=[{name:'手动三段版本.jpeg',type:'JPEG',metadata:{...initialFileFields(),version:'1.1.2'},versionMode:'manual',aiState:{phase:'done',missing:[]}}];activeUploadFile=files[0];validateVersionBatch(files)");assert.equal(run('files[0].metadata.version'),'V1.1.2');
console.log('PASS: versions accept 1.1.2/V1.1.2; similarity and prior-version association cover uploaded, pending and archived images with deduplicated candidates.');

// Batch approval opens the information page for only the selected files.
run("closeModal();pendingUpload=null;items=['甲.jpeg','乙.jpeg','未勾选.jpeg'].map(name=>({name,type:'JPEG',size:'1 MB',status:'待人工审核',duplicatePhase:'passed',metadata:{...initialFileFields(),group:'品牌内容 / 新品发布',desc:'保持描述',kind:'案例',product:'金客满',channel:'官微'},aiState:{phase:'done',missing:[]}}));files=[];pendingLocalFiles=[];queueSelection.clear();go('queue');setQueueChecked(0,true);setQueueChecked(1,true)");
assert(run('queueContent()').includes('onclick="storeQueuedMaterial()">入库所选'));
run('items[1].visualPending=true;storeQueuedMaterial()');
assert.equal(get('#overlay').innerHTML,'');
assert.equal(run('pendingQueueItems().length'),3);
run('items[1].visualPending=false;storeQueuedMaterial()');
assert.equal(run('page'),'upload');
assert.equal(run('files.length'),2);
assert.equal(run('pendingQueueItems().length'),1);
run("go('queue',{cancelApproval:true})");
assert.equal(run('files.length'),0);
assert.equal(run('pendingQueueItems().length'),3);
run('storeQueuedMaterial()');
run('submitUpload(false);confirmUploadYes();acknowledgeUploadSuccess()');
assert.equal(run('pendingQueueItems().length'),1);
assert.equal(run('pendingQueueItems()[0].name'),'未勾选.jpeg');
assert.equal(run('queueSelection.size'),0);
run("go('library')");
assert(get('#rows').innerHTML.includes('甲.jpeg'));
assert(get('#rows').innerHTML.includes('乙.jpeg'));
assert(!get('#rows').innerHTML.includes('未勾选.jpeg'));
console.log('PASS: batch approval opens the information page, cancellation leaves the queue intact, and unselected items stay pending.');

// Adding files from the information page returns to the queue and keeps prior edits.
const draftTimerStart=timers.length;
run("items=[];files=[];queueSelection.clear();go('library');addFiles([{name:'待编辑.jpeg',size:200000}],{toQueue:true})");
get('#material-name-0').value='已编辑';
get('#material-path-0').value='根素材组-10';
run('confirmMaterialNames()');
timers.slice(draftTimerStart).filter(timer=>timer.ms===350).forEach(timer=>timer.fn());
timers.slice(draftTimerStart).filter(timer=>timer.ms===2200).forEach(timer=>timer.fn());
run('setQueueChecked(0,true);storeQueuedMaterial()');
get('#desc').value='保留的素材简介';
run("addFiles([{name:'追加文件.jpeg',size:300000}],{toQueue:true})");
assert.equal(run('page'),'upload');
run('cancelMaterialNames()');
assert.equal(run('pendingQueueItems().length'),0);
assert.equal(get('#desc').value,'保留的素材简介');
run("addFiles([{name:'追加文件.jpeg',size:300000}],{toQueue:true})");
get('#material-name-0').value='追加文件';
get('#material-path-0').value='根素材组-10';
run('confirmMaterialNames()');
assert.equal(run('page'),'queue');
assert.equal(run('pendingQueueItems().length'),1);
assert(run('queueContent()').includes('继续入库（1）'));
run('openQueuedUpload([])');
assert.equal(run('activeUploadFile.name'),'已编辑.jpeg');
assert.equal(get('#desc').value,'保留的素材简介');


// The approved list follows entry order, with a checked batch kept together.
run("items=['先上传.jpeg','先点入库.jpeg','同批末尾.jpeg'].map(name=>({name,type:'JPEG',size:'1 MB',status:'待人工审核',metadata:{...initialFileFields(),kind:'案例',product:'金客满',channel:'官微'},aiState:{phase:'done',missing:[]}}));files=[];queueSelection.clear();go('queue');storeQueuedMaterial(1)");
assert.equal(run('page'),'upload');
assert.equal(run('pendingQueueItems().length'),2);
assert(get('#app').innerHTML.includes('<span>待入库</span><span class="cms-nav-count">2</span>'));
run('submitUpload(false);confirmUploadYes();acknowledgeUploadSuccess();setQueueChecked(0,true);setQueueChecked(2,true);storeQueuedMaterial()');
assert.equal(run('pendingQueueItems().length'),0);
run("submitUpload(false);confirmUploadYes();acknowledgeUploadSuccess();go('library')");
const approvedRows=get('#rows').innerHTML;
assert(approvedRows.includes('先点入库.jpeg')&&approvedRows.includes('先上传.jpeg')&&approvedRows.includes('同批末尾.jpeg'));
assert(approvedRows.indexOf('先点入库.jpeg')<approvedRows.indexOf('先上传.jpeg'));
assert(approvedRows.indexOf('先上传.jpeg')<approvedRows.indexOf('同批末尾.jpeg'));


// Returning via the sidebar keeps each item in progress until it is resumed or cancelled.
run("items=['第一份.jpeg','第二份.jpeg','第三份.jpeg'].map(name=>({name,type:'JPEG',size:'1 MB',status:'待人工审核',metadata:{...initialFileFields(),kind:'案例',product:'金客满',channel:'官微'},aiState:{phase:'done',missing:[]}}));files=[];queueSelection.clear();go('queue')");
for(const [index, remaining] of [[1,2],[0,1],[2,0]]){
  run(`storeQueuedMaterial(${index});go('queue')`);
  assert.equal(run('pendingQueueItems().length'),remaining);
  if(remaining)assert(get('#app').innerHTML.includes(`<span>待入库</span><span class="cms-nav-count">${remaining}</span>`));
  else assert(get('#app').innerHTML.includes('<span>待入库</span><span class="cms-nav-count">0</span>'));
}
assert(get('#rows').innerHTML.includes('暂无待入库素材'));
assert(run('queueContent()').includes('继续入库（3）'));
assert.equal(run("items.filter(file=>file.status==='已入库').length"),0);
run("openQueuedUpload([]);submitUpload(false);confirmUploadYes();acknowledgeUploadSuccess();go('library')");
assert.equal(run("items.filter(file=>file.status==='已入库').length"),3);
const resumedRows=get('#rows').innerHTML;
assert(resumedRows.indexOf('第二份.jpeg')<resumedRows.indexOf('第一份.jpeg'));
assert(resumedRows.indexOf('第一份.jpeg')<resumedRows.indexOf('第三份.jpeg'));

// Identical files in one approval batch match each other without an archived copy.
run("items=['1.jpeg','2.jpeg','未选.jpeg'].map(name=>({name,type:'JPEG',size:'1 MB',status:'待人工审核',visualDescriptor:versionDescriptor,metadata:{...initialFileFields(),kind:'案例',product:'金客满',channel:'官微'},aiState:{phase:'done',missing:[]}}));files=[];queueSelection.clear();go('queue');setQueueChecked(0,true);setQueueChecked(1,true);storeQueuedMaterial()");
assert.equal(run('page'),'upload');
assert.equal(get('#overlay').innerHTML,'');
assert.equal(run('files[0].similarMatches[0].item.name'),'2.jpeg');
assert.equal(run('files[1].similarMatches[0].item.name'),'1.jpeg');
assert.equal(run('files[0].similarMatches.length'),1);
assert.equal(run('files[1].similarMatches.length'),1);
run('openDuplicateDetails(0)');
assert(get('#overlay').innerHTML.includes('相似度 100%'));
assert(!get('#overlay').innerHTML.includes('未选.jpeg'));


// Upload exceptions remain visible in the queue; AI exceptions can be corrected manually.
const exceptionStart=timers.length;
run("closeModal();items=[];files=[];queueSelection.clear();go('library');addFiles([{name:'AI识别失败.jpeg',size:0},{name:'超限.jpeg',size:501*1024*1024}],{toQueue:true})");
assert.equal(run('page'),'queue');
assert(get('#rows').innerHTML.includes('文件为空'));
assert(get('#rows').innerHTML.includes('超过 500 MB'));
assert(get('#app').innerHTML.includes('<span>待入库</span><span class="cms-nav-count">0</span>'));
run('setAllQueueChecked(true);storeQueuedMaterial()');
assert.equal(run('page'),'queue');
run("queueSelection.clear();addFiles([{name:'正常原文件.jpeg',size:100000},{name:'压缩包.zip',size:200000}],{toQueue:true})");
const batchNamingMarkup=get('#overlay').innerHTML;
assert(batchNamingMarkup.includes('批量命名素材')&&batchNamingMarkup.includes('共 2 个文件'));
assert(batchNamingMarkup.includes('正常原文件.jpeg')&&batchNamingMarkup.includes('>.jpeg</span>'));
const batchNameInputs=batchNamingMarkup.match(/<input id="material-name-\d+"[^>]*>/g);
assert.equal(batchNameInputs.length,2);
assert(batchNameInputs[0].includes('value="正常原文件"'));
assert(batchNameInputs[1].includes('value="压缩包"'));
assert(batchNamingMarkup.includes('id="material-path-1"')&&batchNamingMarkup.includes('id="related-material-1"'));
get('#material-name-0').value='AI识别失败';
get('#material-name-1').value='压缩包';
get('#material-path-0').value='根素材组-1';
get('#material-path-1').value='根素材组-1';
run('confirmMaterialNames()');
timers.slice(exceptionStart).filter(timer=>timer.ms===350).forEach(timer=>timer.fn());
timers.slice(exceptionStart).filter(timer=>timer.ms===2200).forEach(timer=>timer.fn());
assert(get('#rows').innerHTML.includes('pending-status-label error">AI 识别失败'));
assert(get('#rows').innerHTML.includes('pending-image-title ai-failed'));
assert(get('#rows').innerHTML.includes('AI 不支持此文件类型'));
assert(get('#app').innerHTML.includes('<span>待入库</span><span class="cms-nav-count">2</span>'));
run('storeQueuedMaterial(2);submitUpload(false)');
assert.equal(run('page'),'upload');
assert(get('#app').innerHTML.includes('upload-file-link active ai-failed'));
assert(get('#upload-ai-status').innerHTML.includes('AI 识别失败'));
assert.equal(run('pendingUpload'),null);
get('#desc').value='手动补充素材简介';
get('#kind').value='案例';
get('#product').value='金客满';
get('#channel').value='官微';
run('submitUpload(false);confirmUploadYes();acknowledgeUploadSuccess()');
assert.equal(run('items[2].status'),'已入库');
assert.equal(run('items[0].status'),'上传失败');
assert(get('#rows').innerHTML.includes('AI 不支持此文件类型'));

assert(get('#rows').innerHTML.includes('重新上传'));
run("addFiles([{name:'替换稿.zip',size:200000}],{toQueue:true,retryItem:items[0]});cancelMaterialNames()");
assert.equal(run('items[0].status'),'上传失败');
run("addFiles([{name:'替换稿.zip',size:200000}],{toQueue:true,retryItem:items[0]})");
get('#material-name-0').value='替换稿';
get('#material-path-0').value='根素材组-1';
run('confirmMaterialNames()');
assert.equal(run('items.filter(item=>item.uploadError).length'),1);
assert.equal(run("items.find(item=>item.name==='替换稿.zip').intakePending"),true);
timers.filter(timer=>timer.ms===350).at(-1).fn();
assert.equal(run("items.find(item=>item.name==='替换稿.zip').aiState.phase"),'manual');

const timeoutStart=timers.length;
run("items=[];files=[];go('queue');stageQueuedUpload([{name:'AI处理超时.jpeg',type:'JPEG'}])");
timers.slice(timeoutStart).find(timer=>timer.ms===350).fn();
assert(get('#rows').innerHTML.includes('AI 识别中'));
timers.slice(timeoutStart).find(timer=>timer.ms===10000).fn();
assert(get('#rows').innerHTML.includes('onclick="showQueueRecognitionTimeout(0)">AI 处理超时'));
run('showQueueRecognitionTimeout(0)');
assert(get('#overlay').innerHTML.includes('重新识别')&&get('#overlay').innerHTML.includes('确定'));
run('closeModal()');
assert.equal(run('items[0].aiState.phase'),'timeout');
run('showQueueRecognitionTimeout(0);retryQueueRecognition(0);finishUploadAI(1,items[0])');
assert.equal(run('items[0].aiState.phase'),'running');
timers.slice(timeoutStart).find(timer=>timer.ms===2200).fn();
assert.equal(run('items[0].aiState.phase'),'done');
assert.equal(run('items.length'),1);

// External submissions and personal intake are counted once and routed independently.
run("closeModal();items=[];files=[];queueSelection.clear();taskMade={name:'外部收集',agency:'测试合作方',group:'根素材组-3',reviewer:currentReviewer};go('agency')");
const agencyTimers=timers.length;
assert(get('#app').innerHTML.includes('id="agency-task-name" value="外部收集" readonly'));
assert(get('#app').innerHTML.includes('id="agency-target-group" value="根素材组-3" readonly'));
assert(get('#app').innerHTML.includes('for="agency-submission-note">备注</label>'));
for(const fieldId of ['desc','kind','product','storage-tags-picker']){
  assert(!get('#app').innerHTML.includes(`id="${fieldId}"`));
}
run("addFiles([{name:'来稿一.jpeg',size:100000},{name:'来稿二.jpeg',size:100000}])");
get('#material-name-0').value='外部退回';
get('#material-name-1').value='外部通过';
run('confirmMaterialNames()');
timers.slice(agencyTimers).filter(timer=>timer.ms===1600).forEach(timer=>timer.fn());
assert.equal(run('files[0].aiState.phase'),'idle');
assert.equal(run('files[0].metadata.desc'),'');
assert.equal(get('#version').value,'');
get('#channel').value='小红书';
run("agencySubmissionNote='第二张替换 <旧封面>';switchUploadFile(1)");
assert(get('#app').innerHTML.includes('第二张替换 &lt;旧封面&gt;'));
get('#channel').value='电商';
get('#version').value='1.2.3';
run('submitUpload(true)');
assert.equal(run('items[0].aiState.phase'),'running');
assert.equal(run('items[0].metadata.desc'),'');
timers.slice(agencyTimers).filter(timer=>timer.ms===2200).forEach(timer=>timer.fn());
assert.equal(run('items[0].aiState.phase'),'done');
assert(run('items[0].metadata.desc.length')>0);
assert(run('items[0].metadata.storageTags.length')>0);
assert.equal(run('items[0].metadata.channel'),'小红书');
assert.equal(run('items[0].metadata.version'),'V1.0');
assert.equal(run('items[1].metadata.channel'),'电商');
assert.equal(run('items[1].metadata.version'),'V1.2.3');
assert.equal(run('items[0].submissionNote'),'第二张替换 <旧封面>');
assert.equal(run('items[1].submissionNote'),'第二张替换 <旧封面>');
assert.equal(run('agencySubmissionNote'),'');
assert.equal(run('submitted'),true);
assert.equal(run('items.filter(canReview).length'),2);
assert.equal(run('pendingQueueItems().length'),0);
assert(get('#app').innerHTML.includes('外部退回.jpeg'));
run("items.push({...items[0],name:'他人待审.jpeg',reviewer:'其他员工',by:'其他上传者'},{name:'本人待入库.jpeg',type:'JPEG',status:'待人工审核',by:'林晓'},{name:'同事待入库.jpeg',type:'JPEG',status:'待人工审核',by:'其他员工'});go('queue')");
assert.equal(run('pendingQueueItems().length'),1);
assert(get('#app').innerHTML.includes('<span>待入库</span><span class="cms-nav-count">1</span>'));
assert(get('#app').innerHTML.includes('<span>收素材</span><span class="cms-nav-count">2</span>'));
assert(get('#app').innerHTML.includes('展开或收起待审核'));
assert(!get('#rows').innerHTML.includes('外部退回.jpeg'));
run("collectionNavigationExpanded=true;go('review')");
assert(get('#app').innerHTML.includes('<span>待审核</span><span class="cms-nav-count">2</span>'));
assert(get('#rows').innerHTML.includes('根素材组-3'));
assert(!get('#rows').innerHTML.includes('他人待审.jpeg'));
run('openExternalReview(2)');
assert.equal(run('page'),'review');
run('openExternalReview(0)');
assert.equal(run('page'),'upload');
assert(get('#app').innerHTML.includes('class="upload-shell"'));
assert(get('#app').innerHTML.includes('第二张替换 &lt;旧封面&gt;'));
get('#desc').value='不会保存的草稿';
run("go('review');openExternalReview(0)");
assert.notEqual(get('#desc').value,'不会保存的草稿');
assert(get('#app').innerHTML.includes('onclick="openReviewReturn()"'));
run('openReviewReturn()');
assert(get('#overlay').innerHTML.includes('for="review-return-reason">退回原因'));
run('closeModal()');
assert.equal(run('items[0].status'),'待人工审核');
run('openReviewReturn()');
get('#review-return-reason').value=' ';
run("reviewAction(false,'review-return-reason')");
assert.equal(run('items[0].status'),'待人工审核');
assert(get('#overlay').innerHTML.includes('确认退回'));
get('#review-return-reason').value='请修改封面文案';
run("reviewAction(false,'review-return-reason')");
assert.equal(run('page'),'review');
assert.equal(run('items[0].reviewHistory[0].reason'),'请修改封面文案');
assert(get('#app').innerHTML.includes('<span>收素材</span><span class="cms-nav-count">1</span>'));
run('openExternalReview(1)');
get('#desc').value='审核人修订后的简介';
run('reviewAction(true)');
assert.equal(run('items[1].metadata.desc'),'审核人修订后的简介');
assert.equal(run('page'),'queue');
assert(get('#app').innerHTML.includes('展开或收起待审核'));
assert(get('#app').innerHTML.includes('<span>待审核</span><span class="cms-nav-count">0</span>'));
assert(get('#app').innerHTML.includes('<span>收素材</span><span class="cms-nav-count">0</span>'));
assert(get('#app').innerHTML.includes('<span>待入库</span><span class="cms-nav-count">1</span>'));
run("openMaterialGroup('根素材组-3')");
assert(get('#rows').innerHTML.includes('外部通过.jpeg'));
assert(!get('#rows').innerHTML.includes('外部退回.jpeg'));
run('previewAgency()');
assert(get('#app').innerHTML.includes('请修改封面文案'));
assert(!get('#app').innerHTML.includes('他人待审.jpeg'));
console.log('PASS: scoped external review, combined counts, return reason, and archive routing.');


// Collection status is based on this task's submissions and expiry.
run("items=[];taskMade={name:'状态演示'};go('tasks')");
assert(get('#app').innerHTML.includes('>收集中</span>'));
run("items.push({name:'状态测试.jpeg',type:'JPEG',externalSubmission:true,collectionTask:taskMade,status:'待人工审核'});render()");
assert(get('#app').innerHTML.includes('>收集中</span>'));
run("items[0].status='已退回';render()");
assert(get('#app').innerHTML.includes('>收集中</span>'));
run("taskMade.expiresAt=Date.now()-1;render()");
assert(get('#app').innerHTML.includes('class="tag bad">收集失败'));
run("items.push({name:'状态测试.jpeg',type:'JPEG',externalSubmission:true,collectionTask:taskMade,status:'已入库'});render()");
assert(get('#app').innerHTML.includes('>收集成功</span>'));
run("items=[];taskMade.expiresAt=Date.now()-1;render()");
assert(get('#app').innerHTML.includes('class="tag bad">收集失败'));

// Tag filtering stays inside the current library or material group.
run("items=[{name:'海报甲.jpeg',type:'JPEG',previewUrl:'blob:poster-preview',status:'已入库',metadata:{group:'测试组',kind:'菜式应用',product:'金客满、辣鲜露、双蚝蚝油',storageTags:['顺德鱼生','排骨','法棍','西餐','中餐']}},{name:'海报乙.jpeg',type:'JPEG',status:'已入库',metadata:{group:'测试组',storageTags:['海鲜']}},{name:'其他组海报.jpeg',type:'JPEG',status:'已入库',metadata:{group:'其他组',storageTags:['顺德鱼生']}}];openMaterialGroup('测试组')");
assert(get('#rows').innerHTML.includes('aria-label="展开其余 1 个产品标签"'));
assert(get('#rows').innerHTML.includes('aria-label="展开其余 1 个内容标签"'));
assert(get('#rows').innerHTML.includes('素材类型：菜式应用'));
assert(get('#rows').innerHTML.includes('onclick="showAssetImage(0)"'));
run('showAssetImage(0)');
assert(get('#overlay').innerHTML.includes('class="pending-full-image" src="blob:poster-preview"'));
assert.equal(run('page'),'group');
run('closeModal()');
run("setStoredTagFilter('顺德鱼生')");
assert(get('#rows').innerHTML.includes('海报甲.jpeg'));
assert(!get('#rows').innerHTML.includes('海报乙.jpeg'));
assert(!get('#rows').innerHTML.includes('其他组海报.jpeg'));
assert.equal(get('#stored-list-count').textContent,'（1）');
assert(get('#stored-tag-filter').innerHTML.includes('清除筛选'));
run("setStoredTagFilter('')");
assert(get('#rows').innerHTML.includes('海报乙.jpeg'));

run('openStoredAsset(0)');
assert(get('#app').innerHTML.includes('onclick="showStoredAssetVersions()"'));
assert(!get('#app').innerHTML.includes('class="stored-detail-history"'));
run('showStoredAssetVersions()');
assert(get('#overlay').innerHTML.includes('版本历史记录 · 共 1 版'));
assert(get('#overlay').innerHTML.includes('class="stored-detail-history"'));
assert(get('#overlay').innerHTML.includes('当前查看'));
run('closeModal()');

// Detail preview opens the full image without navigating or increasing views.
assert(!get('#app').innerHTML.includes('stored-detail-preview-overlay'));
assert(get('#app').innerHTML.includes('aria-label="查看 海报甲.jpeg 大图" onclick="showAssetImage(0)"'));
const detailViews=run('items[0].viewCount');
run('showAssetImage(0)');
assert(get('#overlay').innerHTML.includes('class="pending-full-image" src="blob:poster-preview"'));
assert.equal(run('page'),'detail');
assert.equal(run('items[0].viewCount'),detailViews);
run('closeModal()');

// The detail title controls operate on the currently viewed asset.
for(const label of ['下载素材','分享','编辑素材','删除','评论']){
  assert(get('#app').innerHTML.includes(`title="${label}" aria-label="${label}"`));
}
const createBeforeStoredDownload=ctx.document.createElement;
const storedDownloadLink={click(){this.clicked=true},remove(){}};
ctx.document.createElement=tag=>tag==='a'?storedDownloadLink:createBeforeStoredDownload(tag);
run('toggleStoredDownloadOptions()');
assert(get('#app').innerHTML.includes('下载指定尺寸或大小'));
run('downloadCurrentStoredAsset()');
ctx.document.createElement=createBeforeStoredDownload;
assert.equal(storedDownloadLink.href,'blob:poster-preview');
assert.equal(storedDownloadLink.download,'海报甲.jpeg');
assert(storedDownloadLink.clicked);
assert.equal(run('items[0].downloadCount'),1);
run('showStoredShare()');
assert(get('#overlay').innerHTML.includes('创建链接'));
get('#stored-share-link').value='';
get('#stored-share-expiry').value='7';
run('createOrCopyStoredShare()');
assert(get('#stored-share-link').value.endsWith('#asset=1'));
run("closeModal();go('library');location.hash='#asset=1';openStoredShareLink();location.hash=''");
assert.equal(run('page'),'detail');
assert.equal(run('selected'),0);
run('showStoredEdit();removeStorageTag(0);cancelStoredEdit()');
assert.equal(run('items[0].metadata.storageTags[0]'),'顺德鱼生');
run('showStoredEdit()');
assert(get('#app').innerHTML.includes('id="stored-edit-name"'));
assert(get('#app').innerHTML.includes('id="storage-tags-picker"'));
assert(get('#storage-tags-list').innerHTML.includes('顺德鱼生'));
get('#channel').value='官微';
get('#stored-edit-name').value='改名海报.jpeg';
get('#stored-edit-desc').value='更新后的简介';
run('removeStorageTag(4);removeStorageTag(2);removeStorageTag(0);openStorageTag()');
get('#custom-storage-tag-input').value='新菜谱';
run('addStorageTag()');
assert.equal(run('items[0].metadata.storageTags.length'),5);
run('saveStoredEdit()');
assert.equal(run('items[0].name'),'改名海报.jpeg');
assert.equal(run('items[0].metadata.desc'),'更新后的简介');
assert.equal(run('items[0].metadata.storageTags.join("、")'),'排骨、西餐、新菜谱');
assert(!get('#app').innerHTML.includes('id="stored-edit-name"'));
run('showStoredComments()');
assert(get('#overlay').innerHTML.includes('评论（6）'));
assert(get('#overlay').innerHTML.includes('aria-label="过往评论"'));
get('#stored-comment').value='封面可以用';
run('sendStoredComment()');
assert(get('#overlay').innerHTML.includes('评论（7）'));
assert.equal(run('items[0].comments[0].text'),'封面可以用');
run('closeModal();showStoredDelete();closeModal()');
assert(run("items.some(item=>item.name==='改名海报.jpeg')"));
run('showStoredDelete();deleteCurrentStoredAsset()');
assert(!run("items.some(item=>item.name==='改名海报.jpeg')"));
assert.equal(run('page'),'library');
run("go('trash')");
assert(get('#app').innerHTML.includes('改名海报.jpeg'));
run("go('library')");

// Related rows only link to other archived images and prefer shared metadata.
run("items=[{name:'当前.jpeg',type:'JPEG',status:'已入库',metadata:{kind:'菜式应用',product:'辣鲜露',storageTags:['排骨']}},{name:'同类.jpeg',type:'JPEG',status:'已入库',metadata:{kind:'菜式应用'}},{name:'推荐.jpeg',type:'JPEG',status:'已入库',metadata:{kind:'案例',product:'辣鲜露'}},{name:'非图片.pdf',type:'PDF',status:'已入库',metadata:{kind:'菜式应用'}},{name:'未入库.jpeg',type:'JPEG',status:'待人工审核',metadata:{kind:'菜式应用'}}];openStoredAsset(0)");
const recommendations=get('#app').innerHTML.split('<h2>同类型图片</h2>')[1];
assert(recommendations);
const [sameTypeMarkup,guessMarkup]=recommendations.split('<h2>猜你喜欢</h2>');
assert(sameTypeMarkup.includes('同类.jpeg'));
assert(guessMarkup.includes('推荐.jpeg'));
assert(!guessMarkup.includes('同类.jpeg'));
assert(!recommendations.includes('未入库.jpeg')&&!recommendations.includes('非图片.pdf'));
assert(!get('#app').innerHTML.includes('素材使用数据'));

// Card selection controls and the basket are independent of image preview.
run("items=[{name:'素材甲.jpeg',type:'JPEG',status:'已入库',previewUrl:'blob:batch-preview',metadata:{group:'原素材组',kind:'案例'}},{name:'素材乙.png',type:'PNG',status:'已入库',metadata:{group:'原素材组'}}];go('library')");
assert(get('#rows').innerHTML.includes('stored-card-select'));
assert(get('#rows').innerHTML.includes('stored-card-basket'));
assert.equal(get('#stored-batch-host').innerHTML,'');
run('toggleStoredBasket(0)');
assert.equal(run('storedAssetBasket.size'),1);
assert.equal(get('#stored-batch-host').innerHTML,'');
run('toggleStoredSelection(0);toggleStoredSelection(1)');
assert(get('#stored-batch-host').innerHTML.includes('已选 2 项'));
assert(get('#stored-batch-host').innerHTML.includes('申请素材详情权限'));
run('addStoredBatchToBasket();showStoredBasket()');
assert.equal(run('storedAssetBasket.size'),2);
assert(get('#overlay').innerHTML.includes('素材乙.png'));
run('closeModal();renameStoredBatch()');
get('#stored-batch-name').value='批量图';
run('saveStoredBatchNames()');
assert.equal(run('items[1].name'),'批量图-2.png');
run('addStoredBatchToGroup()');
get('#group').value='根素材组-2';
run('saveStoredBatchGroup(false)');
assert.equal(run('items[0].metadata.group'),'原素材组');
assert.equal(run('items[0].additionalGroups[0]'),'根素材组-2');
run('clearStoredSelection();openMaterialGroup("根素材组-2")');
assert(get('#rows').innerHTML.includes('批量图-2.png'));
assert.equal(get('#stored-batch-host').innerHTML,'');

// Demo recommendations occupy the search placeholder and leave entered queries alone.
const searchInput=get('#client-search-query');
const searchRecommendation=get('#recommended-search');
searchInput.matches=()=>false;
assert.equal(run('recommendedSearchTerms.length'),5);
assert(run('searchBar()').includes('辣鲜露+蒸鱼豉油'));
run('rotateSearchRecommendation()');
assert(searchRecommendation.innerHTML.includes('菜谱'));
searchInput.matches=()=>true;
run('rotateSearchRecommendation()');
assert(searchRecommendation.innerHTML.includes('菜谱'));
searchInput.matches=()=>false;
searchInput.value='批量图-2';
run("updateSearchQuery($('#client-search-query'));rotateSearchRecommendation()");
assert.equal(run('query'),'批量图-2');
assert(get('#rows').innerHTML.includes('批量图-2.png'));
assert(searchRecommendation.innerHTML.includes('菜谱'));
searchInput.value='';
run("updateSearchQuery($('#client-search-query'));rotateSearchRecommendation()");
assert(searchRecommendation.innerHTML.includes('产品海报'));
console.log('PASS: preset recommendations roll in the search placeholder and pause while focused or filled.');

// The search panel starts closed and choosing a ranked term applies the current view's filter.
const popularPanel=get('#popular-search-panel');
assert(run('searchBar()').includes('aria-labelledby="popular-search-title" hidden'));
assert.equal(run('popularSearchTerms.length'),5);
run('showPopularSearch(true)');
assert.equal(popularPanel.hidden,false);
run("items[1].name='清蒸鲈鱼.jpeg';searchPopularTerm('清蒸鲈鱼')");
assert.equal(run('query'),'清蒸鲈鱼');
assert(get('#rows').innerHTML.includes('清蒸鲈鱼.jpeg'));
assert.equal(popularPanel.hidden,true);
run("showPopularSearch(true);closePopularSearchWithEscape({key:'Escape'})");
assert.equal(popularPanel.hidden,true);
