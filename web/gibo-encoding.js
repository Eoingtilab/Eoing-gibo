/* 어잉티기보플레이어 · 개발: 어잉티연구소 (Eoingtilab) */
// Decode the original bytes before the browser substitutes invalid UTF-8.
function decodeEoingtiSgf(input, override='auto') {
    const bytes=new Uint8Array(input);
    const decode=label=>new TextDecoder(label,{fatal:true}).decode(bytes);
    if (override!=='auto') return decode(override);
    if (bytes[0]===0xff && bytes[1]===0xfe) return decode('utf-16le');
    if (bytes[0]===0xfe && bytes[1]===0xff) return decode('utf-16be');
    if (bytes[0]===0xef && bytes[1]===0xbb && bytes[2]===0xbf) return decode('utf-8');
    if(bytes[0]===40 && bytes[1]===0) return decode('utf-16le');
    if(bytes[0]===0 && bytes[1]===40) return decode('utf-16be');
    const prefix=new TextDecoder('latin1').decode(bytes.subarray(0,8192));
    const declared=/\bCA\s*\[\s*([a-z0-9_.-]+)\s*\]/i.exec(prefix)?.[1]?.toLowerCase();
    const aliases={cp949:'euc-kr',uhc:'euc-kr',ms949:'euc-kr','windows-949':'euc-kr'};
    const label=aliases[declared] || declared;
    if(label && label!=='utf-8' && !/^(?:iso-8859-1|latin1|us-ascii)$/.test(label)){
        try{return decode(label);}catch{}
    }
    try{return decode('utf-8');}catch{}
    try{return decode('euc-kr');}catch{}
    if(label) try{return decode(label);}catch{}
    throw Error('SGF 문자 인코딩을 확인해 주세요.');
}
if (typeof module !== 'undefined' && module.exports) module.exports = {decodeEoingtiSgf};
