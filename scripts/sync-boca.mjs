import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const TEAM = 451;
export class SyncError extends Error { constructor(code,message){super(message);this.code=code;} }
export function validateResponse(body){
 if(!body || typeof body!=='object')throw new SyncError('INVALID_RESPONSE','Respuesta inválida de API-Football.');
 if(body.errors && Object.keys(body.errors).length){
  if(body.errors.plan)throw new SyncError('PLAN_RESTRICTED','El plan de API-Football no permite consultar el año actual.');
  throw new SyncError('API_ERROR','API-Football devolvió un error. Se conservan los datos anteriores.');
 }
 if(!Array.isArray(body.response))throw new SyncError('INVALID_RESPONSE','Respuesta incompleta de API-Football.');
 if((body.paging?.total??1)>1)throw new SyncError('PAGINATION_REQUIRED','La respuesta requiere paginación. No se publicarán datos parciales.');
 return body.response;
}
export function normalizeFixtures(rows,season){return rows.map(row=>{
 if(!Number.isInteger(row.fixture?.id)||!row.fixture?.date||!Number.isFinite(Date.parse(row.fixture.date))||!Number.isInteger(row.league?.id)||row.league?.season!==season||![row.teams?.home?.id,row.teams?.away?.id].includes(TEAM)||!row.teams?.home?.name||!row.teams?.away?.name)throw new SyncError('INVALID_FIXTURE','Partido inválido o de otra temporada.');
 return {id:row.fixture.id,date:row.fixture.date,status:row.fixture.status?.short??'TBD',statusLabel:row.fixture.status?.long??'Por confirmar',leagueId:row.league.id,cup:row.league.name,round:row.league.round??'',home:row.teams.home.name,away:row.teams.away.name,homeId:row.teams.home.id,awayId:row.teams.away.id,homeGoals:row.goals?.home??null,awayGoals:row.goals?.away??null,venue:row.fixture.venue?.name??'Estadio por confirmar'};
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
  const fixtures=normalizeFixtures(await get(`fixtures?team=${TEAM}&season=${season}`),season);
  const leagues=await get(`leagues?team=${TEAM}&season=${season}`);
  const competitions=[];
  for(const entry of leagues){
   if(!Number.isInteger(entry.league?.id)||!entry.league?.name)throw new SyncError('INVALID_LEAGUE','Competencia inválida.');
   const coverage=entry.seasons?.find(s=>s.year===season)?.coverage;
   const tables=[];
   if(coverage?.standings){
    const rows=await get(`standings?league=${entry.league.id}&season=${season}`);
    for(const result of rows){
     if(result.league?.season!==season||result.league?.id!==entry.league.id)throw new SyncError('INVALID_STANDINGS','Tabla de otra competencia o temporada.');
     for(const group of result.league.standings??[]){
      if(!Array.isArray(group))throw new SyncError('INVALID_STANDINGS','Tabla inválida.');
      tables.push({name:group[0]?.group??entry.league.name,rows:group.map(r=>{
       if(!Number.isInteger(r.rank)||!r.team?.name||!Number.isFinite(r.points))throw new SyncError('INVALID_STANDINGS','Fila de posiciones inválida.');
       return {rank:r.rank,teamId:r.team.id,name:r.team.name,points:r.points,played:r.all?.played??null,goalDiff:r.goalsDiff??null};
      })});
     }
    }
   }
   competitions.push({id:entry.league.id,name:entry.league.name,type:entry.league.type,country:entry.country?.name??'',standingsAvailable:!!coverage?.standings,tables});
  }
  if(fixtures.some(f=>!competitions.some(c=>c.id===f.leagueId)))throw new SyncError('INCOMPLETE_DATA','Faltan competencias de los partidos recibidos.');
  if(!fixtures.length&&previous?.season===season&&previous.fixtures?.length)throw new SyncError('EMPTY_RESPONSE','La API devolvió una lista vacía inesperada.');
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
