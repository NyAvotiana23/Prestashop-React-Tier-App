const value = "[(\"\"T_01\"\";2;\"\"kely\"\"),(\"\"C_03\"\";1;\"\"\"\")]"

function parseAchat(value) {
    if (!value) return [];

    // Unescape CSV double-quotes ("" → ")
    const unescaped = String(value).replaceAll('""', '"').trim();

    // Strip outer [ and ]
    const content = unescaped.slice(1, -1);

    // Split by , to get each tuple: ("T_01";3;"ngoza")
    const tuples = content.split(",");

    return tuples.map(tuple => {
        // Remove ( and ) at the edges
        const clean = tuple.replaceAll("(", "").replaceAll(")", "");

        // Split by ; to get the 3 parts: ref, qty, variant
        const [ref, qty, variant] = clean.split(";");

        return {
            reference: ref.replaceAll('"', "").trim(),
            quantity: Number(qty) || 1,
            variant: (variant ?? "").replaceAll('"', "").trim(),
        };
    }).filter(Boolean);
}

console.log(parseAchat(value));