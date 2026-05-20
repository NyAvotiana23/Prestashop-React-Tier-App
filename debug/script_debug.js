export function parseAchat(value) {
    if (!value) return [];

    const unescaped = String(value).replaceAll('""', '"').trim();
    if (!unescaped.startsWith("[") || !unescaped.endsWith("]")) return [];

    const content = unescaped.slice(1, -1).trim();
    if (!content) return [];

    return content
        .split(",")
        .map((tuple) => {
            const clean = tuple.replaceAll("(", "").replaceAll(")", "");
            const [ref, qty, variant] = clean.split(";");
            const quantity = Number(qty);
            return {
                reference: ref?.replaceAll('"', "").trim(),
                quantity: Number.isFinite(quantity) ? quantity : 1,
                variant: (variant ?? "").replaceAll('"', "").trim(),
            };
        })
        .filter((item) => item?.reference);
}

function combineDuplicate (achat, achats) {
    const result = {
        reference: achat.reference,
        quantity: 0,
        variant: achat.variant,
    };

    for (const a of achats) {
        if (a.reference === achat.reference && a.variant === achat.variant) {
            result.quantity += a.quantity;
        }
    }
    return result;
}
function ensureNoDuplicateAchat (achats) {
    const  result = [];
    const treated = new Set();
    for (const achat of achats) {
        if (!treated.has(achat.reference)) {
            result.push(combineDuplicate(achat, achats));
            treated.add(achat.reference);
        }
    }
   return result;
}

console.log(parseAchat(`[(""T_01"";2;""kely""),(""C_03"";1;"""")]`));
console.log(ensureNoDuplicateAchat(parseAchat(`[(""T_01"";2;""kely""),(""T_01"";5;""kely""),(""C_03"";1;"""")]`)))