# PrestaShop Webservice List Parameters

Use these parameters to get more detailed lists, filter results, and apply sorting/pagination. The app helpers (`getList`) map these options to query params.

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
| --------------- | -------- | ----------------------------------------------------------------- |
| `filter[field]` | `[1|5]`  | OR operator: list of possible values                              |
| `filter[field]` | `[1,10]` | Interval operator: define interval of possible values             |
| `filter[field]` | `[John]` | Literal value (not case sensitive)                                |
| `filter[field]` | `[Jo]%`  | Begin operator: fields begins with the value (not case sensitive) |
| `filter[field]` | `%[hn]`  | End operator: fields ends with the value (not case sensitive)     |
| `filter[field]` | `%[oh]%` | Contains operator: fields contains the value (not case sensitive) |

Examples:

| Result                                               | API call                                   | PHP Webservice lib options                                             |
| ---------------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------- |
| Only the customers whose ids are 1 or 5              | `/api/customers/?filter[id]=[1|5]`         | `$opt = ['resource' => 'customers', 'filter[id]' => '[1|5]'];`         |
| Only the customers whose ids are between 1 and 10    | `/api/customers/?filter[id]=[1,10]`        | `$opt = ['resource' => 'customers', 'filter[id]' => '[1,10]'];`        |
| Only the customers whose first name is "John"        | `/api/customers/?filter[firstname]=[John]` | `$opt = ['resource' => 'customers', 'filter[firstname]' => '[John]'];` |
| Only the manufacturers whose name begins with "Appl" | `/api/manufacturers/?filter[name]=[appl]%` | `$opt = ['resource' => 'manufacturers', 'filter[name]' => '[appl]%'];` |

## Sort parameter

Sort results using the `sort` parameter.

| Key    | Value                   | Result                                                                              |
| ------ | ----------------------- | ----------------------------------------------------------------------------------- |
| `sort` | `[{field}_{ASC|DESC}]`   | The sort value is composed of a field name and the expected order separated by `_` |

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

## App helper mapping

In `src/api/prestashopCrud.js`, list options map as follows:

- `display`, `sort`, `limit`, `date` are passed through directly.
- `filters` is mapped to `filter[field]=value` entries.
- `params` lets you pass any extra query params (merged after list options).

## prestashopCrud method reference

All methods accept a `ref` (resource name like `products`) and return a promise.
Examples below use imports from `src/api/prestashopCrud.js`.

### getList(ref, options)

List resources with list parameters.

Options:
- `display`, `sort`, `limit`, `date`, `filters`: list options described above.
- `params`: extra query params.
- `headers`: extra HTTP headers.
- `signal`: `AbortController` signal.

Example:

```js
import {getList} from "../api/prestashopCrud";

const products = await getList("products", {
  display: "[id,name,price]",
  sort: "[id_DESC]",
  limit: "0,10",
  filters: {active: "1"},
  params: {schema: "blank"},
});
```

### getById(ref, id, options)

Fetch a single resource by ID.

Options:
- `params`, `headers`, `signal`.

Example:

```js
import {getById} from "../api/prestashopCrud";

const product = await getById("products", 42, {
  params: {display: "full"},
});
```

### readResource(ref, options)

Sugar method: if `options.id` is provided, it calls `getById`, otherwise `getList`.

Options:
- `id`: resource ID (optional).
- All `getList` options when `id` is not provided.
- `params`, `headers`, `signal`.

Example:

```js
import {readResource} from "../api/prestashopCrud";

const productList = await readResource("products", {
  display: "[id,name]",
  limit: "0,5",
});

const singleProduct = await readResource("products", {
  id: 42,
  params: {display: "full"},
});
```

### createResource(ref, data, options)

Create a resource (POST). `data` must be a Prestashop payload (JSON converted to XML).

Options:
- `params`, `headers`, `signal`.

Example:

```js
import {createResource} from "../api/prestashopCrud";

await createResource("customers", {
  customer: {
    firstname: "Ada",
    lastname: "Lovelace",
    email: "ada@example.com",
  },
});
```

### updateResource(ref, id, data, options)

Update a resource (PUT).

Options:
- `params`, `headers`, `signal`.

Example:

```js
import {updateResource} from "../api/prestashopCrud";

await updateResource("products", 42, {
  product: {
    price: "19.99",
  },
});
```

### deleteResource(ref, id, options)

Delete a resource (DELETE).

Options:
- `params`, `headers`, `signal`.

Example:

```js
import {deleteResource} from "../api/prestashopCrud";

await deleteResource("products", 42);
```

### getAllIds(ref, options)

Fetch all IDs by requesting `display=[id]` and parsing the list response.

Options:
- `display` (default: `[id]`), `sort`, `limit`, `filters`, `params`, `headers`, `signal`.

Example:

```js
import {getAllIds} from "../api/prestashopCrud";

const ids = await getAllIds("orders", {
  filters: {current_state: "2"},
  limit: "0,100",
});
```

### resetDatabase(refs, options)

Delete all resources for each ref in `refs`. For each ref, it fetches IDs then deletes them.

Options:
- `listOptions`: options for `getAllIds`.
- `deleteOptions`: options for `deleteResource`.

Example:

```js
import {resetDatabase} from "../api/prestashopCrud";

const result = await resetDatabase(["products", "orders"], {
  listOptions: {limit: "0,50"},
  deleteOptions: {params: {force: "1"}},
});
```
