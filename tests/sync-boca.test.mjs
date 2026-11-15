import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {sync} from '../scripts/sync-boca.mjs';
const now=new Date('2026-11-15T13:00:00Z');
const fixture={fixture:{id:1,date:'2026-11-20T22:00:00Z',status:{short:'NS'},venue:{name:'Test'}},league:{id:10,name:'Test',season:2026,round:'Final'},teams:{home:{id:451,name:'Boca'},away:{id:2,name:'Rival'}},goals:{home:null,away:null}};
const response=rows=>({ok:true,json:async()=>({errors:[],response:rows,paging:{total:1}})});
async function temp(fn){const dir=await mkdtemp(join(tmpdir(),'boca-test-'));try{await fn(dir);}finally{await rm(dir,{recursive:true,force:true});}}
test('plan restricted preserves history and hides secret',()=>temp(async dir=>{await writeFile(dir+'/boca.json','{"old":true}');await assert.rejects(sync({key:'secret-test',dir,now,request:async()=>({ok:true,json:async()=>({errors:{plan:'secret-test'},response:[]})})}),{code:'PLAN_RESTRICTED'});assert.equal(await readFile(dir+'/boca.json','utf8'),'{"old":true}');assert.ok(!(await readFile(dir+'/sync-status.json','utf8')).includes('secret-test'));}));
test('fetches next fixtures without season and preserves past',()=>temp(async dir=>{
 const old={fixtures:[{id:99,date:'2026-11-01T22:00:00Z',leagueId:10,season:2026,cup:'Test'}],competitions:[{id:10,season:2026,name:'Test',tables:[]}]};
 await writeFile(dir+'/boca.json',JSON.stringify(old));
 const urls=[];
 const d=await sync({key:'test',dir,now,request:async url=>{urls.push(url);return response([fixture]);}});
 assert.equal(urls.length,1);assert.match(urls[0],/fixtures\\?team=451&next=20/);assert.ok(!urls[0].includes('season='));
 assert.deepEqual(d.fixtures.map(f=>f.id),[99,1]);assert.equal(d.competitions.length,1);
}));
test('refreshes existing fixture without duplicating it',()=>temp(async dir=>{
 await writeFile(dir+'/boca.json',JSON.stringify({fixtures:[{id:1,date:'2026-11-19T22:00:00Z',venue:'Old'}],competitions:[]}));
 const d=await sync({key:'test',dir,now,request:async()=>response([fixture])});
 assert.equal(d.fixtures.length,1);assert.equal(d.fixtures[0].venue,'Test');
}));
test('empty response preserves previous snapshot',()=>temp(async dir=>{
 await writeFile(dir+'/boca.json','{"old":true}');
 await assert.rejects(sync({key:'test',dir,now,request:async()=>response([])}),{code:'EMPTY_RESPONSE'});
 assert.equal(await readFile(dir+'/boca.json','utf8'),'{"old":true}');
}));
test('does not call API without secret',()=>temp(async dir=>{
 await assert.rejects(sync({key:'',dir,now,request:()=>{throw Error('Unexpected request');}}),{code:'MISSING_SECRET'});
}));
