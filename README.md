# 🕷️ Xcrap Transformer

**Xcrap Transformer** is a set of ready-made [Zod](https://zod.dev) schemas to clean, convert and validate scraped data: prices, URLs, dates, numbers and more.

Scraped values are almost always messy strings (`"R$ 1.234,56"`, `"/p/keyboard"`, `"12 reviews"`). Instead of a custom transformation engine, this package gives you field schemas that solve those cases and compose with everything Zod already offers.

## 📦 Installation

Zod 4 is a peer dependency:

```bash
npm i @xcrap/transformer zod
```

## 🚀 Usage

Every helper is a function that returns a regular Zod schema. Build a `z.object()` with them and parse whatever your extraction step produced:

```ts
import { t } from "@xcrap/transformer"
import { z } from "zod"

const productSchema = z.object({
    name: t.text(),
    price: t.price({ locale: "pt-BR" }),
    url: t.url({ base: "https://store.com" }),
    inStock: t.boolean({ truthy: ["em estoque"], falsy: ["esgotado"] }).catch(false),
    reviews: t.integer().optional(),
    publishedAt: t.date({ format: "dd/MM/yyyy" }),
})

type Product = z.infer<typeof productSchema>

const raw = await extractionModel.extract(html) // @xcrap/extractor, or any other source
const product = productSchema.parse(raw)
```

The helpers are also exported by name (`import { price, url } from "@xcrap/transformer"`).

## 🧰 Schemas

| Schema | Input → output | Options |
| --- | --- | --- |
| `t.text()` | `" Tom &amp;\n Jerry "` → `"Tom & Jerry"` | `collapse`, `decodeEntities`, `stripTags` |
| `t.number()` | `"1.234,56 un."` → `1234.56` | `locale`, `compact`, `min`, `max` |
| `t.integer()` | `"12 reviews"` → `12` | `locale`, `compact`, `min`, `max` |
| `t.price()` | `"R$ 1.234,56"` → `1234.56` | `locale`, `min`, `max` |
| `t.percentage()` | `"85%"` → `0.85` | `locale`, `min`, `max` |
| `t.rating()` | `"4,5 de 5"` → `4.5` | `locale`, `max` |
| `t.boolean()` | `" Sim "` → `true` | `truthy`, `falsy` |
| `t.url()` | `"../b?x=1"` → `"https://site.com/b?x=1"` | `base`, `protocols` |
| `t.date()` | `"25/12/2024"` → `Date` | `format`, `locale`, `unit` |
| `t.match(regex, group)` | `"SKU: AB12"` → `"AB12"` | group index or name |
| `t.json(schema?)` | `'{"a":1}'` → `{ a: 1 }` | a Zod schema for the parsed value |

Numeric schemas also accept numbers (useful for JSON sources), `t.boolean()` accepts booleans and `t.date()` accepts timestamps and `Date` objects.

### Numbers and separators

Numeric schemas read the **first number** in the text and ignore the rest (currency symbols, units, labels).

Without `locale`, the decimal separator is guessed: when both `.` and `,` appear, the last one is the decimal separator; a single separator followed by exactly three digits (`"1.234"`, `"1,234"`) is treated as a thousands separator. If your source is ambiguous, pass the locale:

```ts
t.price().parse("1.234") // 1234
t.price({ locale: "en-US" }).parse("1.234") // 1.234
```

`compact: true` enables suffixes: `t.number({ compact: true }).parse("1.2k")` → `1200`.

### URLs

Zod schemas have no parsing context, so the base URL belongs to the schema. For models reused across pages, build the schema per page:

```ts
const linkSchema = (pageUrl: string) => z.object({ href: t.url({ base: pageUrl }) })
```

Only `http:` and `https:` are accepted by default; change it with `protocols`.

### Refining the result

Schemas that transform are Zod pipes, so number/string methods are not available on them directly. Use the options, or pipe into another schema:

```ts
t.price({ min: 0 })
t.price().pipe(z.number().multipleOf(0.01))
t.text().pipe(z.string().min(1))
```

Optional values, defaults and fallbacks are plain Zod: `.optional()`, `.nullable()`, `.default()`, `.catch()`.

## 🔄 Migrating from 0.x

`TransformingModel`, `Transformer`, `transform()`, `get()` and the `*Transformer` / `*Validator` namespaces were removed. Replace a transforming model with a `z.object()`:

- cross-field logic (`scope: "root"`) → `.transform()` on the object schema;
- `after({ delete, append })` → `.omit()`, `.extend()` or `.transform()`;
- `condition` / `skip` → `.optional()`, `.catch()`, `.default()`;
- `StringTransformer.*` / `NumberTransformer.*` → the schemas above or inline `.transform()`.

## 🧪 Testing

```bash
npm run test
npm run test:coverage # fails below 100%
```

## 📝 License

This project is licensed under the MIT License.
