import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {sync,normalizeEvents,LEAGUES} from '../scripts/sync-boca.mjs';
const now=new Date('2026-11-15T13:00:00Z');
const event={id:'401',date:'2026-11-20T22:00:00Z',status:{type:{state:'pre',description:'Scheduled'}},competitions:[{competitors:[{homeAway:'home',team:{id:'1',displayName:'Boca Juniors'},score:null},{homeAway:'away',team:{id:'2',displayName:'River Plate'},score:null}],venue:{fullName:'La Bombonera'}}]};
const response=events=>({ok:true,json:async()=>({events})});
async function temp(fn){const dir=await mkdtemp(join(tmpdir(),'boca-test-'));try{await fn(dir);}finally{await rm(dir,{recursive:true,force:true});}}
test('normalizes Boca games and final scores',()=>{const rows=normalizeEvents([{...event,status:{type:{completed:true}},competitions:[{...event.competitions[0],competitors:[{...event.competitions[0].competitors[0],score:'2'},{...event.competitions[0].competitors[1],score:'1'}]}]}],LEAGUES[0]);assert.equal(rows[0].status,'FT');assert.equal(rows[0].homeGoals,2);assert.equal(rows[0].awayGoals,1);});
test('ignores games not involving Boca',()=>{const e={...event,competitions:[{competitors:[{homeAway:'home',team:{displayName:'River'}},{homeAway:'away',team:{displayName:'Racing'}}]}]};assert.deepEqual(normalizeEvents([e],LEAGUES[0]),[]);});
test('queries each competition without key and retains history',()=>temp(async dir=>{await writeFile(dir+'/boca.json',JSON.stringify({fixtures:[{id:'old',date:'2026-10-01T00:00:00Z'}],competitions:[]}));const urls=[];const data=await sync({dir,now,request:async url=>{urls.push(url);return response([event]);}});assert.equal(urls.length,12);assert.ok(urls.every(url=>url.includes('/scoreboard?dates=')&&!url.includes('api-sports')));assert.ok(data.fixtures.some(f=>f.id==='old'));assert.equal(data.fixtures.length,4);assert.equal(data.competitions.length,3);}));
test('errors do not replace previous snapshot',()=>temp(async dir=>{await writeFile(dir+'/boca.json','{"old":true}');await assert.rejects(sync({dir,now,request:async()=>({ok:false,status:403})}),{code:'HTTP_ERROR'});assert.equal(await readFile(dir+'/boca.json','utf8'),'{"old":true}');}));
test('empty ESPN responses preserve history',()=>temp(async dir=>{await writeFile(dir+'/boca.json','{"old":true}');await assert.rejects(sync({dir,now,request:async()=>response([])}),{code:'EMPTY_RESPONSE'});assert.equal(await readFile(dir+'/boca.json','utf8'),'{"old":true}');}));
