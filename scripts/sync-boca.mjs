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
 const raw=[competition?.type,competition?.round,competition?.stage,event?.week,event?.round,event?.season?.type,event?.season?.slug].map(phaseText).find(Boolean)??'';
 // Normalizar y traducir rounds
 const normalized=raw
  .replace(/---+/g, ' · ')
  .replace(/-/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .toLowerCase();

 // Traducir fases eliminatorias
 const roundTranslations={
  'round of 16': 'Octavos de final',
  'round of 8': 'Cuartos de final',
  'quarterfinals': 'Cuartos de final',
  'quarterfinal': 'Cuartos de final',
  'semifinals': 'Semifinal',
  'semifinal': 'Semifinal',
  'final': 'Final',
  'round of 32': 'Treintaidosavos',
  'round of 4': 'Semifinal'
 };

 for(const[key,val]of Object.entries(roundTranslations)){
  if(normalized.includes(key))return val;
 }

 // Torneo clausura con fase específica
 if(normalized.includes('clausura') && normalized.includes('round')){
  return 'Torneo Clausura';
 }
 if(normalized.includes('clausura')){
  return 'Torneo Clausura';
 }

 return normalized.charAt(0).toUpperCase() + normalized.slice(1);
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
  // Scoreboard may expose goals as details; keep only confirmed, named scoring events.
  const goals=sides.flatMap(side=>{
   const details=Array.isArray(side.details)?side.details:[];
   return details
    .filter(detail=>/goal/i.test(String(detail.type?.text??detail.type??''))&&!/own goal/i.test(String(detail.type?.text??detail.type??'')))
    .map(detail=>{
     const athletes=Array.isArray(detail.athletes)?detail.athletes:[];
     return{
      team:side.homeAway,
      player:String(athletes[0]?.athlete?.displayName??detail.athlete?.displayName??'').trim(),
      minute:String(detail.clock?.displayValue??detail.clock??'').trim(),
      type:String(detail.type?.text??'').trim()||undefined,
      assist:athletes.length>1?String(athletes[1]?.athlete?.displayName??'').trim():undefined
     };
    });
  }).filter(goal=>goal.player);
  const clock=state.state==='in'?String(competition.status?.displayClock??event.status?.displayClock??'').trim():'';
  return [{id:`espn:${league.slug}:${event.id}`,date:event.date,status,statusLabel:({'Scheduled':'Programado','Postponed':'Postergado','Canceled':'Cancelado','Cancelled':'Cancelado','In Progress':'En juego','Halftime':'Entretiempo'}[state.description]??state.description??(completed?'Finalizado':'Por confirmar')),leagueId:league.id,season:Number(event.season?.year) || new Date(event.date).getUTCFullYear(),cup:league.name,round:eventRound(event),home:displayTeamName(home.team),away:displayTeamName(away.team),homeId:home.team?.id??null,awayId:away.team?.id??null,homeLogo:home.team?.logos?.[0]?.href??home.team?.logo??null,awayLogo:away.team?.logos?.[0]?.href??away.team?.logo??null,homeGoals:score(home),awayGoals:score(away),venue:competition.venue?.fullName??'Estadio por confirmar',broadcasts:eventBroadcasts(event),goals,clock}];
 });
}

/**
 * Enriquece un partido con datos detallados desde el endpoint summary de ESPN.
 * Solo se llama para partidos finalizados y una vez por día.
 */
export async function enrichFixture(fixture,request=fetch){
 if(fixture.status!=='FT' || !String(fixture.id).startsWith('espn:'))return fixture;

 const match=String(fixture.id).match(/^espn:([^:]+):(\d+)$/);
 if(!match)return fixture;
 const[,leagueSlug,eventId]=match;

 try{
  const url=`https://site.api.espn.com/apis/site/v2/sports/soccer/${leagueSlug}/summary?event=${eventId}`;
  const response=await request(url,{signal:AbortSignal.timeout(15000)});
  if(!response.ok)return fixture;

  const data=await response.json();

  // Extraer goles desde keyEvents (más detallado que scoreboard)
  const keyEvents=Array.isArray(data.keyEvents)?data.keyEvents:[];
  const enrichedGoals=keyEvents
   .filter(e=>e.scoringPlay===true)
   .map(e=>{
    const participants=Array.isArray(e.participants)?e.participants:[];
    const athlete=participants[0]?.athlete;
    const assistAthlete=participants[1]?.athlete;
    return{
     team:e.team?.id===String(fixture.homeId)?'home':'away',
     player:String(athlete?.displayName??'').trim(),
     minute:String(e.clock?.displayValue??'').trim(),
     type:e.type?.text||undefined,
     assist:assistAthlete?String(assistAthlete.displayName).trim():undefined
    };
   })
   .filter(g=>g.player);

  // Si encontramos goles en keyEvents, usar esos (son más completos)
  const goals=enrichedGoals.length>0?enrichedGoals:fixture.goals;

  // Extraer estadísticas avanzadas
  const boxscore=Array.isArray(data.boxscore?.teams)?data.boxscore.teams:[];
  const extractStats=teamId=>{
   const teamData=boxscore.find(t=>String(t.team?.id)===String(teamId));
   if(!teamData?.statistics)return{};
   const get=(...names)=>teamData.statistics.find(s=>names.includes(s.name))?.displayValue;
   const parseNum=v=>v!=null&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
   return{
    possession:parseNum(get('possessionPct')),
    shots:parseNum(get('totalShots')),
    shotsOnTarget:parseNum(get('shotsOnTarget')),
    corners:parseNum(get('wonCorners')),
    fouls:parseNum(get('foulsCommitted')),
    yellowCards:parseNum(get('yellowCards')),
    redCards:parseNum(get('redCards'))
   };
  };

  const homeStats=extractStats(fixture.homeId);
  const awayStats=extractStats(fixture.awayId);

  // Extraer alineaciones básicas
  const rosters=Array.isArray(data.rosters)?data.rosters:[];
  const extractLineup=teamId=>{
   const roster=rosters.find(r=>String(r.team?.id)===String(teamId));
   if(!roster?.roster)return null;
   return{
    formation:roster.formation?.value||undefined,
    starters:roster.roster.filter(p=>p.starter).map(p=>({
     name:p.athlete?.displayName||'',
     position:p.position?.displayName||undefined,
     number:p.jersey||undefined
    }))
   };
  };

  const homeLineup=extractLineup(fixture.homeId);
  const awayLineup=extractLineup(fixture.awayId);

  // Construir fixture enriquecido
  const enriched={...fixture,goals};

  if(Object.values(homeStats).some(v=>v!=null)||Object.values(awayStats).some(v=>v!=null)){
   enriched.stats={
    home:Object.values(homeStats).some(v=>v!=null)?homeStats:undefined,
    away:Object.values(awayStats).some(v=>v!=null)?awayStats:undefined
   };
  }

  if(homeLineup?.starters?.length||awayLineup?.starters?.length){
   enriched.lineups={
    home:homeLineup,
    away:awayLineup
   };
  }

  return enriched;
 }catch{
  // Si falla la consulta detallada, devolver fixture sin cambios
  return fixture;
 }
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

  // Enriquecer partidos finalizados recientes (últimos 30 días) con datos detallados
  // Limitar a máximo 5 partidos por corrida para no saturar la API
  const thirtyDaysAgo=Date.now()-30*86400000;
  const toEnrich=fixtures
   .filter(f=>f.status==='FT' && Date.parse(f.date)>thirtyDaysAgo && (!f.stats || (f.goals && f.goals.length===0)))
   .slice(0,5);

  if(toEnrich.length>0){
   console.log(`Enriqueciendo ${toEnrich.length} partidos finalizados...`);
   for(const fixture of toEnrich){
    const idx=fixtures.findIndex(f=>f.id===fixture.id);
    if(idx!==-1){
     fixtures[idx]=await enrichFixture(fixture,request);
     requests++; // Contar requests adicionales
    }
   }
  }

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
