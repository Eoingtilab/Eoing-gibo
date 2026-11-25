/* 어잉티기보플레이어 · 개발: 어잉티연구소 (Eoingtilab) */
function renderGiboRecordInfo(container,record) {
    const data=record.metadata, legacy=!!(data.LI || data.RD || data.LC || data.LT);
    const groups=[
        ['대국 정보',{GN:'기보명',EV:'대회',...(legacy?{TE:'대회',RD:'일시'}:{}),RO:'라운드',DT:'일시',PC:'장소',ON:'포석',GC:'대국 설명',C:'기보 첫 해설'}],
        ['대국자',{PB:'흑 선수',BR:'흑 기력',BT:'흑 소속',PW:'백 선수',WR:'백 기력',WT:'백 소속',RE:'결과'}],
        ['대국 조건',{RU:'대국 규칙',KM:'덤',...(legacy?{KO:'덤',LI:'바둑판 크기',LT:'초읽기 시간',LC:'초읽기 횟수'}:{}),HA:'접바둑 돌 수',SZ:'바둑판 크기',TM:'제한시간',OT:'초읽기',PL:'먼저 둘 차례',AB:'흑 배치',AW:'백 배치',AE:'빈자리 지정'}],
        ['기록 정보',{AN:'해설자',US:'기록자',SO:'출처',CP:'저작권',AP:'제작 프로그램',CA:'파일 문자셋',FF:'SGF 버전',GM:'게임 종류',ST:'변화도 표시 방식'}]
    ];
    container.replaceChildren();
    container.setAttribute('aria-label','기보 정보');
    for(const [label,keys] of groups) {
        const entries=Object.entries(keys).filter(([key])=>data[key]?.length);
        if(!entries.length)continue;
        const original=label==='기록 정보';
        const group=document.createElement(original?'details':'section');
        if(label==='대국 조건')group.className='gibo-game-conditions';
        const heading=document.createElement(original?'summary':'h3');
        heading.textContent=label;
        const fields=document.createElement('dl');
        for(const [key,name] of entries){
            const term=document.createElement('dt'), value=document.createElement('dd');
            if(key==='PB' || key==='PW'){
                const stone=document.createElement('span');
                stone.className='gibo-info-stone '+(key==='PB'?'black':'white');
                stone.setAttribute('role','img');
                stone.setAttribute('aria-label',name);
                term.append(stone);
            } else term.textContent=name;
            const raw=data[key].join(' · ');
            value.textContent=(key==='TM' && !legacy && /^\d+(?:\.\d+)?$/.test(raw))?raw+'초':raw;
            fields.append(term,value);
        }
        group.append(heading,fields);
        container.append(group);
    }
    container.hidden=container.children.length===0;
}
