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
const TEAM_NAMES=new Map([['5','Boca Juniors'],['7632','Atlético Mineiro']]);
export const displayTeamName=team=>TEAM_NAMES.get(String(team?.id))??({'Atlético-MG':'Atlético Mineiro','Atlético MG':'Atlético Mineiro'}[team?.displayName]??team?.displayName??team?.name??'');
const addDays=(date,n)=>new Date(date.getTime()+n*86400000);
// ESPN exposes the competition phase in different fields depending on the tournament.
const phaseText=value=>typeof value==='string'?value.trim():typeof value?.text==='string'?value.text.trim():typeof value?.displayName==='string'?value.displayName.trim():typeof value?.name==='string'?value.name.trim():'';
export const eventRound=event=>{
 const competition=event.competitions?.[0];
 return [competition?.type,competition?.round,competition?.stage,event?.week,event?.round,event?.season?.type,event?.season?.slug].map(phaseText).find(Boolean)??'';
};
export function eventBroadcasts(event){
 const sources=[...(Array.isArray(event.broadcasts)?event.broadcasts:[]),...(Array.isArray(event.competitions?.[0]?.broadcasts)?event.competitions[0].broadcasts:[])];
 return [...new Set(sources.flatMap(b=>[...(Array.isArray(b.names)?b.names:[]),b.name,b.shortName].filter(v=>typeof v==='string'&&v.trim()).map(v=>v.trim())))];
}
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
  return [{id:`espn:${league.slug}:${event.id}`,date:event.date,status,statusLabel:({'Scheduled':'Programado','Postponed':'Postergado','Canceled':'Cancelado','Cancelled':'Cancelado','In Progress':'En juego','Halftime':'Entretiempo'}[state.description]??state.description??(completed?'Finalizado':'Por confirmar')),leagueId:league.id,season:Number(event.season?.year) || new Date(event.date).getUTCFullYear(),cup:league.name,round:eventRound(event),home:displayTeamName(home.team),away:displayTeamName(away.team),homeId:home.team?.id??null,awayId:away.team?.id??null,homeLogo:home.team?.logos?.[0]?.href??home.team?.logo??null,awayLogo:away.team?.logos?.[0]?.href??away.team?.logo??null,homeGoals:score(home),awayGoals:score(away),venue:competition.venue?.fullName??'Estadio por confirmar',broadcasts:eventBroadcasts(event)}];
 });
}
export function normalizeStandings(body){
 const groups=Array.isArray(body?.children)&&body.children.length?body.children:[body];
 return groups.flatMap((group,index)=>{
  const entries=group?.standings?.entries;
  if(!Array.isArray(entries)||!entries.length)return [];
  const rows=entries.map((entry,i)=>{
   const stats=entry.stats??[];
   const stat=(...names)=>stats.find(v=>names.includes(v.name)||names.includes(v.type));
   const num=(...names)=>{const v=stat(...names)?.value;return v==null||!Number.isFinite(Number(v))?null:Number(v)};
   return {rank:num('rank','position')??i+1,teamId:entry.team?.id??'',name:displayTeamName(entry.team),points:num('points','point'),played:num('gamesPlayed','matchesPlayed'),goalDiff:num('pointDifferential','goalDifference','goalDifferential')};
  }).filter(row=>row.name).sort((a,b)=>a.rank-b.rank);
  return [{name:group.name??group.displayName??('Tabla '+(index+1)),rows}];
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
  for(const f of incoming){const prior=byId.get(String(f.id));byId.set(String(f.id),{...prior,...f,round:f.round||prior?.round||''});}
  // Normalize previously saved ESPN fixtures too, without changing unrelated team names.
  for(const f of byId.values()){
   if(String(f.id).startsWith('espn:')){
    f.home=displayTeamName({id:f.homeId,displayName:f.home});
    f.away=displayTeamName({id:f.awayId,displayName:f.away});
   }
  }
  const fixtures=[...byId.values()].sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  const competitions=Array.isArray(previous?.competitions)?[...previous.competitions]:[];
  for(const league of leagues){
   if(!competitions.some(c=>c.id===league.id))competitions.push({id:league.id,name:league.name,type:'Cup',country:league.slug.startsWith('conmebol')?'South America':'Argentina',standingsAvailable:false,tables:[]});
  }
  // Standings are best-effort: cup knockouts and unsupported leagues may not expose tables.
  for(const league of leagues){
   const competition=competitions.find(c=>c.id===league.id);
   if(!competition)continue;
   try{
    const response=await request(`https://site.api.espn.com/apis/v2/sports/soccer/${league.slug}/standings?season=${season}`,{signal:AbortSignal.timeout(12000)});
    if(!response.ok)continue;
    const body=await response.json();
    if(body?.season?.year!=null&&Number(body.season.year)!==season)continue;
    const tables=normalizeStandings(body);
    competition.tables=tables;
    competition.standingsAvailable=tables.length>0;
   }catch{ /* Keep fixture synchronization working when standings are unavailable. */ }
  }
  const data={schemaVersion:1,source:'ESPN (API no oficial)',season,teamId:5,updatedAt:now.toISOString(),fixtures,competitions};
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
