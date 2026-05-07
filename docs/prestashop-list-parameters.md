# PrestaShop Webservice List Parameters

Use these parameters to get more detailed lists, filter results, and apply sorting/pagination.

## Display parameter

Specify which fields are returned for each resource.

| Key       | Value                 | Result                                          |
| --------- | --------------------- | ----------------------------------------------- |
| `display` | `full`                | Returns all the fields of the resource          |
| `display` | `[field1,field2,...]` | Returns only the fields specified in this array |

Examples:

| Result                                                                  | API call                                    | PHP Webservice lib options                                              |
| ----------------------------------------------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------- |
| Include all fields from the products resource                           | `/api/products/?display=full`               | `$opt = ['resource' => 'products', 'display' => 'full'];`               |
| Include only the ID from the carriers resource                          | `/api/carriers/?display=[id]`               | `$opt = ['resource' => 'carriers', 'display' => '[id]'];`               |
| Only include the name and value fields from the configurations resource | `/api/configurations/?display=[name,value]` | `$opt = ['resource' => 'configurations', 'display' => '[name,value]'];` |

## Filter parameter

Filter results using the `filter` parameter.

| Key             | Value    | Result                                                            |
| --------------- | -------- | ----------------------------------------------------------------- | ------------------------------------ |
| `filter[field]` | `[1      | 5]`                                                               | OR operator: list of possible values |
| `filter[field]` | `[1,10]` | Interval operator: define interval of possible values             |
| `filter[field]` | `[John]` | Literal value (not case sensitive)                                |
| `filter[field]` | `[Jo]%`  | Begin operator: fields begins with the value (not case sensitive) |
| `filter[field]` | `%[hn]`  | End operator: fields ends with the value (not case sensitive)     |
| `filter[field]` | `%[oh]%` | Contains operator: fields contains the value (not case sensitive) |

Examples:

| Result                                               | API call                                   | PHP Webservice lib options                                             |
| ---------------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------- | ------------------------------------------------------- | ------ |
| Only the customers whose ids are 1 or 5              | `/api/customers/?filter[id]=[1             | 5]`                                                                    | `$opt = ['resource' => 'customers', 'filter[id]' => '[1 | 5]'];` |
| Only the customers whose ids are between 1 and 10    | `/api/customers/?filter[id]=[1,10]`        | `$opt = ['resource' => 'customers', 'filter[id]' => '[1,10]'];`        |
| Only the customers whose first name is "John"        | `/api/customers/?filter[firstname]=[John]` | `$opt = ['resource' => 'customers', 'filter[firstname]' => '[John]'];` |
| Only the manufacturers whose name begins with "Appl" | `/api/manufacturers/?filter[name]=[appl]%` | `$opt = ['resource' => 'manufacturers', 'filter[name]' => '[appl]%'];` |

## Sort parameter

Sort results using the `sort` parameter.

| Key    | Value               | Result  |
| ------ | ------------------- | ------- | ---------------------------------------------------------------------------------- |
| `sort` | `[{fieldname}\_{ASC | DESC}]` | The sort value is composed of a field name and the expected order separated by `_` |

Examples:

| Result                                                          | API call                                      | PHP Webservice lib options                                                |
| --------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------- |
| Sort the customers in alphabetical order according to last name | `/api/customers/?sort=[lastname_ASC]`         | `$opt = ['resource' => 'customers', 'sort' => '[lastname_ASC]'];`         |
| Sort the customers by last name then by biggest ID first        | `/api/customers/?sort=[lastname_ASC,id_DESC]` | `$opt = ['resource' => 'customers', 'sort' => '[lastname_ASC,id_DESC]'];` |

Note: If you need to sort by a date field, add `&date=1` to the request.

Example: `/api/customers/?sort=[date_add_DESC]&date=1`

## Limit parameter

Limit the number of results (supports pagination).

| Key     | Value            | Result                                                                                                  |
| ------- | ---------------- | ------------------------------------------------------------------------------------------------------- |
| `limit` | `[offset,]limit` | Either define offset and limit separated by a comma (ex: `1,5`) or the limit only (offset is 0-indexed) |

Examples:

| Result                                                         | API call                 | PHP Webservice lib options                           |
| -------------------------------------------------------------- | ------------------------ | ---------------------------------------------------- |
| Only include the first 5 states                                | `/api/states/?limit=5`   | `$opt = ['resource' => 'states', 'limit' => '5'];`   |
| Only include the first 5 states starting from the 10th element | `/api/states/?limit=9,5` | `$opt = ['resource' => 'states', 'limit' => '9,5'];` |
