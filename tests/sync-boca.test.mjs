import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {sync} from '../scripts/sync-boca.mjs';
const now=new Date('2026-11-08T13:00:00Z');
const fixture={fixture:{id:1,date:'2026-11-14T22:00:00Z',status:{short:'NS'},venue:{name:'Test'}},league:{id:10,name:'Test',season:2026,round:'Final'},teams:{home:{id:451,name:'Boca'},away:{id:2,name:'Rival'}},goals:{home:null,away:null}};
const league={league:{id:10,name:'Test',type:'Cup'},country:{name:'Argentina'},seasons:[{year:2026,coverage:{standings:true}}]};
const response=(rows)=>({ok:true,json:async()=>({errors:[],response:rows,paging:{total:1}})});
async function temp(fn){const dir=await mkdtemp(join(tmpdir(),'boca-test-'));try{await fn(dir);}finally{await rm(dir,{recursive:true,force:true});}}
test('bloqueo de plan conserva snapshot y no expone key',()=>temp(async dir=>{await writeFile(dir+'/boca.json','{"old":true}');await assert.rejects(sync({key:'secret-test',dir,now,request:async()=>({ok:true,json:async()=>({errors:{plan:'secret-test'},response:[]})})}),{code:'PLAN_RESTRICTED'});assert.equal(await readFile(dir+'/boca.json','utf8'),'{"old":true}');assert.ok(!(await readFile(dir+'/sync-status.json','utf8')).includes('secret-test'));}));
test('sincroniza fixtures y tablas completas de la temporada actual',()=>temp(async dir=>{const urls=[];const request=async url=>{urls.push(url);return response(url.includes('/fixtures?')?[fixture]:url.includes('/leagues?')?[league]:[{league:{id:10,season:2026,standings:[[{rank:1,team:{id:451,name:'Boca'},points:10,all:{played:4},goalsDiff:3,group:'A'}]]}}]);};const d=await sync({key:'test',dir,now,request});assert.equal(d.fixtures.length,1);assert.equal(d.competitions[0].tables[0].rows[0].teamId,451);assert.ok(urls.every(u=>u.includes('season=2026')));}));
test('error en tabla no reemplaza los partidos existentes',()=>temp(async dir=>{await writeFile(dir+'/boca.json','{"old":true}');await assert.rejects(sync({key:'test',dir,now,request:async url=>url.includes('/standings?')?{ok:false,status:429}:response(url.includes('/fixtures?')?[fixture]:[league])}),{code:'HTTP_ERROR'});assert.equal(await readFile(dir+'/boca.json','utf8'),'{"old":true}');}));
test('rechaza fixtures de años anteriores',()=>temp(async dir=>{await assert.rejects(sync({key:'test',dir,now,request:async()=>response([{...fixture,league:{...fixture.league,season:2024}}])}),{code:'INVALID_FIXTURE'});}));
test('no consulta sin secret',()=>temp(async dir=>{await assert.rejects(sync({key:'',dir,now,request:()=>{throw Error('No debe llamarse');}}),{code:'MISSING_SECRET'});}));
