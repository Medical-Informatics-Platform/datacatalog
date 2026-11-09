# Excel → CDEs JSON: Requirements & Field Mapping

An Excel file is uploaded to `POST /excel-to-json` and converted into the CDEs
JSON data model. This document lists the hard requirements the file must meet
and how each Excel column maps to the output JSON.

## File requirements

- **Format**: real `.xlsx` (readable by openpyxl).
- **Size**: ≤ 20 MB.
- **One variable per row**: each spreadsheet row becomes one variable.
- **Columns**: the header must contain **exactly** these 11 columns — no more,
  no fewer:

  `csvFile`, `name`, `code`, `type`, `values`, `unit`, `description`,
  `canBeNull`, `comments`, `conceptPath`, `methodology`

## Per-row requirements

| Field | Required | Rule |
| --- | --- | --- |
| `name` | yes | non-empty |
| `code` | yes | non-empty |
| `type` | yes | one of `nominal`, `real`, `integer`, `text` |
| `conceptPath` | yes | non-empty, formatted `level1/level2/...` |
| `values` | when `type=nominal` | `"{"code", "label"}"` pairs; codes must be unique |
| `values` | when `type=real`/`integer` | `<min>-<max>` range; `min` < `max`; whole numbers for `integer` |
| `unit`, `description`, `canBeNull`, `comments`, `methodology` | no | any non-empty value is kept; empty values are dropped |

## Column → JSON mapping

| Excel column | CDEs JSON field | Notes |
| --- | --- | --- |
| `name` | `label` | |
| `code` | `code` | |
| `type` | `type` | |
| `values` | `enumerations` (nominal) / `minValue` + `maxValue` (real, integer) | |
| `unit` | `units` | |
| `description` | `description` | |
| `canBeNull` | `canBeNull` | |
| `comments` | `comments` | |
| `methodology` | `methodology` | |
| `conceptPath` | (builds the group tree) | split on `/` to build the `groups` hierarchy |

## Output structure

- The `groups` tree is built from `conceptPath`: each `/`-separated level becomes
  a nested group.
- `sql_type` and `isCategorical` are derived from `type`.
- Empty fields and empty `groups`/`variables`/`enumerations` lists are removed
  from the output.
