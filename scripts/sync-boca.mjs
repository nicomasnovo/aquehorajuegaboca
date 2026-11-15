import {mkdir,readFile,rename,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

export const LEAGUES=[
 {slug:'arg.1',id:1001,name:'Liga Argentina'},
 {slug:'arg.copa',id:1002,name:'Copa Argentina'},
 {slug:'conmebol.libertadores',id:1003,name:'Copa Libertadores'},
 {slug:'conmebol.sudamericana',id:1004,name:'Copa Sudamericana'},
 // Candidate ESPN identifiers: optional until validated by the provider.
 {slug:'arg.supercopa',id:1005,name:'Supercopa Argentina',optional:true},
 {slug:'arg.trofeo-de-campeones',id:1006,name:'Trofeo de Campeones',optional:true},
 {slug:'arg.supercopa-internacional',id:1007,name:'Supercopa Internacional',optional:true},
 {slug:'arg.recopa-de-campeones',id:1008,name:'Recopa de Campeones',optional:true},
 {slug:'conmebol.recopa',id:1009,name:'Recopa Sudamericana',optional:true},
 {slug:'fifa.intercontinental',id:1010,name:'Copa Intercontinental FIFA',optional:true},
 {slug:'fifa.cwc',id:1011,name:'Mundial de Clubes FIFA',optional:true}
];
export class SyncError extends Error{constructor(code,message){super(message);this.code=code;}}
const isBoca=team=>/\bboca\s+juniors\b/i.test([team?.displayName,team?.name,team?.shortDisplayName].filter(Boolean).join(' '));
const addDays=(date,n)=>new Date(date.getTime()+n*86400000);
export function normalizeEvents(events,league){
 if(!Array.isArray(events))throw new SyncError('INVALID_RESPONSE','ESPN no devolvió una lista de eventos.');
 return events.flatMap(event=>{
  const competition=event.competitions?.[0];
  const sides=competition?.competitors??[];
  const home=sides.find(s=>s.homeAway==='home');
  const away=sides.find(s=>s.homeAway==='away');
  if(!home||!away||!isBoca(home.team)&&!isBoca(away.team))return [];
  if(!event.id||!event.date||!Number.isFinite(Date.parse(event.date)))throw new SyncError('INVALID_FIXTURE','Partido de ESPN incompleto.');
  const state=competition.status?.type??event.status?.type??{};
  const completed=state.completed===true||state.name==='STATUS_FINAL';
  const status=completed?'FT':state.state==='in'?'LIVE':state.state==='pre'?'NS':'TBD';
  const score=side=>{const n=Number(side.score);return side.score==null||side.score===''||!Number.isFinite(n)?null:n;};
  return [{id:`espn:${league.slug}:${event.id}`,date:event.date,status,statusLabel:state.description??(completed?'Finalizado':'Por confirmar'),leagueId:league.id,season:Number(event.season?.year) || new Date(event.date).getUTCFullYear(),cup:league.name,round:competition.type?.text??event.week?.text??'',home:home.team?.displayName??home.team?.name??'',away:away.team?.displayName??away.team?.name??'',homeId:home.team?.id??null,awayId:away.team?.id??null,homeLogo:home.team?.logos?.[0]?.href??home.team?.logo??null,awayLogo:away.team?.logos?.[0]?.href??away.team?.logo??null,homeGoals:score(home),awayGoals:score(away),venue:competition.venue?.fullName??'Estadio por confirmar'}];
 });
}
async function atomic(path,value){await writeFile(path+'.tmp',JSON.stringify(value,null,2)+'\n');await rename(path+'.tmp',path);}
export async function sync({dir='public/data',now=new Date(),request=fetch,leagues=LEAGUES}={}){
 await mkdir(dir,{recursive:true});
 let previous;try{previous=JSON.parse(await readFile(dir+'/boca.json','utf8'));}catch{}
 const season=Number(new Intl.DateTimeFormat('en',{year:'numeric',timeZone:'America/Argentina/Buenos_Aires'}).format(now));
 const status={season,checkedAt:now.toISOString(),lastSuccessAt:previous?.updatedAt??null,source:'ESPN (API no oficial)'};
 try{
  // ESPN retired YYYYMMDD-YYYYMMDD ranges; request calendar months instead.
  const start=addDays(now,-21),months=[];
  for(let i=0;i<6;i++){
   const d=new Date(Date.UTC(start.getUTCFullYear(),start.getUTCMonth()+i,1));
   months.push(String(d.getUTCFullYear())+String(d.getUTCMonth()+1).padStart(2,'0'));
  }
  const incoming=[];let requests=0;const unavailable=[];const supported=new Set();
  for(const league of leagues){
   for(const month of months){
    const url=`https://site.api.espn.com/apis/site/v2/sports/soccer/${league.slug}/scoreboard?dates=${month}&limit=500`;
    let response;
    try{response=await request(url,{signal:AbortSignal.timeout(25000)});}
    catch{if(league.optional){unavailable.push(`${league.slug}: network error`);break;}throw new SyncError('NETWORK_ERROR',`No se pudo consultar ESPN (${league.slug}).`);}
    requests++;
    if(!response.ok){if(league.optional){unavailable.push(`${league.slug}: HTTP ${response.status}`);break;}throw new SyncError('HTTP_ERROR',`ESPN ${league.slug}: HTTP ${response.status}.`);}
    let body;try{body=await response.json();}catch{if(league.optional){unavailable.push(`${league.slug}: invalid JSON`);break;}throw new SyncError('INVALID_RESPONSE',`ESPN ${league.slug} devolvió JSON inválido.`);}
    if(!Array.isArray(body.events)){if(league.optional){unavailable.push(`${league.slug}: invalid events`);break;}throw new SyncError('INVALID_RESPONSE',`ESPN ${league.slug} no devolvió eventos.`);}
    supported.add(league.slug);
    incoming.push(...normalizeEvents(body.events,league));
   }
  }
  if(!incoming.length)throw new SyncError('EMPTY_RESPONSE','No se encontraron partidos de Boca en las competiciones consultadas. Se conserva el historial.');
  const history=Array.isArray(previous?.fixtures)?previous.fixtures.filter(f=>f&&f.id!=null):[];
  const byId=new Map(history.map(f=>[String(f.id),f]));
  for(const f of incoming)byId.set(String(f.id),{...byId.get(String(f.id)),...f});
  const fixtures=[...byId.values()].sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  const competitions=Array.isArray(previous?.competitions)?[...previous.competitions]:[];
  for(const league of leagues.filter(l=>!l.optional||incoming.some(f=>f.leagueId===l.id))){
   if(!competitions.some(c=>c.id===league.id))competitions.push({id:league.id,name:league.name,type:'Cup',country:league.slug.startsWith('conmebol')?'South America':'Argentina',standingsAvailable:false,tables:[]});
  }
  const data={schemaVersion:1,source:'ESPN (API no oficial)',season,teamId:451,updatedAt:now.toISOString(),fixtures,competitions};
  await atomic(dir+'/boca.json',data);
  await atomic(dir+'/sync-status.json',{...status,lastSuccessAt:data.updatedAt,ok:true,code:null,message:'Partidos y resultados actualizados desde ESPN.',requests,received:incoming.length,availableLeagues:[...supported],unavailableLeagues:unavailable});
  return data;
 }catch(error){
  const safe=error instanceof SyncError?error:new SyncError('SYNC_FAILED','Falló la sincronización. Se conserva el historial.');
  await atomic(dir+'/sync-status.json',{...status,ok:false,code:safe.code,message:safe.message});
  throw safe;
 }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{const data=await sync();console.log(`ESPN: ${data.fixtures.length} partidos acumulados.`);}catch(error){console.error(`${error.code}: ${error.message}`);process.exitCode=1;}
}
