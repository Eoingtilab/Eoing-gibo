function renderGiboRecordInfo(container,record) {
    const data=record.metadata, legacy=!!(data.LI || data.RD || data.LC || data.LT);
    const groups=[
        ['대국 정보',{GN:'기보명',EV:'대회명',...(legacy?{TE:'대회명',RD:'대국일'}:{}),RO:'라운드',DT:'대국일',PC:'대국 장소',RE:'대국 결과',ON:'포석',GC:'대국 설명',C:'기보 첫 해설'}],
        ['대국자',{PB:'흑 선수',BR:'흑 기력',BT:'흑 소속',PW:'백 선수',WR:'백 기력',WT:'백 소속'}],
        ['대국 조건',{RU:'대국 규칙',KM:'덤',...(legacy?{KO:'덤',LI:'바둑판 크기',LT:'초읽기 시간',LC:'초읽기 횟수'}:{}),HA:'접바둑 돌 수',SZ:'바둑판 크기',TM:'제한시간',OT:'초읽기',PL:'먼저 둘 차례',AB:'흑 배치',AW:'백 배치',AE:'빈자리 지정'}],
        ['기록 정보',{AN:'해설자',US:'기록자',SO:'출처',CP:'저작권',AP:'제작 프로그램',CA:'파일 문자셋',FF:'SGF 버전',GM:'게임 종류',ST:'변화도 표시 방식'}]
    ];
    const listed=new Set();
    for(const [,labels] of groups) for(const key of Object.keys(labels)) listed.add(key);
    const extra=Object.create(null);
    for(const key of Object.keys(data)) if(!listed.has(key)) extra[key]=key;
    groups.push(['기타 원본 항목',extra]);
    container.replaceChildren();
    const title=document.createElement('h3');title.textContent='기보 정보';container.append(title);
    for(const [label,keys] of groups) {
        const entries=Object.entries(keys).filter(([key])=>data[key]?.length);
        if(!entries.length)continue;
        const table=document.createElement('table');
        table.className='table table-bordered table-vertical';
        const caption=table.createCaption();caption.textContent=label;
        const tbody=table.createTBody();
        for(const [key,name] of entries) {
            const tr=tbody.insertRow(),th=document.createElement('th');
            th.scope='row';th.textContent=name;tr.append(th);
            const raw=data[key].join(' · ');
            const td=tr.insertCell();
            td.textContent=(key==='TM' && !legacy && /^\d+(?:\.\d+)?$/.test(raw))?raw+'초':raw;
        }
        container.append(table);
    }
    container.hidden=!container.querySelector('table');
}
