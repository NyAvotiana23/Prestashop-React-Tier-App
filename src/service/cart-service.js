import {createResource} from "../api/prestashopCrud.js";
import {getScalarValue} from "../utils/util-functions.js";

export async function createNewCart (cart) {
    let cartPayload = cart;
    if (!cart?.cart) {
        cartPayload = {
            "cart": cart
        }
    }
    const created = await createResource("carts", cartPayload);
    return getScalarValue(created?.data?.cart?.id);
}