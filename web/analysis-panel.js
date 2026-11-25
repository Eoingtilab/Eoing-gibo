/* 어잉티기보플레이어 · 개발: 어잉티연구소 (Eoingtilab) */
async function bindAnalysis(player, data, source, canvas) {
    const {board,record}=player;
    let turns=null, territory=false;
    const detail=canvas.closest('.gibo-detail-player');
    const panel=document.createElement('aside');
    panel.className='gibo-analysis-panel';
    panel.innerHTML='<strong>AI 승부예측</strong><output><b></b><b></b></output><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="흑 승률 추이"><defs><linearGradient id="gibo-fill" x2="0" y2="1" gradientUnits="objectBoundingBox"><stop stop-color="#3289ae" stop-opacity=".32"/><stop offset="1" stop-color="#3289ae" stop-opacity=".02"/></linearGradient></defs><polygon fill="url(#gibo-fill)"/><line stroke-dasharray="3 4" x1="0" x2="100" y1="50" y2="50" stroke="#a5b3c4"/><polyline fill="none" stroke-linejoin="round" stroke="#19678b" stroke-width="2"/><line class="cursor" y1="0" y2="100" stroke="#172d53"/></svg>';
    const caption=document.createElement('p');
    const button=document.createElement('button');
    button.type='button';
    button.textContent='형세';
    button.setAttribute('aria-pressed','false');
    let cinema;
    if(detail){
        const layout=document.createElement('div'),column=document.createElement('div');
        layout.className='gibo-review-layout';
        detail.before(layout);
        layout.append(column,panel);
        column.append(detail);
        const subtitles=document.createElement('section');
        subtitles.className='gibo-subtitles';
        const heading=document.createElement('h4');
        heading.textContent='해설 자막';
        subtitles.append(heading,caption);
        const forecast=document.createElement('div');
        forecast.className='gibo-forecast';
        forecast.append(...Array.from(panel.children));
        panel.append(forecast,subtitles);
        const info=layout.parentElement.querySelector('.gibo-record-info');
        if(info)layout.prepend(info);
        column.className='gibo-board-column';
        cinema=document.createElement('div');
        cinema.className='gibo-film-caption';
        detail.querySelector('.gibo-stage').append(cinema);
        new ResizeObserver(([entry])=>{
            layout.classList.toggle('is-wide',entry.contentRect.width>=840);

        }).observe(layout);
    }
    const summary=panel.querySelector('output'), chart=panel.querySelector('svg');

    if(data) {
        const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(source.replace(/\r\n?/g,'\n')))),v=>v.toString(16).padStart(2,'0')).join('');
        if(data.hash!==hash || data.size!==record.size || data.turns?.length!==board.total+1 ||
            !data.turns.every(t=>t && t.blackWin>=0 && t.blackWin<=1 && Number.isFinite(t.blackWin) && Number.isFinite(t.blackLead) &&
            Array.isArray(t.ownership) && t.ownership.length===record.size**2 && t.ownership.every(v=>Number.isFinite(v) && Math.abs(v)<=100))) {
            throw Error('분석 파일과 현재 기보가 일치하지 않습니다.');
        }
        turns=data.turns;
        canvas.closest('.gibo-stage').parentElement.querySelector('[data-mode=review]').after(button);
        chart.querySelector('polyline').setAttribute('points',turns.map((t,i)=>[100*i/Math.max(1,board.total),100*(1-t.blackWin)].join(',')).join(' '));
    }
    if(turns){
        const points=chart.querySelector('polyline').getAttribute('points');
        chart.querySelector('polygon').setAttribute('points','0,100 '+points+' 100,100');
    }
    for(const node of panel.querySelectorAll("strong,output,svg")) node.hidden=!turns;
    const leadText=t=>Math.abs(t.blackLead)<0.05?'예상 집 차이는 0집입니다.':
        (t.blackLead>0?'흑이':'백이')+' 약 '+Math.abs(t.blackLead).toFixed(1)+'집 앞섭니다.';
    function update(){
        const t=turns?.[board.index], enabled=!!t && !board.reviewing;
        const comment=board.reviewing?'':record.comments[board.index];
        chart.style.display=enabled?"":"none";
        button.disabled=!enabled;
        const [black,white]=summary.children;
        black.textContent=enabled?'흑 '+(100*t.blackWin).toFixed(1)+'%':board.reviewing?'놓아보기 중':'';
        white.textContent=enabled?'백 '+(100*(1-t.blackWin)).toFixed(1)+'%':'';
        chart.setAttribute('aria-label',board.index+'수 흑 승률 추이, 중앙 점선은 50%');

        const pointer=100*board.index/Math.max(1,board.total);
        for(const key of ['x1','x2']) chart.querySelector('.cursor').setAttribute(key,pointer);
        caption.textContent='';
        if(comment) caption.textContent='기보 해설 · '+comment;
        else if(enabled){
            const prev=turns[board.index-1],change=prev?100*(t.blackWin-prev.blackWin):0;
            caption.textContent='AI 해설 · '+board.index+'수 현재 '+leadText(t)+(Math.abs(change)>=5?' 직전 수보다 흑 승률이 '+Math.abs(change).toFixed(1)+'%p '+(change>0?'올랐습니다.':'내렸습니다.'):'');
        }
        else if(!board.reviewing && board.moveCaption) caption.textContent='착수 해설 · '+board.moveCaption;
        if(cinema)cinema.textContent=caption.textContent.replace(/^(기보 해설|AI 해설|착수 해설) · /,"");
        panel.hidden=!turns && !caption.textContent;
        board.setTerritory(enabled && territory?t.ownership:null);
    }
    chart.onclick=e=>{
        if(!turns||board.reviewing)return;
        const r=chart.getBoundingClientRect(),n=Math.round((e.clientX-r.left)*board.total/r.width);
        const seek=document.querySelector('.gibo-timeline input');seek.value=n;seek.dispatchEvent(new Event('input'));
    };
    button.onclick=()=>{territory=!territory;button.setAttribute('aria-pressed',String(territory));update();};
    board.onPosition=update;
    update();
}
