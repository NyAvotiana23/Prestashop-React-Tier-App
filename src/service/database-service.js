import {resetDatabase} from "../api/prestashopCrud.js";

export async function resetDatabaseResources(refs, options = {}) {
    return resetDatabase(refs, options);
}

