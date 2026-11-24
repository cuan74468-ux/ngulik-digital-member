'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const stage=read('staging/member.html'),pub=read('index.html'),app=read('js/app.js');
test('STAGING and public load guest landing, service, and help stylesheets in the same order',()=>{
  for(const [html,base] of [[stage,'../'],[pub,'./']]){
    for(const file of ['landing-guest-v1.css','guest-sales-trust-v1.css']){
      assert.match(html,new RegExp('href="'+base.replace('.','\\.')+'assets/'+file.replace('.','\\.')+'\\?v='));
      assert.ok(fs.existsSync(path.join(__dirname,'../assets',file)),file);
    }
    assert.ok(html.indexOf('landing-guest-v1.css')>html.indexOf('mobile-critical-v16.css'));
    assert.ok(html.indexOf('guest-sales-trust-v1.css')>html.indexOf('landing-guest-v1.css'));
    assert.match(html,/app\.js\?v=20261122-private-gates-v5/);
  }
});
test('guest landing and services use the correct media base for each route',()=>{
  const start=app.indexOf('const guestMediaBase_=');
  const end=app.indexOf(';',start);
  assert.ok(start>=0&&end>start);
  const factory=new Function('location',app.slice(start,end+1)+'return guestMediaBase_;');
  assert.equal(factory({pathname:'/ngulik-digital-member/staging/member.html'})(),'../assets/media/');
  assert.equal(factory({pathname:'/ngulik-digital-member/'})(),'./assets/media/');
  for(const html of [stage,pub])assert.match(html,/js\/public-cms-home\.js/);
  assert.match(app,/guestMediaBase_\(\)\+'ngd-v8-video.webp"/);
  assert.match(app,/guestMediaBase_\(\)\+x\[2\]/);
  assert.doesNotMatch(app,/src="\.\/assets\/media/);
  for(const name of ['ngd-v8-ai-large.webp','ngd-v6-pos.webp','ngd-v6-video.webp',
    'ngd-v6-bundle.webp','ngd-v8-video.webp'])
    assert.ok(fs.existsSync(path.join(__dirname,'../assets/media',name)),name);
});
