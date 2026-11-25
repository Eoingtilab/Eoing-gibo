function mountGiboDisplay(app, canvas) {
    const stage = canvas.parentElement;
    const player = stage.parentElement;
    const options = player.querySelector('.gibo-options');
    if (!options) {
        if (player.isConnected) requestAnimationFrame(() => mountGiboDisplay(app, canvas));
        return;
    }
    const actions = document.createElement('span');
    actions.className = 'gibo-display-actions';
    options.append(actions);
    function control(label, path) {
        const button = document.createElement('button');
        button.type = 'button';
        button.title = label;
        button.setAttribute('aria-label', label);
        button.innerHTML = '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + path + '</svg>';
        actions.append(button);
        return button;
    }
    const lens = '<circle cx="10" cy="10" r="6.5"/><path d="m15 15 6 6M7 10h6"/>';
    const smaller = control('축소', lens);
    const larger = control('확대', lens + '<path d="M10 7v6"/>');
    const expand = 'M3 9V3h6m6 0h6v6m0 6v6h-6m-6 0H3v-6';
    const collapse = 'M9 3v6H3m12-6v6h6m0 6h-6v6m-6 0v-6H3';
    const subtitles = control('해설 자막', '<rect x="2" y="5" width="20" height="14" rx="3"/><path d="M10 10a2.4 2.4 0 1 0 0 4m8-4a2.4 2.4 0 1 0 0 4"/>');
    function setSubtitles(enabled) {
        player.classList.toggle('captions-off', !enabled);
        subtitles.setAttribute('aria-pressed', String(enabled));
        subtitles.title = enabled ? '자막 끄기' : '자막 켜기';
    }
    let enabled = true;
    try { enabled = localStorage.getItem('gibo-captions') !== 'off'; } catch {}
    setSubtitles(enabled);
    subtitles.onclick = () => {
        enabled = !enabled;
        setSubtitles(enabled);
        try { localStorage.setItem('gibo-captions', enabled ? 'on' : 'off'); } catch {}
    };
    const full = control('전체화면', '<path d="' + expand + '"/>');
    const zoomStep = 120;
    let fallback = false;
    function availableWidth() {
        const layout = player.closest('.gibo-review-layout.is-wide');
        if (!layout) return player.parentElement.clientWidth;
        const gap = parseFloat(getComputedStyle(layout).columnGap);
        return Math.floor(layout.clientWidth - gap - 190);
    }
    function resize() {
        const active = player.classList.contains('is-full');
        const side = Math.floor(Math.min(stage.clientWidth, stage.clientHeight));
        if (side && side !== canvas.width) app.ResizeBoard(side, side);
        const available = availableWidth();
        smaller.disabled = active || side <= Math.min(240, available);
        larger.disabled = active || player.clientWidth >= available - 1;
        player.classList.toggle('is-large', side > 600);
    }
    function zoom(direction) {
        const available = availableWidth();
        const current = player.clientWidth / zoomStep;
        const next = direction > 0 ? Math.floor(current) + 1 : Math.ceil(current) - 1;
        const desired = Math.min(available, Math.max(240, next * zoomStep));
        const layout = player.closest('.gibo-review-layout.is-wide');
        if (layout) {
            const gap = parseFloat(getComputedStyle(layout).columnGap);
            const initial = Math.round((layout.clientWidth - gap) * 2 / 3);
            // Include the default two-thirds width as a stop in both directions.
            const crossesInitial = (player.clientWidth - initial) * (desired - initial) <= 0;
            if (player.clientWidth !== initial && crossesInitial) layout.style.removeProperty('--board-track');
            else layout.style.setProperty('--board-track', 'min(' + desired + 'px, calc(100% - ' + (190 + gap) + 'px))');
        } else player.style.setProperty('--reader-size', desired + 'px');
        resize();
    }
    smaller.onclick = () => zoom(-1);
    larger.onclick = () => zoom(1);
    function reflectFull() {
        const active = document.fullscreenElement === player || fallback;
        player.classList.toggle('is-full', active);
        full.title = active ? '전체화면 종료' : '전체화면';
        full.setAttribute('aria-label', full.title);
        full.setAttribute('aria-pressed', String(active));
        full.querySelector('path').setAttribute('d', active ? collapse : expand);
        resize();
    }
    full.onclick = async () => {
        if (document.fullscreenElement === player) await document.exitFullscreen();
        else if (fallback) fallback = false;
        else {
            try { await player.requestFullscreen(); }
            catch { fallback = true; }
        }
        reflectFull();
    };
    document.addEventListener('fullscreenchange', reflectFull);
    document.addEventListener('keydown', event => {
        if (fallback && event.key === 'Escape') { fallback = false; reflectFull(); }
    });
    new ResizeObserver(resize).observe(stage);
    resize();
}
