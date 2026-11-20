# Appwrite table changes (Finance, orders, sales, custom products, alerts, tracker)

## Finance ledger

The app stores manual finance entries asynchronously in the `ronakbyali_finance` table. Product-stock investment and returned-order delivery-cost entries are calculated from the products and orders tables; they are not duplicated in this table.

Table ID: `ronakbyali_finance`. The table is admin-only (`read`, `create`, `update`, and `delete` for the `admin` label); row security is off.

| Key | Type | Required | Size / Elements | Default | Notes |
|---|---|---|---|---|---|
| `type` | Enum | Yes | `investment`, `expense`, `withdrawal`, `income` | `expense` | Ledger entry type |
| `title` | String | Yes | 150 | none | Entry title |
| `category` | String | No | 100 | none | Optional category |
| `amount` | Double | Yes | min 0 | none | Positive amount |
| `date` | Datetime | Yes | n/a | none | Entry date |
| `note` | Text | No | n/a | none | Optional details |

Set `RONAK_BY_ALI_FINANCE_TABLE_ID` to `ronakbyali_finance` in `.env`. The same key is present in `.env.sample`; no credentials or other environment values need to change.

## Custom product orders

The custom-order flow uses the `ronakbyali_custom_orders` table and extends the existing `ronakbyali_order_confirmations` table. Existing confirmation columns (`status`, `expiredAt`) stay intact for the function-based customer confirmation flow; the new columns hold staff confirmation metadata.

`ronakbyali_products` gains `customOptions` text containing JSON rows shaped like `[{ "id": "...", "label": "...", "price": 0 }]`. `ronakbyali_orders` gains `customSelections` (JSON text) and `customFileIds` (string array); existing `isCustom`, `customDetails`, and `customFileId` are reused.

The custom-orders table grants authenticated users create permission and uses row security so customers can read their own request; staff labels can read and update requests. This does not grant public bucket upload permissions.

You have two ways to apply these. Use **Option A** (one command). Use **Option B** only if you want to click through the console by hand.

## Option A: push the JSON (recommended)

1. Replace your project's `appwrite.config.json` with the one delivered alongside this file (back up the old one first).
2. In the project folder, run:
   ```
   appwrite login
   appwrite push tables
   ```
3. Before pushing the changed order enum, complete the staged **Order status migration** below. Then select **ronakbyali_finance**, **ronakbyali_sales**, **ronakbyali_products**, **ronakbyali_orders**, **ronakbyali_order_confirmations**, **ronakbyali_alerts** and the tracker table (`6af19f03003410210a87`). Confirm.
4. In the console, open each table and wait until every new column shows status **Available** (indexes take a few seconds).
5. Set `RONAK_BY_ALI_SALES_TABLE_ID` and `RONAK_BY_ALI_FINANCE_TABLE_ID` in `.env` to `ronakbyali_sales` and `ronakbyali_finance`, respectively.

No existing table is removed. The JSON adds the finance table and new columns, and updates the order-status enum; migrate existing order data as described below before applying that enum change.

---

## Option B: create by hand in the console

Database: **Ronak By Ali** → Tables.

### 1. NEW table: `ronakbyali_finance`

Table ID and name: `ronakbyali_finance`.

**Settings → Permissions** (admin label only):
| Role | Permission |
|---|---|
| Label: `admin` | Read |
| Label: `admin` | Create |
| Label: `admin` | Update |
| Label: `admin` | Delete |

Row security: **off**.

**Columns**
| Key | Type | Required | Size / Elements | Default | Notes |
|---|---|---|---|---|---|
| `type` | Enum | Yes | `investment`, `expense`, `withdrawal`, `income` | `expense` | Ledger entry type |
| `title` | String | Yes | 150 | none | Entry title |
| `category` | String | No | 100 | none | Optional category |
| `amount` | Double | Yes | min 0 | none | Positive amount |
| `date` | Datetime | Yes | n/a | none | Entry date |
| `note` | Text | No | n/a | none | Optional details |

### 2. NEW table: `ronakbyali_sales`

Table ID: `ronakbyali_sales` (type it exactly; do not let Appwrite generate it). Name: `ronakbyali_sales`.

**Settings → Permissions** (add these four):
| Role | Permission |
|---|---|
| Any | Read |
| Label: `admin` | Create |
| Label: `admin` | Update |
| Label: `admin` | Delete |

Row security: **off**. (Sales must be readable by everyone because the public product pages show them.)

**Columns**
| Key | Type | Required | Size / Min-Max | Default | Notes |
|---|---|---|---|---|---|
| `name` | String | Yes | 100 | none | Sale name, e.g. "Eid Sale" |
| `startsAt` | Datetime | Yes | n/a | none | When the sale begins |
| `endsAt` | Datetime | Yes | n/a | none | When the sale ends |
| `discountPercentage` | Float | Yes | min 0, max 100 | none | Numeric, e.g. 20 for 20% |
| `makeAlert` | Boolean | No | n/a | false | If true, an alert is created automatically |
| `type` | Enum | No | `info`, `success`, `warning`, `error`, `promo` | `promo` | The alert type used when `makeAlert` is true |
| `alertId` | String | No | 36 | none | Filled by the app: id of the alert created for this sale |

**Indexes** (type Key, ascending): `idx_startsAt` on `startsAt`, `idx_endsAt` on `endsAt`, `idx_name` on `name`.

### 3. `ronakbyali_products`: add columns
| Key | Type | Required | Size | Default | Notes |
|---|---|---|---|---|---|
| `saleId` | String | No | 36 | none | The sale this product is in |
| `isCustom` | Boolean | No | n/a | false | Shows the **Customize** button when true |
| `customDetails` | Text | No | n/a | none | Instructions shown to the customer in the customize form |
| `customFileId` | String | No | 64 | none | Bucket file id of a sample/template image |

Indexes (Key): `idx_saleId` on `saleId`, `idx_isCustom` on `isCustom`.

### 4. `ronakbyali_orders`: add columns
| Key | Type | Required | Size | Default | Notes |
|---|---|---|---|---|---|
| `isCustom` | Boolean | No | n/a | false | True for customized orders |
| `customDetails` | Text | No | n/a | none | What the customer asked for |
| `customFileId` | String | No | 64 | none | The customer's reference image in the bucket |
| `isConfirmed` | Boolean | No | n/a | false | Staff confirmation state |
| `confirmedAt` | Datetime | No | n/a | none | Confirmation timestamp |
| `returnRequestStatus` | Enum | No | `none`, `requested`, `approved`, `rejected` | `none` | Customer return workflow |
| `returnRequestedAt` | Datetime | No | n/a | none | Request timestamp |
| `returnResolvedAt` | Datetime | No | n/a | none | Staff decision timestamp |
| `returnRequestNote` | Text | No | n/a | none | Customer's optional reason |

### 5. `ronakbyali_order_confirmations`: add column
| Key | Type | Required | Default | Notes |
|---|---|---|---|---|
| `isConfirmed` | Boolean | No | false | Mirrors the confirmation state in the matching order |

### 6. `ronakbyali_alerts`: add columns
| Key | Type | Required | Size / Elements | Default | Array | Notes |
|---|---|---|---|---|---|---|
| `pages` | Enum | No | `all`, `home`, `products`, `product` | none | **Yes** | Which pages show the alert. Empty means all pages (so old alerts keep working) |
| `saleId` | String | No | 36 | none | No | Set when the alert was auto-created by a sale |

### 7. Tracker table (`6af19f03003410210a87`): add column
| Key | Type | Required | Notes |
|---|---|---|---|
| `detail` | Text | No | The latest admin message shown on the order |

The tracker row ID is the order ID, so each order has one tracker row. The existing `updates` column is a text array; each customer-facing update is appended as a JSON entry and shown in the order timeline.

### Order status migration

The new `ronakbyali_orders.status` enum is `placed`, `processing`, `packed`, `shipped`, `cancelled`, `returned`, `delivered`.

Before removing `pending` from the existing order-status enum:

1. Back up the orders and confirmation tables.
2. Add the new order columns (`isConfirmed`, `confirmedAt`, `returnRequestStatus`, `returnRequestedAt`, `returnResolvedAt`, `returnRequestNote`) and the confirmation-table column `isConfirmed`. Wait until they are **Available**.
3. Migrate existing `ronakbyali_orders` rows with `status = pending` to `status = placed`.
4. For each existing confirmation row, set `isConfirmed` to true only when its `status` is `confirmed`; otherwise set it to false. Copy a confirmed row's `confirmedAt` value and mirror its `isConfirmed` and `confirmedAt` values to the matching order row. Orders without a confirmation row must have `isConfirmed = false`.
5. Apply the updated enum and remaining schema from `appwrite.config.json`. Verify the migrated orders and confirmation rows before deploying the app.

The order table also needs a Key index named `idx_isConfirmed` on `isConfirmed` for the confirmed-orders view.

---

## Important notes

- **Effective price.** `price` on a product is stored. A sale ending does not change it by itself. The Copilot prompt makes the app compute the price at display time from the sale dates, so an expired sale stops applying without any scheduled job.
- **Permissions on `ronakbyali_alerts`** already allow `read(any)`, so page-targeted alerts will work for guests too.
- If `appwrite push tables` complains about an enum with no default, the JSON already sets a default only where needed. If it still fails, create that column in the console (Option B) and run `appwrite pull tables` to sync the file back.