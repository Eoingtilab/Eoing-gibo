/* 어잉티기보플레이어 · 개발: 어잉티연구소 (Eoingtilab) */
// Print the main line from the original record, independent of the playback position.
function printGameRecord(canvas) {
    const {fields, events, size} = readEoingtiRecord(canvas.textContent);
    const points = Array.from({length:size * size}, () => []);
    const passes = [];
    let count = 0;
    function point(value) {
        if (!/^[a-z]{2}$/.test(value)) return null;
        const x = value.charCodeAt(0)-97, y = value.charCodeAt(1)-97;
        return x < size && y < size ? [x,y] : null;
    }
    for (const [key,value] of events) {
        if (key === "PL" || key === "AE") continue;
        const setup = key.startsWith('A');
        const stone = {black:key.endsWith('B'), number:setup ? '' : ++count};
        const [start,end] = value.split(':');
        const a = point(start), b = point(setup && end ? end : start);
        if (!a || !b) {
            if (!setup && (!value || (value === 'tt' && size <= 19))) passes.push(stone);
            continue;
        }
        for (let y=a[1]; y<=b[1]; y++)
            for (let x=a[0]; x<=b[0]; x++) points[y*size+x].push(stone);
    }
    const escape = value => String(value || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const clean = value => value && !value.includes('\uFFFD') ? value : '';
    const info = JSON.parse(canvas.dataset.printInfo);
    const title = escape(info.title || clean(fields.GN) || '대국 기보');
    const alphabet = x => String.fromCharCode(65+x);
    const last = (size-1)*32;
    let svg = '<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="착수 번호를 표시한 총보" viewBox="-24 -22 '+(last+64)+' '+(last+64)+'">';
    for (let i=0; i<size; i++) {
        const n = i*32;
        svg += '<path d="M0 '+n+'H'+last+' M'+n+' 0V'+last+'" fill="none" stroke="#76808b" stroke-width=".85"/>';
        svg += '<g fill="#485461" font-size="11"><text x="'+n+'" y="'+(last+31)+'">'+alphabet(i)+'</text><text x="'+(last+29)+'" y="'+(n+4)+'">'+(i+1)+'</text></g>';
    }
    if ([9,13,19].includes(size)) {
        const offset = size === 9 ? 2 : 3;
        for (const x of [offset,(size-1)/2,size-1-offset])
            for (const y of [offset,(size-1)/2,size-1-offset])
                if (size !== 9 || (x===4)===(y===4)) svg += '<circle cx="'+x*32+'" cy="'+y*32+'" r="2.5"/>';
    }
    const notes = [];
    function moveLabel(stone) {
        return (stone.black ? '흑 ' : '백 ') + (stone.number || '배치돌');
    }
    points.forEach((stones,index) => {
        if (!stones.length) return;
        const x=index%size, y=Math.floor(index/size), stone=stones[0];
        svg += '<g transform="translate('+x*32+' '+y*32+')"><circle r="15" fill="'+(stone.black?'#151b23':'white')+'" stroke="#202832"/><text y="4.6" font-size="'+(stone.number>=100?12.5:14)+'" font-weight="650" fill="'+(stone.black?'white':'#151b23')+'">'+stone.number+'</text></g>';
        if (stones.length>1) notes.push('<li><b>'+alphabet(x)+(y+1)+'</b> '+stones.map(moveLabel).join(' → ')+'</li>');
    });
    if (passes.length) notes.push('<li><b>패스</b> '+passes.map(moveLabel).join(', ')+'</li>');
    svg += '</svg>';
    const details = [['대국일',clean(fields.DT || fields.RD)],['덤',clean(fields.KM || fields.KO)],['결과',info.result || clean(fields.RE)]]
        .filter(([,value])=>value).map(([key,value])=>'<div><dt>'+key+'</dt><dd>'+escape(value)+'</dd></div>').join('');
    const frame = document.createElement('iframe');
    document.querySelector('.gibo-print-frame')?.remove();
    frame.className='gibo-print-frame';
    frame.setAttribute('aria-hidden','true');
    frame.style.cssText='position:fixed;left:-200vw;top:0;width:210mm;height:297mm;border:0;pointer-events:none';
    document.body.append(frame);
    const sheet = frame.contentDocument;
    sheet.open();
    sheet.write('<!doctype html><html lang="ko"><meta charset="utf-8"><title>'+title+' · 어잉티기보플레이어</title><style>'+
        '@page{size:A4 portrait;margin:14mm 16mm}*{box-sizing:border-box}body{margin:0;color:#192b42;font:10pt/1.5 "Malgun Gothic",sans-serif}header{display:flex;justify-content:space-between;align-items:baseline;border-bottom:2px solid #193553;padding-bottom:2mm;font-weight:700}header span{font-size:9pt;font-weight:500}h1{text-align:center;font-size:18pt;line-height:1.3;margin:6mm 0 3mm;overflow-wrap:anywhere}.players{display:flex;align-items:center;justify-content:center;gap:9mm;font-size:12pt;font-weight:650}.players i{display:inline-block;width:10px;height:10px;border:1px solid #182330;border-radius:100%;margin-right:5px}.black{background:#182330;print-color-adjust:exact}dl{display:flex;flex-wrap:wrap;justify-content:center;gap:2mm 8mm;margin:3mm 0 4mm;padding-bottom:4mm;border-bottom:1px solid #bdc6cf}dl div{display:flex;gap:2mm}dt{color:#526275}dd{margin:0;font-weight:600}svg{display:block;width:100%;max-width:170mm;margin:auto;text-anchor:middle;break-inside:avoid}section{border-top:1px solid #bdc6cf;padding-top:3mm}h2{font-size:10pt;margin:0 0 1mm}ul{list-style:none;padding:0;margin:0;display:flex;flex-wrap:wrap;gap:1mm 6mm}li{break-inside:avoid}li b{margin-right:1mm}.wordmark{display:inline-flex;align-items:center;gap:2.5mm;font-size:14pt;letter-spacing:-.06em}.wordmark i{width:12px;height:12px;background:#192b42;border-radius:50%;box-shadow:7px -3px 0 -1px white,7px -3px 0 0 #192b42;margin-right:6px;print-color-adjust:exact}header{border-bottom-width:1.5pt}header span{font-variant-numeric:tabular-nums}footer{display:flex;align-items:baseline;justify-content:space-between;margin-top:5mm;padding-top:2.5mm;border-top:1px solid #9aa9b7;color:#4c5c6e;font-size:8.5pt;break-inside:avoid}footer strong{color:#192b42;font-weight:700}</style>'+
        '<header><strong class="wordmark"><i aria-hidden="true"></i>어잉티기보플레이어</strong><span>총보 · '+(count?'1–'+count+'수':'배치도')+'</span></header><h1>'+title+'</h1><div class="players"><span><i class="black"></i>흑　'+escape(info.name_b || clean(fields.PB) || '미상')+'</span><span><i></i>백　'+escape(info.name_w || clean(fields.PW) || '미상')+'</span></div><dl>'+details+'</dl>'+svg+(notes.length?'<section><h2>중복 착점·패스</h2><ul>'+notes.join('')+'</ul></section>':'')+'<footer><span>대한바둑협회 기보 자료실</span><strong>제작　어잉티연구소</strong></footer></html>');
    sheet.close();
    const win=frame.contentWindow;
    win.addEventListener('afterprint',()=>frame.remove(),{once:true});
    win.focus();
    win.print();
}
