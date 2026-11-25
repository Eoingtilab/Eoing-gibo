/* 어잉티기보플레이어 · 개발: 어잉티연구소 (Eoingtilab) */
import {spawn} from 'node:child_process';
import {readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createInterface} from 'node:readline';
import {readEoingtiRecord} from '../web/eoingti-gibo.js';
import {decodeEoingtiSgf} from '../web/gibo-encoding.js';

const [source, destination, engine, config, model, rules, komiArg, visitsArg='64']=process.argv.slice(2);
if (!rules) throw Error('Usage: node tools/analyze.mjs game.sgf out.json katago analysis.cfg model.bin.gz rules [komi] [visits]');
const text=decodeEoingtiSgf(await readFile(source));
const {size,fields,events}=readEoingtiRecord(text);
const rawKomi=komiArg ?? fields.KM ?? fields.KO;
const komi=Number(rawKomi), visits=Number(visitsArg);
if(rawKomi==null || !String(rawKomi).trim() || !Number.isFinite(komi)) throw Error('Specify komi for this record.');
if(!Number.isInteger(visits) || visits<1) throw Error('Invalid visit count.');
const initial=new Map(), moves=[];
let initialPlayer;
function coord(x,y) {
    if(x<0 || y<0 || x>=size || y>=size || size>25) throw Error('Unsupported coordinate');
    return String.fromCharCode(65+x+(x>=8?1:0))+(size-y);
}
for(const [key,val] of events) {
    if(key==='B'||key==='W'){
        moves.push([key,(!val || (val==='tt' && size<=19))?'pass':coord(val.charCodeAt(0)-97,val.charCodeAt(1)-97)]);
    }else{
        if(moves.length) throw Error('Mid-game setup requires separate analysis.');
        if(key==='PL'){initialPlayer=val;continue;}
        const [a,b=a]=val.split(':');
        for(let x=a.charCodeAt(0)-97;x<=b.charCodeAt(0)-97;x++)
            for(let y=a.charCodeAt(1)-97;y<=b.charCodeAt(1)-97;y++){
                const pos=coord(x,y);
                if(key==='AE') initial.delete(pos); else initial.set(pos,key.slice(1));
            }
    }
}
const query={id:'main',moves,boardXSize:size,boardYSize:size,komi,rules,initialPlayer,
    initialStones:Array.from(initial,([point,color])=>[color,point]),maxVisits:visits,includeOwnership:true,
    analyzeTurns:Array.from({length:moves.length+1},(_,i)=>i)};
const proc=spawn(engine,['analysis','-config',config,'-model',model,'-override-config','reportAnalysisWinratesAs=BLACK,numAnalysisThreads=2,numSearchThreadsPerAnalysisThread=2'],{stdio:['pipe','pipe','inherit']});
const done=new Promise((resolve,reject)=>{proc.on('error',reject);proc.on('close',resolve);});
const turns=[];
proc.stdin.end(JSON.stringify(query)+'\n');
for await(const line of createInterface({input:proc.stdout})){
    const result=JSON.parse(line);
    if(result.error) throw Error(result.error);
    if(!result.rootInfo || result.isDuringSearch) continue;
    const {winrate,scoreLead}=result.rootInfo;
    turns[result.turnNumber]={blackWin:winrate,blackLead:scoreLead,ownership:result.ownership.map(v=>Math.round(v*100))};
}
if(await done!==0 || query.analyzeTurns.some(i=>!turns[i])) throw Error('Incomplete analysis');
const hash=createHash('sha256').update(text.replace(/\r\n?/g,'\n')).digest('hex');
await writeFile(destination,JSON.stringify({engine:'KataGo',hash,size,rules,komi,visits,turns}));

