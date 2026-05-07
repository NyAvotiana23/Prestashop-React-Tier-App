import {
    cleanEmptyFields,
    isNumericString,
    parseCsvBoolean,
    parseCsvList,
    parseCsvNumber,
    slugify,
    toLanguageNodes,
} from "../csvImportUtils.js";

export const CUSTOMERS_CSV_FIELD_MAP = {
    "id": "id",
    "Password": "passwd",
    "Last Name": "lastname",
    "First Name": "firstname",
    "Email": "email",
};

export function mapCustomerRowToPayload(row, options = {}) {
    const languageIds = options.languageIds ?? ["1"];
    const decimalSeparator = options.decimalSeparator ?? ".";
    const defaultCategoryId = options.defaultCategoryId ?? "1";


    const passwd = row["Password"].trim() ?? "";
    const lastname = row["Last Name"].trim() ?? "";
    const firstname = row["First Name"].trim() ?? "";
    const email = row["Email"].trim() ?? "";


    const payload = {
        customer: {
            passwd: passwd,
            lastname: lastname,
            firstname: firstname,
            email: email
        },
    };

    return cleanEmptyFields(payload);
}

