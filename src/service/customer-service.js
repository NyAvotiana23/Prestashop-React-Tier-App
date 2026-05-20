import {getFirstId} from "../csv/mappings/csvMappingUtils.js";
import {getList} from "../api/prestashopCrud.js";


function normalizeAddresses (data) {
    return data?.addresses?.address ?? [];
}
export async function getFirstCustomerAddress (customerId) {
    const addressResponse =  await getList("addresses", {
        filters: {
            id_customer: customerId,
        }
    });

    const addressesData = normalizeAddresses(addressResponse?.data);
    if (addressesData.length > 0) {
        return addressesData[0];
    }
    return null;

}