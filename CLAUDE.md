# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

`@xcrap/transformer` is a library of ready-made **Zod 4 field schemas** for cleaning and validating scraped data (`t.price()`, `t.url()`, `t.date()`, …). It is one package of the Xcrap scraping framework; sibling packages live in `../` (each with its own git repo, there is no workspace tooling) and the Python port in `../../python/xcrap`.

## Commands

```bash
npm run build            # tsc -> dist/ (CommonJS + .d.ts); also the typecheck (npx tsc --noEmit -p .)
npm test                 # vitest run
npm run test:coverage    # FAILS below 100% statements/branches/functions/lines (vitest.config.mts)
npm run format           # prettier --write on src and __tests__ (sorts imports)
npm run lint             # oxlint; npm run lint:fix applies the safe fixes
npx vitest run -t "price"                     # tests whose name matches
npx vitest run __tests__/schemas.test.ts      # a single file
```

Code style is enforced by Prettier (`.prettierrc.js`: 4 spaces, double quotes, no semicolons, 120 columns) and oxlint (`.oxlintrc.json`, `no-explicit-any` is an error).

CI (`.github/workflows/ci.yml`) runs on every push to `main`/`master`: format, `lint:fix`, typecheck and `test:coverage`; if formatting or lint fixes changed files, `github-actions[bot]` commits them back as `style: apply format and lint fixes` — pull before pushing again.

## Architecture

- `src/schemas/*.ts` — each export is a **factory function that returns a plain Zod schema** (`price(options)`, not a class or wrapper). `src/index.ts` exports them both by name and as the `t` namespace (`export * as t`), so a new schema only needs to be exported from `src/schemas/index.ts`.
- `src/utils/parse-number.ts` — `parseNumber()` finds the first number in a text and resolves separators. Every numeric schema (`number`, `integer`, `price`, `percentage`, `rating`) goes through the private `numeric()` helper in `schemas/number.ts`, which wraps it as `union(string | number) -> transform -> pipe(z.number() with min/max)`.
- Parse failures are reported the Zod 4 way: `ctx.issues.push({ code: "custom", message, input })` then `return z.NEVER`. Schemas never throw.

## Design constraints

- **Standalone by decision.** The package must not be integrated into `@xcrap/extractor`'s extraction models (no `schema` option on fields/models). Usage is always two steps: extract, then `z.object({...}).parse(data)`.
- No custom model/engine layer: the old 0.x API (`TransformingModel`, `transform()`, `*Transformer` / `*Validator` namespaces) was removed in 1.0.0 on purpose. If something is expressible with plain Zod (`.optional()`, `.catch()`, `.pipe()`, object-level `.transform()`), document it instead of adding API.
- `zod` is a **peerDependency** (`^4`), plus a devDependency for tests. Runtime dependencies are only `date-fns` (date parsing) and `he` (HTML entity decoding).
- Transforming schemas are `ZodPipe`s, so `.min()`/`.positive()` are not chainable on the result; common constraints are exposed as factory options (`min`, `max`), everything else via `.pipe()`.
- Zod has no parse context: per-call data such as the base URL is a factory option (`url({ base })`).

## Behaviors that are easy to get wrong

- Number heuristic without `locale`: if both `.` and `,` appear, the last one is the decimal separator; a single separator followed by exactly three digits (`"1.234"`) is a **thousands** separator unless the integer part is `0`. With `locale`, the decimal separator comes from `Intl.NumberFormat`; locales whose separator is neither `.` nor `,` fall back to the heuristic.
- Whitespace/apostrophe only counts as a thousands separator when followed by exactly three digits (`"1 234,56"` is one number, `"10 20"` is `10`). A minus sign is only honored when not glued to a word (`"SKU-10"` is `10`, `"-R$ 10"` is `-10`).
- Compact suffixes (`1.2k`) are opt-in (`compact: true`) and `price()` allows negatives unless `min: 0` is passed.
- Numeric schemas pass numbers through untouched — including `percentage()`, which only divides by 100 when the input is a string.
- `match()` resets `lastIndex` after each parse so global/sticky regexes are reusable.
- Regexes use `\uXXXX` escapes for non-breaking spaces, the Unicode minus and combining marks; keep them escaped rather than as literal invisible characters.

## Conventions

- Because of the 100% coverage threshold, avoid unreachable defensive branches — remove them instead of adding coverage-ignore comments.
- Tests import `describe/expect/it` from `vitest` explicitly (globals are off) and exercise the public API through `import { t } from "../src"`.
- Commit messages are short, lowercase and in Portuguese; version bumps are their own commit named after the version (`1.0.0`). `README.md` is in English and documents every schema in a table — update it when adding or changing one.
