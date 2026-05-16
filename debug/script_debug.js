const defaultDateAdd = new Date().toLocaleString();

function getDateTimeString(date = new Date()) {
    const pad = (n) => String(n).padStart(2, '0');

    const YYYY = date.getFullYear();
    const MM   = pad(date.getMonth() + 1); // months are 0-indexed
    const DD   = pad(date.getDate());
    const HH   = pad(date.getHours());
    const min  = pad(date.getMinutes());
    const SS   = pad(date.getSeconds());

    return `${YYYY}-${MM}-${DD} ${HH}:${min}:${SS}`;
}




console.log(getDateTimeString());