'use strict';
// Penjaga integritas repo. Tanpa dependensi. Tidak mengubah data apa pun.
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const gsFiles=fs.readdirSync(path.join(root,'apps-script')).filter(f=>f.endsWith('.gs')).sort();

test('semua file Apps Script dapat dikompilasi (sintaks valid)',()=>{
  assert.ok(gsFiles.length>0);
  for(const f of gsFiles){
    assert.doesNotThrow(()=>new vm.Script(read('apps-script/'+f),{filename:f}),f);
  }
});

test('tidak ada nama fungsi global ganda lintas file Apps Script',()=>{
  // Di Apps Script semua .gs berbagi satu namespace global: duplikat menimpa diam-diam.
  const seen=new Map(),dups=[];
  for(const f of gsFiles){
    const src=read('apps-script/'+f);
    for(const m of src.matchAll(/^function\s+([A-Za-z_$][\w$]*)\s*\(/gm)){
      if(seen.has(m[1]))dups.push(m[1]+' ('+seen.get(m[1])+' & '+f+')');
      else seen.set(m[1],f);
    }
  }
  assert.deepEqual(dups,[]);
});

test('semua aset lokal yang dirujuk HTML benar-benar ada',()=>{
  const pages=['index.html','404.html'].concat(
    fs.readdirSync(path.join(root,'staging')).filter(f=>f.endsWith('.html')).map(f=>'staging/'+f));
  const missing=[];
  for(const page of pages){
    const dir=path.dirname(path.join(root,page));
    for(const m of read(page).matchAll(/\b(?:href|src)="([^"]+)"/g)){
      let ref=m[1].split('#')[0].split('?')[0];
      if(!ref||/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(ref))continue;
      if(!fs.existsSync(path.resolve(dir,ref)))missing.push(page+' -> '+m[1]);
    }
  }
  assert.deepEqual(missing,[]);
});

test('adaptor checkout Mayar/Scalev yang dibatalkan tidak dimuat oleh halaman mana pun',()=>{
  const pages=['index.html'].concat(
    fs.readdirSync(path.join(root,'staging')).filter(f=>f.endsWith('.html')).map(f=>'staging/'+f));
  for(const page of pages){
    const scripts=[...read(page).matchAll(/<script\b[^>]*\bsrc="([^"]+)"/gi)].map(m=>m[1]);
    for(const s of scripts)assert.doesNotMatch(s,/scalev|mayar/i,page+' memuat '+s);
  }
});

test('tidak ada rahasia atau kredensial tertanam di sumber yang dipublikasikan',()=>{
  const patterns=[
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
    /\bsk-[A-Za-z0-9_-]{20,}/,
    /\bghp_[A-Za-z0-9]{30,}/,
    /\bgithub_pat_[A-Za-z0-9_]{30,}/,
    /\bxox[abprs]-[A-Za-z0-9-]{10,}/,
    /\bAIza[0-9A-Za-z_-]{35}\b/,
    /\bBearer\s+[A-Za-z0-9._-]{30,}/
  ];
  const targets=['index.html','config.js','staging/config.js','staging/member-config.js']
    .concat(fs.readdirSync(path.join(root,'js')).map(f=>'js/'+f))
    .concat(gsFiles.map(f=>'apps-script/'+f));
  for(const t of targets){
    const src=read(t);
    for(const p of patterns)assert.doesNotMatch(src,p,t+' cocok pola rahasia '+p);
  }
});

test('konfigurasi publik konsisten dan tidak memuat rahasia',()=>{
  const sandbox={window:{}};
  vm.runInNewContext(read('config.js'),sandbox);
  const c=sandbox.window.NGD_CONFIG;
  assert.ok(c&&Object.isFrozen(c),'NGD_CONFIG harus ada dan dibekukan');
  for(const k of Object.keys(c))
    assert.doesNotMatch(k,/secret|token|apikey|api_key|pin|password|pepper/i,'kunci config mencurigakan: '+k);
  // Pembayaran tidak boleh aktif bila penulisan data member nonaktif.
  if(c.paymentsEnabled===true)assert.equal(c.memberWritesEnabled,true,
    'paymentsEnabled=true mensyaratkan memberWritesEnabled=true');
  // Gambar QRIS tidak boleh dianggap disetujui sebelum pembayaran dibuka.
  if(c.qrisOwnerImageApproved===true)assert.equal(c.paymentsEnabled,true,
    'qrisOwnerImageApproved=true hanya bermakna jika pembayaran dibuka');
  assert.match(c.apiUrl,/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/);
});

test('endpoint STAGING berbeda dari endpoint produksi',()=>{
  const a={window:{}},b={window:{}};
  vm.runInNewContext(read('config.js'),a);
  vm.runInNewContext(read('staging/config.js'),b);
  assert.notEqual(a.window.NGD_CONFIG.apiUrl,b.window.NGD_STAGING_CONFIG.apiUrl,
    'STAGING dan produksi tidak boleh memakai deployment yang sama');
});

test('berkas hygiene repo tersedia dan benar',()=>{
  const pkg=JSON.parse(read('package.json'));
  assert.equal(pkg.private,true);
  assert.equal(pkg.scripts.test,'node --test tests/*.test.cjs');
  assert.ok(!pkg.dependencies&&!pkg.devDependencies,'repo ini sengaja tanpa dependensi');
  assert.ok(fs.existsSync(path.join(root,'.nojekyll')));
  const robots=read('robots.txt');
  for(const d of ['/staging/','/apps-script/','/docs/','/tests/','/contracts/'])
    assert.ok(robots.includes('Disallow: '+d),'robots.txt harus melarang '+d);
  const ignore=read('.gitignore');
  assert.match(ignore,/^\.env$/m);
  assert.match(ignore,/^node_modules\/$/m);
});

test('README publik menjelaskan manfaat produk tanpa membocorkan kontrol internal',()=>{
  const readme=read('README.md');
  assert.match(readme,/Ngulik Digital/);
  assert.match(readme,/Linggau AI Studio/);
  assert.match(readme,/github\.io\/ngulik-digital-member\//);
  // Public presentation is not an operational runbook.
  assert.doesNotMatch(readme,/NO-GO|STAGING|\bproduction\b|DATABASE|\b29 tab\b|\b16 tab\b/i);
  assert.doesNotMatch(readme,/NGD_[A-Z_]+|(?:apps-script|contracts|PROJECT_CONTROL|AGENTS|docs\/)/);
  assert.doesNotMatch(readme,/Mayar|Scalev|DANA Bisnis|\b(?:PENDING|PAID|EXPIRED)\b/);
  assert.doesNotMatch(readme,/script\.google\.com|docs\.google\.com|spreadsheets\/d\//);
});
test('seluruh GitHub Actions terikat SHA 40 karakter, bukan tag bergerak',()=>{
  const dir=path.join(root,'.github/workflows');
  const workflows=fs.readdirSync(dir).filter(f=>/\.ya?ml$/.test(f));
  assert.ok(workflows.length>=4);
  let totalUses=0;
  for(const name of workflows){
    const text=read('.github/workflows/'+name);
    // Langkah bisa berbentuk "- uses:" ATAU "uses:" di bawah "- name:". Pola lama hanya
    // mengenali bentuk pertama sehingga 0 pencocokan dan tes tidak memeriksa apa pun.
    const uses=[...text.matchAll(/^\s*(?:-\s*)?uses:\s*([^\s#]+)/gm)].map(m=>m[1]);
    totalUses+=uses.length;
    for(const ref of uses){
      assert.match(ref,/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.\/-]+@[0-9a-f]{40}$/,name+' menggunakan action tanpa SHA: '+ref);
    }
    assert.match(text,/^permissions:\s*\n\s+contents:\s*read\s*$/m,name+' harus read-only');
    assert.match(text,/^concurrency:\s*$/m,name+' perlu concurrency');
    assert.match(text,/^\s+timeout-minutes:\s*\d+/m,name+' perlu timeout');
  }
  assert.ok(totalUses>=8,'tes harus benar-benar menemukan langkah "uses:" (ditemukan '+totalUses+')');
});
test('aturan review dan kanal pelaporan privat disiapkan',()=>{
  assert.match(read('.github/CODEOWNERS'),/@cuan74468-ux/);
  assert.match(read('.github/pull_request_template.md'),/Belum terbukti/);
  assert.match(read('SECURITY.md'),/privat/);
  const codeql=read('.github/workflows/codeql.yml');
  assert.match(codeql,/schedule:/);
  assert.match(codeql,/pull_request:/);
  assert.match(codeql,/upload:\s*false/);
  assert.doesNotMatch(codeql,/security-events:\s*write/);
});

test('GAS read-only health exposes a manual source revision for drift detection',()=>{
  const gas=read('apps-script/Code.gs');
  const marker=gas.match(/SOURCE_REVISION:\s*'([a-z0-9-]{12,80})'/);
  assert.ok(marker,'Code.gs must contain a non-secret source revision');
  assert.match(gas,/source_revision:NGD\.SOURCE_REVISION/);
  const workflow=read('.github/workflows/verify-source-drift.yml');
  assert.match(workflow,/workflow_dispatch:/);
  assert.match(workflow,/contents:\s*read/);
  assert.match(workflow,/method:'GET'/);
  assert.match(workflow,/actual!==expected\[1\]/);
  assert.doesNotMatch(workflow,/security-events:\s*write|method:'POST'/);
});

test('CodeQL menghasilkan bukti nyata: SARIF disimpan dan job gagal bila ada temuan',()=>{
  const wf=read('.github/workflows/codeql.yml');
  assert.match(wf,/upload:\s*false/);
  assert.doesNotMatch(wf,/security-events:\s*write/);
  assert.match(wf,/actions\/upload-artifact@[0-9a-f]{40}/);
  assert.match(wf,/if-no-files-found:\s*error/);
  assert.match(wf,/output:\s*\$\{\{\s*runner\.temp\s*\}\}\/codeql-sarif/);
  assert.match(wf,/process\.exitCode=1/);
});

test('skrip pemeriksa SARIF di workflow CodeQL berperilaku benar (uji perilaku)',()=>{
  const { spawnSync }=require('node:child_process');
  const os=require('node:os');
  const wf=read('.github/workflows/codeql.yml');
  const m=wf.match(/node <<'NODE'\n([\s\S]*?)\n\s*NODE\n?/);
  assert.ok(m,'skrip pemeriksa tidak ditemukan');
  const script=m[1].split('\n').map(l=>l.replace(/^ {10}/,'')).join('\n');
  const run=(files)=>{
    const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sarif-'));
    for(const [name,body] of Object.entries(files))fs.writeFileSync(path.join(dir,name),JSON.stringify(body));
    const r=spawnSync(process.execPath,['-e',script],{env:{...process.env,SARIF_DIR:dir},encoding:'utf8'});
    return r;
  };
  const withResult=(level,ruleDefault)=>({runs:[{tool:{driver:{rules:[{id:'js/x',defaultConfiguration:{level:ruleDefault}}]}},
    results:[{ruleId:'js/x',...(level?{level}:{}),locations:[{physicalLocation:{artifactLocation:{uri:'js/app.js'},region:{startLine:7}}}]}]}]});
  assert.equal(run({'javascript.sarif':{runs:[{results:[]}]}}).status,0,'tanpa temuan harus lolos');
  assert.equal(run({'javascript.sarif':withResult('warning')}).status,1,'warning harus gagal');
  assert.equal(run({'javascript.sarif':withResult('error')}).status,1,'error harus gagal');
  assert.equal(run({'javascript.sarif':withResult(null,'error')}).status,1,'level dari aturan harus dipakai');
  assert.equal(run({'javascript.sarif':withResult('note')}).status,0,'note saja tidak menggagalkan');
  assert.notEqual(run({}).status,0,'tanpa SARIF harus gagal, bukan lolos diam-diam');
  const bad=run({'javascript.sarif':withResult('warning')});
  assert.match(bad.stderr,/CODEQL_FINDING warning js\/x js\/app\.js:7/);
});

test('PROJECT_CONTROL.md: tabel log utuh dan heading tidak menyatu dengan baris tabel',()=>{
  const lines=read('PROJECT_CONTROL.md').split('\n');
  for(const [i,l] of lines.entries()){
    assert.ok(!l.includes('\\n\\n'),'baris '+(i+1)+' memuat teks backslash-n literal');
    if(/^\| 2026-/.test(l))assert.match(l,/\|\s*$/,'baris log '+(i+1)+' harus diakhiri |');
    if(l.includes('## Checkpoint penutupan hari'))assert.match(l,/^## /,'heading menyatu dengan baris lain');
  }
  assert.ok(lines.some(l=>/^## Checkpoint penutupan hari/.test(l)),'heading Checkpoint hilang');
  assert.ok(lines.some(l=>/^## Pengembangan, tes, dan peta dokumen/.test(l)));
});
