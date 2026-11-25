import {createHash} from 'node:crypto';
import {access,readFile,writeFile,mkdtemp,rename,rm,readdir} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {watch} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {readEoingtiRecord} from '../web/eoingti-gibo.js';
import {decodeEoingtiSgf} from '../web/gibo-encoding.js';


const paths=process.argv.slice(2);
if(paths.length!==5) throw Error('Usage: node tools/worker.mjs queue results katago analysis.cfg model.bin.gz');
const [queue,output,engine,config,model]=paths.map(path=>resolve(path));
const analyzer=fileURLToPath(new URL('./analyze.mjs',import.meta.url));
function parameters(fields) {
    const label=(fields.RU || 'korean').trim().toLowerCase();
    const rules=({'한국':'korean','일본':'japanese','중국':'chinese','한국룰':'korean'})[label] || label;
    const value=String(fields.KM || fields.KO || '').trim() || (Number(fields.HA || fields.HO)>1 ? '0.5' : '6.5');
    const match=/^([+-]?\d+(?:\.\d+)?)\s*(?:집|目)?\s*(반)?$/.exec(value);
    if(!match) throw Error('Unsupported komi: '+value);
    return [rules,String(Number(match[1])+(match[2]?0.5:0))];
}
async function analyze(bytes, key) {
    const {fields}=readEoingtiRecord(decodeEoingtiSgf(bytes));
    const [rules,komi]=parameters(fields);
    const tmp=await mkdtemp(join(tmpdir(),'eoing-gibo-'));
    const partial=output+'/.'+key+'.tmp';
    try {
        await writeFile(tmp+'/game.sgf',bytes);
        const args=[analyzer,tmp+'/game.sgf',partial,engine,config,model,rules,komi,'16'];
        await new Promise((resolve,reject)=>{
            const proc=spawn(process.execPath,args,{cwd:tmp,stdio:['ignore','inherit','inherit'],timeout:1800000});
            proc.on('error',reject);
            proc.on('close',code=>code===0?resolve():reject(Error('engine exit '+code)));
        });
        await rename(partial,output+'/'+key+'.json');
        console.log('READY',key);
    } finally {await rm(tmp,{recursive:true,force:true});await rm(partial,{force:true});}
}
// Install the watcher before the recovery scan so a concurrent registration is never missed.
const pending=new Set();
let draining=false;
async function drain(){
    if(draining) return;
    draining=true;
    try {
        while(pending.size){
            const name=pending.values().next().value;
            pending.delete(name);
            const key=name.slice(0,-4), path=join(queue,name);
            try {
                const bytes=await readFile(path);
                if(createHash('sha256').update(bytes).digest('hex')!==key) throw Error('Source hash mismatch');
                try {await access(output+'/'+key+'.json');}
                catch(e){if(e.code!=='ENOENT')throw e;await analyze(bytes,key);}
                await rm(path,{force:true});
            } catch(e){
                if(e.code==='ENOENT')continue;
                console.error('FAILED',key,e.message);
                await rename(path,path+'.failed').catch(err=>{if(err.code!=='ENOENT')throw err;});
            }
        }
    } finally {draining=false;}
}
function enqueue(name){
    if(!/^[0-9a-f]{64}\.sgf$/.test(name))return;
    pending.add(name);drain().catch(e=>{console.error(e);process.exit(1);});
}
async function recover(){for(const name of await readdir(queue))enqueue(name);}
watch(queue,(_event,name)=>{if(name)enqueue(name);else recover().catch(e=>{console.error(e);process.exit(1);});});
await recover();
