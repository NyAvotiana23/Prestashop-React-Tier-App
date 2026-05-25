import {
    cleanEmptyFields,
    isNumericString,
    parseCsvBoolean,
    parseCsvList,
    parseCsvNumber,
    slugify,
    toLanguageNodes,
} from "../csvImportUtils.js";

const DEFAULT_GROUP_ID = "1";
const DEFAULT_TITLE_ID = "1";

const GROUP = ["VISITEUR", "INVITE", "CLIENT"];

export const CUSTOMERS_CSV_FIELD_MAP = {
    "id": "id",
    "Password": "passwd",
    "Last Name": "lastname",
    "First Name": "firstname",
    "Email": "email",
    "Active (0/1)": "active",
    "Title ID (Mr = 1, Ms = 2, else 0)": "id_gender",
    "Groupe ID(Visiteur = 1, Invite = 2, CLient = 3)": "id_default_group"


};

function getGroupeAssociation(value, options) {
    const defaultMultipleValueSeparator =
        options.multipleValueSeparator ?? "/";

    if (value === null || value === undefined || value === "") {
        return [DEFAULT_GROUP_ID];
    }

    const splitedValue = String(value).split(defaultMultipleValueSeparator);
    const result = new Set();

    for (let val of splitedValue) {
        const upper = String(val ?? "").trim().toUpperCase();
        const index = GROUP.indexOf(upper);

        if (index !== -1) {
            val = String(index + 1);
        }

        if (isNumericString(val)) {
            result.add(String(val));
        }
    }

    return [...result];
}

export function mapCustomerRowToPayload(row, options = {}) {
    const languageIds = options.languageIds ?? ["1"];
    const decimalSeparator = options.decimalSeparator ?? ".";
    const defaultCategoryId = options.defaultCategoryId ?? "1";

    const defaultMultipleValueSeparator = options.multipleValueSeparator ?? "/";


    const passwd = String(row?.["Password"] ?? "").trim();
    const lastname = String(row?.["Last Name"] ?? "").trim();
    const firstname = String(row?.["First Name"] ?? "").trim();
    const email = String(row?.["Email"] ?? "").trim();
    const active = parseCsvBoolean(row?.["Active (0/1)"], "1");

    const genderId = isNumericString(row?.["Title ID (Mr = 1, Ms = 2, else 0)"]) ? row["Title ID (Mr = 1, Ms = 2, else 0)"] : DEFAULT_TITLE_ID;
    const associations = getGroupeAssociation(row?.["Groupe ID(Visiteur = 1, Invite = 2, CLient = 3)"], options)

    console.log("Association : " + associations + " Row : " + row["Groupe ID(Visiteur = 1, Invite = 2, CLient = 3)"])
    const defaultGroupId = String(associations[0] ?? "0");
    const payload = {
        customer: {
            id_default_group: defaultGroupId,
            active: active,
            passwd: passwd,
            lastname: lastname,
            firstname: firstname,
            email: email,
            id_gender: genderId,
            associations: associations?.length ?
                {
                    groups: {
                        group: associations.map((id) => ({id: String(id)})),
                    }
                }
                : undefined
        },
    };

    return cleanEmptyFields(payload);
}

