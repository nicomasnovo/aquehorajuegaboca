import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const TEAM = 451;
export class SyncError extends Error { constructor(code,message){super(message);this.code=code;} }
export function validateResponse(body){
 if(!body || typeof body!=='object')throw new SyncError('INVALID_RESPONSE','Respuesta inválida de API-Football.');
 if(body.errors && Object.keys(body.errors).length){
  if(body.errors.plan)throw new SyncError('PLAN_RESTRICTED','El plan de API-Football restringe esta consulta.');
  throw new SyncError('API_ERROR','API-Football devolvió un error. Se conservan los datos anteriores.');
 }
 if(!Array.isArray(body.response))throw new SyncError('INVALID_RESPONSE','Respuesta incompleta de API-Football.');
 if((body.paging?.total??1)>1)throw new SyncError('PAGINATION_REQUIRED','La respuesta requiere paginación. No se publicarán datos parciales.');
 return body.response;
}
export function normalizeFixtures(rows){return rows.map(row=>{
 if(!Number.isInteger(row.fixture?.id)||!row.fixture?.date||!Number.isFinite(Date.parse(row.fixture.date))||!Number.isInteger(row.league?.id)||![row.teams?.home?.id,row.teams?.away?.id].includes(TEAM)||!row.teams?.home?.name||!row.teams?.away?.name)throw new SyncError('INVALID_FIXTURE','Partido inválido.');
 return {id:row.fixture.id,date:row.fixture.date,status:row.fixture.status?.short??'TBD',statusLabel:row.fixture.status?.long??'Por confirmar',leagueId:row.league.id,season:row.league.season??null,cup:row.league.name,round:row.league.round??'',home:row.teams.home.name,away:row.teams.away.name,homeId:row.teams.home.id,awayId:row.teams.away.id,homeGoals:row.goals?.home??null,awayGoals:row.goals?.away??null,venue:row.fixture.venue?.name??'Estadio por confirmar'};
}).sort((a,b)=>a.date.localeCompare(b.date));}
async function atomic(path,value){await writeFile(path+'.tmp',JSON.stringify(value,null,2)+'\n');await rename(path+'.tmp',path);}
export async function sync({key=process.env.API_FOOTBALL_KEY,dir='public/data',now=new Date(),request=fetch}={}){
 const season=Number(new Intl.DateTimeFormat('en',{year:'numeric',timeZone:'America/Argentina/Buenos_Aires'}).format(now));
 await mkdir(dir,{recursive:true});
 let previous;try{previous=JSON.parse(await readFile(dir+'/boca.json','utf8'));}catch{}
 const status={season,checkedAt:now.toISOString(),lastSuccessAt:previous?.updatedAt??null};
 try{
  if(!key)throw new SyncError('MISSING_SECRET','Falta configurar el secret API_FOOTBALL_KEY.');
  let count=0;
  const get=async(path)=>{
   if(++count>20)throw new SyncError('REQUEST_BUDGET','Se alcanzó el límite de 20 consultas por ejecución.');
   let r;try{r=await request('https://v3.football.api-sports.io/'+path,{headers:{'x-apisports-key':key},signal:AbortSignal.timeout(25000)});}catch{throw new SyncError('NETWORK_ERROR','No fue posible conectar con API-Football.');}
   if(!r.ok)throw new SyncError('HTTP_ERROR',`API-Football respondió HTTP ${r.status}.`);
   let body;try{body=await r.json();}catch{throw new SyncError('INVALID_RESPONSE','API-Football no devolvió JSON válido.');}
   return validateResponse(body);
  };
  // No season filter: preserve past snapshots as a local fixture archive.
  const incoming=normalizeFixtures(await get(`fixtures?team=${TEAM}&next=20`));
  const history=Array.isArray(previous?.fixtures)?previous.fixtures.filter(f=>Number.isInteger(f?.id)):[];
  const byId=new Map(history.map(f=>[f.id,f]));
  for(const fixture of incoming)byId.set(fixture.id,{...byId.get(fixture.id),...fixture});
  const fixtures=[...byId.values()].sort((a,b)=>a.date.localeCompare(b.date));
  const previousCompetitions=Array.isArray(previous?.competitions)?previous.competitions:[];
  const competitions=[...previousCompetitions];
  for(const fixture of incoming){
   if(!competitions.some(c=>c.id===fixture.leagueId&&c.season===fixture.season)){
    competitions.push({id:fixture.leagueId,season:fixture.season,name:fixture.cup,type:null,country:'',standingsAvailable:false,tables:[]});
   }
  }
  if(!incoming.length)throw new SyncError('EMPTY_RESPONSE','La API no devolvió próximos partidos; se conserva el historial.');
  const data={schemaVersion:1,source:'API-Football',season,teamId:TEAM,updatedAt:now.toISOString(),fixtures,competitions};
  // Only replace the snapshot after every request and validation succeeds.
  await atomic(dir+'/boca.json',data);
  await atomic(dir+'/sync-status.json',{...status,lastSuccessAt:data.updatedAt,ok:true,code:null,message:'Datos actualizados desde API-Football.',requests:count});
  return data;
 }catch(error){
  const safe=error instanceof SyncError?error:new SyncError('SYNC_FAILED','Falló la sincronización. Se conservan los datos anteriores.');
  await atomic(dir+'/sync-status.json',{...status,ok:false,code:safe.code,message:safe.message});
  throw safe;
 }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 // --stdin-key is for an interactive test; production reads GitHub Secrets via env.
 let key=process.env.API_FOOTBALL_KEY;
 if(process.argv.includes('--stdin-key')){key='';for await(const chunk of process.stdin)key+=chunk;key=key.trim();}
 try{const d=await sync({key});console.log(`Sincronizado ${d.season}: ${d.fixtures.length} partidos, ${d.competitions.length} competencias.`);}catch(e){console.error(`${e.code}: ${e.message}`);process.exitCode=1;}
}
