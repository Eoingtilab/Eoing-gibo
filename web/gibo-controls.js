/* 어잉티기보플레이어 · 개발: 어잉티연구소 (Eoingtilab) */
function mountGiboControls(board, canvas) {
    const tools = document.createElement('div');
    tools.className = 'gibo-tools';
    const group = label => {
        const element = document.createElement('div');
        element.setAttribute('role', 'group');
        element.setAttribute('aria-label', label);
        tools.append(element);
        return element;
    };
    const timeline = group('재생 위치');
    timeline.className = 'gibo-timeline';
    const seek = document.createElement('input');
    seek.type = 'range';
    seek.min = 0;
    seek.value = 0;
    seek.setAttribute('aria-label','착수 위치');
    const position = document.createElement('span');
    const duration = document.createElement('span');
    timeline.append(position, seek, duration);
    const moves = group('착수 이동');
    const modes = group('바둑판 표시');
    moves.className = 'gibo-transport';
    modes.className = 'gibo-options';
    const play = document.createElement('button');
    play.type = 'button';
    play.className = 'gibo-play';
    let timer = null;
    function playback(active) {
        clearInterval(timer);
        timer = null;
        play.dataset.playing = String(active);
        play.title = active ? '일시정지' : '재생';
        play.setAttribute('aria-label',play.title);
        if (active) timer = setInterval(() => {
            const before = board.index;
            board.move(1);
            if (board.index > before) playStone();
            sync();
            if (board.index === before || Number(seek.value) >= Number(seek.max)) playback(false);
        }, 1000);
    }
    function sync() {
        const total = Math.max(0,board.total);
        const current = (board.total === 0) ? 0 : board.index;
        seek.max = total;
        seek.value = current;
        position.textContent = current + '수';
        duration.textContent = total + '수';
        seek.setAttribute('aria-valuetext',current+'수');
    }
    play.onclick = () => {
        if ((board.total === 0)) return;
        if (timer === null && Number(seek.value) >= Number(seek.max)) board.move(-board.total);
        sync();
        playback(timer === null);
    };
    seek.oninput = () => {
        playback(false);
        if (!(board.total === 0)) board.move(Number(seek.value)-board.index);
        sync();
    };
    playback(false);
    document.addEventListener('visibilitychange', () => { if (document.hidden) playback(false); });
    window.addEventListener('pagehide', () => playback(false), {once:true});
    const steps = [[-999,'첫 수'],[-5,'5수 전'],[-1,'한 수 전'],[1,'한 수 후'],[5,'5수 후'],[999,'마지막 수']];
    for (const [step, label] of steps) {
        const button = document.createElement('button');
        button.type = 'button';
        button.title = label;
        button.setAttribute('aria-label',label);
        const icon = document.createElementNS('http://www.w3.org/2000/svg','svg');
        icon.setAttribute('viewBox','0 0 20 20');
        icon.setAttribute('aria-hidden','true');
        const path = document.createElementNS(icon.namespaceURI,'path');
        path.setAttribute('d','M7 4l6 6-6 6'+(Math.abs(step)===999?' M16 4v12':''));
        path.setAttribute('fill','none');
        path.setAttribute('stroke','currentColor');
        path.setAttribute('stroke-width','1.8');
        if (step<0) path.setAttribute('transform','translate(20 0) scale(-1 1)');
        icon.append(path);
        button.append(icon);
        if (Math.abs(step)===5) button.append('5');
        button.onclick = () => {
            playback(false);
            const before = Number(seek.value);
            board.move(Math.abs(step)===999 ? Math.sign(step)*board.total : step);
            sync();
            if (step === 1 && Number(seek.value) > before) playStone();
        };
        if (step === 1) moves.append(play);
        moves.append(button);
    }
    const undo = document.createElement('button');
    undo.type = 'button';
    undo.textContent = '한 수 무르기';
    undo.style.display = 'none';
    undo.onclick = () => { board.undoReview(); undo.disabled = !board.canUndo; };
    for (const [mode,label,initial] of [['review','놓기',false],['number','수순',false],['coord','좌표',true]]) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = label;
        button.dataset.mode = mode;
        button.setAttribute('aria-pressed',String(initial));
        button.onclick = () => {
            const on = button.getAttribute('aria-pressed') !== 'true';
            if (mode === 'coord') board.setCoordinates(on);
            if (mode === 'number') board.setNumbers(on);
            if (mode === 'review') {
                playback(false);
                board.setReview(on);
                undo.style.display = on ? '' : 'none';
                undo.disabled = true;
                seek.disabled = on;
                sync();
                for (const move of moves.children) move.disabled = on;
            }
            button.setAttribute('aria-pressed',String(on));
        };
        modes.append(button);
    }
    modes.append(undo);
    const woodToggle = document.createElement('button');
    woodToggle.type = 'button';
    woodToggle.className = 'gibo-wood';
    woodToggle.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><g class="sun"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M19 5l-1.5 1.5m-11 11L5 19"/></g><path class="moon" d="M20.5 14A8.8 8.8 0 0 1 10 3.5 9 9 0 1 0 20.5 14Z"/></svg>';
    let wood = 'kaya';
    try { if (localStorage.getItem('gibo-wood') === 'walnut') wood = 'walnut'; } catch {}
    function showWood() {
        board.setWood(wood);
        woodToggle.dataset.wood = wood;
        woodToggle.title = wood === 'kaya' ? '어두운 바둑판으로 전환' : '밝은 바둑판으로 전환';
        woodToggle.setAttribute('aria-label', woodToggle.title);
    }
    showWood();
    woodToggle.onclick = () => {
        wood = wood === 'kaya' ? 'walnut' : 'kaya';
        showWood();
        try { localStorage.setItem('gibo-wood', wood); } catch {}
    };
    modes.append(woodToggle);
    const sound = document.createElement('button');
    sound.type = 'button';
    sound.setAttribute('aria-label', '착수음');
    sound.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 9h4l5-4v14l-5-4H3z"/><path class="sound-muted" d="m16 10 5 5m0-5-5 5"/><path class="sound-on" d="M16 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/></svg>';
    const click = new Audio(canvas.dataset.resources + 'stone-pachi-1.mp3');
    let audible = false;
    try { audible = localStorage.getItem('gibo-sound') === 'on'; } catch {}
    function updateSound() {
        sound.setAttribute('aria-pressed', String(audible));
        sound.title = audible ? '착수음 끄기' : '착수음 켜기';
        sound.querySelector('.sound-muted').style.display = audible ? 'none' : '';
        sound.querySelector('.sound-on').style.display = audible ? '' : 'none';
    }
    sound.onclick = () => {
        audible = !audible;
        if (!audible) click.pause();
        try { localStorage.setItem('gibo-sound', audible ? 'on' : 'off'); } catch {}
        updateSound();
    };
    updateSound();
    modes.append(sound);
    const printButton = document.createElement('button');
    printButton.type = 'button';
    printButton.className = 'gibo-print';
    printButton.setAttribute('aria-label', '기보 총보 인쇄');
    printButton.innerHTML = '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M7 8V3h10v5M7 17H4V9h16v8h-3"/><path d="M7 14h10v7H7zM17 11h1"/></svg>';
    printButton.title = '기보 총보 인쇄';
    printButton.onclick = () => printGameRecord(canvas);
    modes.append(printButton);
    function playStone() {
        if (!audible) return;
        click.currentTime = 0;
        click.play().catch(() => {});
    }
    // The engine signals an accepted placement here, including a variation in review mode.
    board.onStone = () => { undo.disabled = !board.canUndo; playStone(); };
    canvas.addEventListener('keydown', event => {
        if (seek.disabled || event.altKey || event.ctrlKey || event.metaKey) return;
        const delta = {ArrowLeft:-1, ArrowRight:1, Home:-board.total, End:board.total}[event.key];
        if (delta === undefined) return;
        event.preventDefault();
        playback(false);
        const before = board.index;
        board.move(delta);
        if (event.key === 'ArrowRight' && board.index > before) playStone();
        sync();
    });
    board.setCoordinates(true);
    board.setNumbers(false);
    (canvas.closest('.gibo-stage') || canvas).after(tools);
    sync();
}
