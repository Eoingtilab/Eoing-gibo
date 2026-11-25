async function bindAnalysis(player, data, source, panel, caption) {
    const {board,record}=player;
    let turns=null, territory=false;
    const summary=panel.querySelector('output'), chart=panel.querySelector('svg');
    const button=panel.querySelector('button'), status=panel.querySelector('small');
    if(data) {
        const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(source.replace(/\r\n?/g,'\n')))),v=>v.toString(16).padStart(2,'0')).join('');
        if(data.hash!==hash || data.size!==record.size || data.turns?.length!==board.total+1 ||
            !data.turns.every(t=>t && t.blackWin>=0 && t.blackWin<=1 && Number.isFinite(t.blackWin) && Number.isFinite(t.blackLead) &&
            Array.isArray(t.ownership) && t.ownership.length===record.size**2 && t.ownership.every(v=>Number.isFinite(v) && Math.abs(v)<=100))) {
            throw Error('분석 파일과 현재 기보가 일치하지 않습니다.');
        }
        turns=data.turns;
        status.textContent='KataGo · '+data.rules+' · 덤 '+data.komi+' · 국면당 '+data.visits+'회 탐색';
        chart.querySelector('polyline').setAttribute('points',turns.map((t,i)=>[100*i/Math.max(1,board.total),100*(1-t.blackWin)].join(',')).join(' '));
    }
    const hasComments=record.comments.some(Boolean);
    const leadText=t=>Math.abs(t.blackLead)<0.05?'예상 집 차이는 0집입니다.':
        (t.blackLead>0?'흑이':'백이')+' 약 '+Math.abs(t.blackLead).toFixed(1)+'집 앞섭니다.';
    function update(){
        const t=turns?.[board.index], enabled=!!t && !board.reviewing;
        const comment=board.reviewing?'':record.comments[board.index];
        chart.hidden=!enabled;
        button.disabled=!enabled;
        summary.textContent=board.reviewing?'놓아보기 중':t?'흑 '+(100*t.blackWin).toFixed(1)+'%　백 '+(100*(1-t.blackWin)).toFixed(1)+'%':'이 기보의 AI 분석 파일을 열어 주세요.';
        const pointer=100*board.index/Math.max(1,board.total);
        for(const key of ['x1','x2']) chart.querySelector('.cursor').setAttribute(key,pointer);
        caption.textContent='';
        if(comment) caption.textContent='기보 해설 · '+comment;
        else if(enabled){
            const prev=turns[board.index-1],change=prev?100*(t.blackWin-prev.blackWin):0;
            caption.textContent='AI 해설 · '+board.index+'수 현재 '+leadText(t)+(Math.abs(change)>=5?' 직전 수보다 흑 승률이 '+Math.abs(change).toFixed(1)+'%p '+(change>0?'올랐습니다.':'내렸습니다.'):'');
        }
        else if(!board.reviewing && board.moveCaption) caption.textContent='착수 해설 · '+board.moveCaption;
        caption.hidden=!caption.textContent || subtitle.getAttribute('aria-pressed')==='false';
        board.setTerritory(enabled && territory?t.ownership:null);
    }
    chart.onclick=e=>{
        if(!turns||board.reviewing)return;
        const r=chart.getBoundingClientRect(),n=Math.round((e.clientX-r.left)*board.total/r.width);
        const seek=document.querySelector('.gibo-timeline input');seek.value=n;seek.dispatchEvent(new Event('input'));
    };
    button.onclick=()=>{territory=!territory;button.setAttribute('aria-pressed',String(territory));update();};
    const subtitle=document.createElement('button');
    subtitle.type='button';subtitle.textContent='해설 자막';subtitle.setAttribute('aria-pressed','true');
    document.querySelector('.gibo-options').append(subtitle);
    subtitle.onclick=()=>{subtitle.setAttribute('aria-pressed',String(subtitle.getAttribute('aria-pressed')!=='true'));update();};
    board.onPosition=update;
    panel.hidden=!data && hasComments;
    update();
}
