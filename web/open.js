let version=0, selectedAnalysis;
async function openRecord(){
    const request=++version, file=sgf.files[0],errorBox=document.querySelector('#error');
    errorBox.hidden=true;
    try{
        const bytes=file?await file.arrayBuffer():await (await fetch('examples/practice.sgf')).arrayBuffer();
        const text=decodeEoingtiSgf(bytes,encoding.value);
        const data=selectedAnalysis?JSON.parse(await selectedAnalysis.text()):file?null:await (await fetch('examples/practice.json')).json();
        if(request!==version)return;
        const frame=document.createElement('iframe');
        frame.title='기보 재생과 해설';
        frame.src='web/viewer.html';
        frame.onload=async()=>{
            if(request!==version)return;
            try{
                const win=frame.contentWindow,doc=win.document,c=doc.querySelector('canvas');
                const fields=win.readEoingtiRecord(text).fields;
                const title=fields.GN || fields.TE || file?.name || '대국 기보';
                doc.querySelector('h2').textContent=title;
                c.textContent=text;c.dataset.printInfo=JSON.stringify({title,name_b:fields.PB,name_w:fields.PW,result:fields.RE});
                new ResizeObserver(()=>{frame.style.height=doc.querySelector('main').offsetHeight+'px';}).observe(doc.querySelector('main'));
                const player=win.mountEoingtiGibo(c);
                if(player)await win.bindAnalysis(player,data,text,doc.querySelector('section'),doc.querySelector('#caption'));
            }catch(error){errorBox.textContent=error.message;errorBox.hidden=false;}
        };
        frame.allowFullscreen=true;
        viewer.replaceChildren(frame);
    }catch(error){errorBox.textContent=error.message;errorBox.hidden=false;}
}
sgf.onchange=()=>{selectedAnalysis=null;analysis.value='';openRecord();};
analysis.onchange=()=>{selectedAnalysis=analysis.files[0];openRecord();};
encoding.onchange=openRecord;
openRecord();
