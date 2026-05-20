// ─── Calcul helpers ─────────────────────────────────────────────────────────

import {getScalarValue} from "./util-functions";

/**
 * Format de retour commun :
 * { len, result, description }
 * - len : nombre d'elements dans la liste d'entree
 * - result : resultat (nombre, tableau, ou objet selon la fonction)
 * - description : description textuelle de l'operation
 */
function asNumber(value, fallback = 0) {
    const scalar = getScalarValue(value);
    const normalizedValue = scalar !== "" ? scalar : value;

    if (normalizedValue === null || normalizedValue === undefined || normalizedValue === "") return fallback;
    if (typeof normalizedValue === "number") return Number.isFinite(normalizedValue) ? normalizedValue : fallback;

    const normalized = String(normalizedValue).trim().replace("%", "").replace(",", ".");
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function getValue(item, accessor) {
    if (typeof accessor === "function") return accessor(item);
    if (!accessor) return undefined;

    const path = String(accessor).split(".");
    let current = item;
    for (const key of path) {
        if (current === null || current === undefined) return undefined;
        current = current[key];
    }
    return current;
}

function buildResult(list, result, description) {
    const len = Array.isArray(list) ? list.length : 0;
    return {len:len, result:result, description};
}

// ─── Basic aggregations ──────────────────────────────────────────────────────

/**
 * Somme des valeurs d'un attribut.
 * Exemple :
 *   sumBy([{ price: 10 }, { price: 5 }], "price")
 * Retour : { len: 2, result: 15, description: "Sum by price" }
 */
export function sumBy(list, accessor, options = {}) {
    const items = Array.isArray(list) ? list : [];
    const fallback = options.fallback ?? 0;

    const total = items.reduce((acc, item) => {
        const value = getValue(item, accessor);
        return acc + asNumber(value, fallback);
    }, 0);

    return buildResult(items, total, `Sum by ${String(accessor)}`);
}

/**
 * Somme des produits (multiplication de plusieurs attributs par item).
 * Exemple :
 *   sumByMultiply([{ qty: 2, price: 5 }], ["qty", "price"])
 * Retour : { len: 1, result: 10, description: "Sum of products by qty * price" }
 */
export function sumByMultiply(list, accessors, options = {}) {
    const items = Array.isArray(list) ? list : [];
    const fallback = options.fallback ?? 0;
    const keys = Array.isArray(accessors) ? accessors : [accessors];

    const total = items.reduce((acc, item) => {
        const product = keys.reduce((prod, key) => {
            const value = getValue(item, key);
            return prod * asNumber(value, fallback);
        }, 1);
        return acc + product;
    }, 0);

    return buildResult(items, total, `Sum of products by ${keys.map(String).join(" * ")}`);
}

/**
 * Minimum d'un attribut.
 * Exemple :
 *   minBy([{ price: 10 }, { price: 5 }], "price")
 * Retour : { len: 2, result: 5, description: "Min by price" }
 */
export function minBy(list, accessor) {
    const items = Array.isArray(list) ? list : [];
    let minValue = null;

    for (const item of items) {
        const value = asNumber(getValue(item, accessor), null);
        if (value === null) continue;
        if (minValue === null || value < minValue) minValue = value;
    }

    return buildResult(items, minValue, `Min by ${String(accessor)}`);
}

/**
 * Maximum d'un attribut.
 * Exemple :
 *   maxBy([{ price: 10 }, { price: 5 }], "price")
 * Retour : { len: 2, result: 10, description: "Max by price" }
 */
export function maxBy(list, accessor) {
    const items = Array.isArray(list) ? list : [];
    let maxValue = null;

    for (const item of items) {
        const value = asNumber(getValue(item, accessor), null);
        if (value === null) continue;
        if (maxValue === null || value > maxValue) maxValue = value;
    }

    return buildResult(items, maxValue, `Max by ${String(accessor)}`);
}

/**
 * Moyenne d'un attribut.
 * Exemple :
 *   avgBy([{ price: 10 }, { price: 5 }], "price")
 * Retour : { len: 2, result: 7.5, description: "Average by price" }
 */
export function avgBy(list, accessor) {
    const items = Array.isArray(list) ? list : [];
    if (!items.length) return buildResult(items, 0, `Average by ${String(accessor)}`);

    const total = sumBy(items, accessor).result;
    return buildResult(items, total / items.length, `Average by ${String(accessor)}`);
}

// ─── Sorting ─────────────────────────────────────────────────────────────────

/**
 * Tri par attribut (asc/desc). result contient la liste triee.
 * Exemple :
 *   sortBy([{ price: 10 }, { price: 5 }], "price", "asc")
 * Retour : { len: 2, result: [{price:5},{price:10}], description: "Sort by price (asc)" }
 */
export function sortBy(list, accessor, direction = "asc") {
    const items = Array.isArray(list) ? [...list] : [];
    const isDesc = String(direction).toLowerCase() === "desc";

    items.sort((a, b) => {
        const aVal = asNumber(getValue(a, accessor), 0);
        const bVal = asNumber(getValue(b, accessor), 0);
        return isDesc ? bVal - aVal : aVal - bVal;
    });

    return buildResult(items, items, `Sort by ${String(accessor)} (${isDesc ? "desc" : "asc"})`);
}

// ─── Grouping ────────────────────────────────────────────────────────────────

/**
 * Groupement par attribut. result contient un objet { cle: items[] }.
 * Exemple :
 *   groupBy([{ c:"A" }, { c:"B" }, { c:"A" }], "c")
 * Retour : { len: 3, result: { A:[...], B:[...] }, description: "Group by c" }
 */
export function groupBy(list, groupAccessor) {
    const items = Array.isArray(list) ? list : [];
    const groups = items.reduce((acc, item) => {
        const key = getValue(item, groupAccessor) ?? "__undefined__";
        const groupKey = String(key);
        if (!acc[groupKey]) acc[groupKey] = [];
        acc[groupKey].push(item);
        return acc;
    }, {});

    return buildResult(items, groups, `Group by ${String(groupAccessor)}`);
}

/**
 * Groupement + somme. result contient { cle: somme }.
 * Exemple :
 *   groupBySum([{ c:"A", v:2 }, { c:"A", v:3 }], "c", "v")
 * Retour : { len: 2, result: { A: 5 }, description: "Group by c and sum v" }
 */
export function groupBySum(list, groupAccessor, sumAccessor, options = {}) {
    const items = Array.isArray(list) ? list : [];
    const fallback = options.fallback ?? 0;

    const groups = items.reduce((acc, item) => {
        const key = getValue(item, groupAccessor) ?? "__undefined__";
        const groupKey = String(key);
        if (!acc[groupKey]) acc[groupKey] = 0;
        acc[groupKey] += asNumber(getValue(item, sumAccessor), fallback);
        return acc;
    }, {});

    return buildResult(items, groups, `Group by ${String(groupAccessor)} and sum ${String(sumAccessor)}`);
}

/**
 * Compte par groupe. result contient { cle: compteur }.
 * Exemple :
 *   countBy([{ c:"A" }, { c:"B" }, { c:"A" }], "c")
 * Retour : { len: 3, result: { A: 2, B: 1 }, description: "Count by c" }
 */
export function countBy(list, groupAccessor) {
    const items = Array.isArray(list) ? list : [];
    const counts = items.reduce((acc, item) => {
        const key = getValue(item, groupAccessor) ?? "__undefined__";
        const groupKey = String(key);
        acc[groupKey] = (acc[groupKey] ?? 0) + 1;
        return acc;
    }, {});

    return buildResult(items, counts, `Count by ${String(groupAccessor)}`);
}
