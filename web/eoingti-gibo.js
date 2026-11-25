const eoingtiStoneSprites = Object.create(null);
function eoingtiStoneSprite(size, black) {
    const key = size + ':' + black;
    if (eoingtiStoneSprites[key]) return eoingtiStoneSprites[key];
    const tile = document.createElement('canvas');
    tile.width = tile.height = size;
    const ctx = tile.getContext('2d');
    const x = size * .49, y = size * .47, r = size * .455;
    const body = ctx.createRadialGradient(x+r*.34, y-r*.47, 0, x, y, r);
    const colors = black ? ['#92918a','#444440','#252525','#0e0f10','#050505']
                         : ['#fffefa','#f7f3e7','#e8e3d5','#c1bbae','#969086'];
    [0,.24,.53,.88,1].forEach((stop,i) => body.addColorStop(stop, colors[i]));
    ctx.shadowColor = 'rgba(15,8,5,.65)';
    ctx.shadowOffsetY = size * .045;
    ctx.shadowBlur = size * .035;
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(x,y,r,r*.97,0,0,Math.PI*2);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.translate(x+r*.26,y-r*.55);
    ctx.rotate(.2);
    ctx.scale(1,.43);
    const gloss = ctx.createRadialGradient(0,0,0,0,0,r*.42);
    gloss.addColorStop(0, black ? 'rgba(255,253,238,.48)' : 'rgba(255,255,255,.85)');
    gloss.addColorStop(1,'rgba(255,255,255,0)');
    ctx.fillStyle = gloss;
    ctx.fillRect(-r,-r,2*r,2*r);
    eoingtiStoneSprites[key] = tile;
    return tile;
}

// Main-line SGF playback, including the older federation LI/RD records.
function readEoingtiRecord(source) {
    const fields = Object.create(null), events = [], branches = [];
    const comments = [], metadata = Object.create(null);
    let root = true, nodeHasProperties = false;
    let turn = 0, comment = "";
    function saveComment(){if(comment) comments[turn] = [comments[turn],comment].filter(Boolean).join("\n"); comment="";}
    const tokens = /;|\(|\)|([A-Z]+)\s*((?:\[(?:\\[\s\S]|[^\]\\])*\]\s*)+)/g;
    for (const match of source.matchAll(tokens)) {
        const parent = branches[branches.length - 1];
        if (match[0] === ';') {
            if(parent?.active) { saveComment(); if(nodeHasProperties) root=false; }
        } else if (match[0] === '(') {
            branches.push({active: !parent || (parent.active && !parent.hasChild), hasChild:false});
            if (parent) parent.hasChild = true;
        } else if (match[0] === ')') {
            if(parent?.active) saveComment();
            branches.pop();
            if (!branches.length) break;
        } else if (parent?.active) {
            for (const value of match[2].matchAll(/\[((?:\\[\s\S]|[^\]\\])*)\]/g)) {
                const text = value[1].replace(/\\(?:\r\n|[\r\n])/g,'').replace(/\\([\s\S])/g,'$1');
                const key = match[1];
                nodeHasProperties=true;
                if(root && text.trim() && !['B','W'].includes(key)){
                    (metadata[key] ||= []).push(text);
                }
                if(key==='B' || key==='W') turn++;
                if(key==='C'){comment=text;continue;}
                if (['B','W','AB','AW','AE','PL'].includes(key)) events.push([key,text]);
                else if (!(key in fields)) fields[key] = text;
            }
        }
    }
    const size = Number(fields.SZ || fields.LI || 19);
    if (!Number.isInteger(size) || size < 2 || size > 26) throw Error('지원하지 않는 바둑판 크기입니다.');
    saveComment();
    return {fields,events,size,comments,metadata};
}

class EoingtiGame {
    constructor(record) {
        this.size = record.size;
        const empty = new Int32Array(this.size*this.size);
        this.frames = [{cells:empty, last:-1, next:Number(record.fields.HA)>1?-1:1}];
        for (const [key,value] of record.events) {
            const prev=this.frames[this.frames.length-1];
            if (key==='PL') { prev.next=value==='W'?-1:1; continue; }
            const color=key.endsWith('B')?1:-1;
            if (key==='W' || key==='B') {
                const index=this.point(value);
                if (index<0 && value!=='' && !(value==='tt' && this.size<=19)) throw Error('착수 좌표를 확인해 주세요.');
                const cells=index<0?prev.cells:this.place(prev.cells,index,color,this.frames.length);
                if (!cells) throw Error('기보에 재현할 수 없는 착수가 있습니다.');
                this.frames.push({cells,last:index,next:-color});
            } else {
                const [from,to=from]=value.split(':');
                const a=this.point(from), b=this.point(to);
                if (a<0 || b<0) continue;
                prev.cells=prev.cells.slice();
                for(let y=Math.floor(a/this.size);y<=Math.floor(b/this.size);y++)
                    for(let x=a%this.size;x<=b%this.size;x++) prev.cells[y*this.size+x]=key==='AE'?0:color*2147483647;
            }
        }
    }
    point(value) {
        if (!/^[a-z]{2}$/.test(value)) return -1;
        const x=value.charCodeAt(0)-97,y=value.charCodeAt(1)-97;
        return x<this.size && y<this.size ? y*this.size+x : -1;
    }
    neighbors(i) {
        const result=[], n=this.size;
        if(i%n) result.push(i-1);
        if(i%n<n-1) result.push(i+1);
        if(i>=n) result.push(i-n);
        if(i+n<n*n) result.push(i+n);
        return result;
    }
    surrounded(cells,start) {
        const color=Math.sign(cells[start]),group=new Set([start]);
        for(const i of group) for(const j of this.neighbors(i)) {
            if(!cells[j]) return null;
            if(Math.sign(cells[j])===color) group.add(j);
        }
        return group;
    }
    place(before,index,color,number) {
        if(before[index]) return null;
        const cells=before.slice();
        cells[index]=color*number;
        for(const j of this.neighbors(index)) {
            if(Math.sign(cells[j])!==-color) continue;
            const captured=this.surrounded(cells,j);
            if(captured) for(const k of captured) cells[k]=0;
        }
        return this.surrounded(cells,index)?null:cells;
    }
}

function mountEoingtiGibo(canvas) {
    if (!canvas) return;
    let game,record;
    try {
        if(canvas.dataset.sgfBytes) {
            const bytes=Uint8Array.from(atob(canvas.dataset.sgfBytes),c=>c.charCodeAt(0));
            canvas.textContent=decodeEoingtiSgf(bytes);
        }
        record=readEoingtiRecord(canvas.textContent);
        game=new EoingtiGame(record);}
    catch(error) {
        const msg=document.createElement('p');
        msg.textContent=error.message;
        canvas.replaceWith(msg);
        return;
    }
    const ctx=canvas.getContext('2d'),size=game.size;
    let index=game.frames.length-1,review=null,wood='kaya',coord=true,numbers=false;
    const texture=new Image();
    const stage=canvas.parentElement;
    canvas.tabIndex=0;
    let territory=null;
    const current=()=>review?.[review.length-1] || game.frames[index];
    function geometry(){
        const side=canvas.width,boardSide=side*(coord?.965:1),step=boardSide/size;
        return {side,boardSide,step,first:step/2};
    }
    function draw() {
        const {side,boardSide,step,first}=geometry();
        const walnut=wood==='walnut';
        ctx.fillStyle='white';ctx.fillRect(0,0,side,side);
        ctx.fillStyle=walnut?'#704b31':'#e5c598';ctx.fillRect(0,0,boardSide,boardSide);
        if(texture.naturalWidth) ctx.drawImage(texture,walnut?250:0,0,250,400,0,0,boardSide,boardSide);
        ctx.strokeStyle=walnut?'#e8cfaa':'#604630';ctx.lineWidth=Math.max(0.7,side/850);
        ctx.beginPath();
        for(let i=0;i<size;i++){
            const p=first+i*step;
            ctx.moveTo(first,p);ctx.lineTo(boardSide-first,p);
            ctx.moveTo(p,first);ctx.lineTo(p,boardSide-first);
        }
        ctx.stroke();ctx.fillStyle=ctx.strokeStyle;
        if([9,13,19].includes(size)){
            const offset=size===9?2:3,center=(size-1)/2;
            for(const x of [offset,center,size-1-offset]) for(const y of [offset,center,size-1-offset]){
                if(size===9 && (x===center)!==(y===center)) continue;
                ctx.beginPath();ctx.arc(first+x*step,first+y*step,step*.084,0,Math.PI*2);ctx.fill();
            }
        }
        ctx.textAlign='center';ctx.textBaseline='middle';
        if(coord){
            ctx.fillStyle='#1e2936';ctx.font='500 '+Math.max(7,side*.017)+'px system-ui';
            for(let i=0;i<size;i++){
                const p=first+i*step, edge=(side+boardSide)/2;
                ctx.fillText(String.fromCharCode(65+i),p,edge);
                ctx.fillText(String(i+1),edge,p);
            }
        }
        const frame=current();
        if(territory && !review) territory.forEach((value,i)=>{
            if(frame.cells[i] || Math.abs(value)<25) return;
            const x=first+(i%size)*step,y=first+Math.floor(i/size)*step;
            ctx.save();ctx.globalAlpha=Math.abs(value)/100;
            ctx.fillStyle=value>0?'#141820':'#fff';ctx.strokeStyle='#68717b';
            ctx.fillRect(x-step*.17,y-step*.17,step*.34,step*.34);
            ctx.strokeRect(x-step*.17,y-step*.17,step*.34,step*.34);ctx.restore();
        });
        frame.cells.forEach((v,i)=>{
            if(!v) return;
            const x=first+(i%size)*step,y=first+Math.floor(i/size)*step;
            const sprite=eoingtiStoneSprite(Math.max(3,Math.round(step)),v>0);
            ctx.drawImage(sprite,x-step/2,y-step/2,step,step);
            ctx.fillStyle=v>0?'white':'#141920';
            if(numbers && Math.abs(v)!==2147483647){
                ctx.font='600 '+step*(Math.abs(v)>99?.35:.43)+'px system-ui';ctx.fillText(String(Math.abs(v)),x,y);
            }else if(i===frame.last){
                ctx.beginPath();ctx.arc(x,y,step*.12,0,Math.PI*2);ctx.fill();
            }
        });
    }
    const board={
        get index(){return index;},get total(){return game.frames.length-1;},
        move(delta){index=Math.min(this.total,Math.max(0,index+delta));this.onPosition?.();draw();},
        get moveCaption(){
            if (!index || review) return '';
            const {last,next,cells}=game.frames[index], side=next===1?'백':'흑';
            if(last<0)return side+'이 한 수 쉬었습니다.';
            const previous=game.frames[index-1].cells;
            let captured=0;
            previous.forEach((v,i)=>{if(Math.sign(v)===next && cells[i]===0) captured++;});
            const at=String.fromCharCode(65+last%size)+(Math.floor(last/size)+1);
            return side+' '+index+'수, '+at+'에 착수했습니다.'+(captured?' 상대 돌 '+captured+'점을 따냈습니다.':'');
        },
        get reviewing(){return review!==null;},
        setTerritory(points){territory=points;draw();},
        setWood(name){wood=name;draw();},setCoordinates(on){coord=on;draw();},
        setNumbers(on){numbers=on;draw();},
        setReview(on){review=on?[game.frames[index]]:null;this.onPosition?.();draw();},
        get canUndo(){return review && review.length>1;},
        undoReview(){if(this.canUndo){review.pop();draw();}},
        ResizeBoard(w,h){canvas.width=w;canvas.height=h;draw();}
    };
    canvas.setAttribute('aria-label','어잉티 기보 바둑판');
    canvas.addEventListener('click',event=>{
        if(!review) return;
        const rect=canvas.getBoundingClientRect(),{step}=geometry();
        const x=Math.floor((event.clientX-rect.left)*canvas.width/rect.width/step);
        const y=Math.floor((event.clientY-rect.top)*canvas.height/rect.height/step);
        if(x<0||y<0||x>=size||y>=size) return;
        const prev=current(),at=y*size+x;
        const cells=game.place(prev.cells,at,prev.next,index+review.length);
        if(!cells) return;
        const ko=review.length>1?review[review.length-2]:game.frames[index-1];
        if(ko && cells.every((v,i)=>Math.sign(v)===Math.sign(ko.cells[i]))) return;
        review.push({cells,last:at,next:-prev.next});draw();board.onStone();
    });
    texture.onload=draw;
    texture.src=canvas.dataset.resources+'board.png?ver=kaya26';
    mountGiboControls(board,canvas);
    if(stage.closest('.gibo-detail-player')) mountGiboDisplay(board,canvas);
    const observer=new ResizeObserver(()=>{
        const side=Math.floor(Math.min(stage.clientWidth,stage.clientHeight));
        if(side>0 && canvas.width!==side) board.ResizeBoard(side,side);
    });
    observer.observe(stage);draw();
    return {board,record};
}
if (typeof module !== 'undefined' && module.exports) module.exports = {readEoingtiRecord,EoingtiGame};
