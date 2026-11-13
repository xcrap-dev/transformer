import { z } from "zod"

import { parseNumber } from "../utils/parse-number"

export type NumberOptions = {
    /** BCP 47 locale (`"pt-BR"`, `"en-US"`) that fixes the decimal separator. Without it a heuristic is used. */
    locale?: string
    /** Understand compact suffixes: `1.2k`, `3M`, `1B`. */
    compact?: boolean
    min?: number
    max?: number
}

function bounded(schema: z.ZodNumber, { min, max }: Pick<NumberOptions, "min" | "max">) {
    if (min !== undefined) schema = schema.min(min)
    if (max !== undefined) schema = schema.max(max)

    return schema
}

function numeric(label: string, options: NumberOptions, target: z.ZodNumber, divisor = 1) {
    return z
        .union([z.string(), z.number()])
        .transform((value, ctx) => {
            if (typeof value === "number") return value

            const parsed = parseNumber(value, options)

            if (parsed === null) {
                ctx.issues.push({ code: "custom", message: `Could not find ${label} in "${value}"`, input: value })

                return z.NEVER
            }

            return parsed / divisor
        })
        .pipe(bounded(target, options))
}

/** First number found in a text: `"1.234,56 un."` -> `1234.56`. Numbers pass through. */
export function number(options: NumberOptions = {}) {
    return numeric("a number", options, z.number())
}

/** Like `number()`, but the result must be an integer: `"12 reviews"` -> `12`. */
export function integer(options: NumberOptions = {}) {
    return numeric("an integer", options, z.number().int())
}

export type PriceOptions = Pick<NumberOptions, "locale" | "min" | "max">

/** Monetary amount without the currency: `"R$ 1.234,56"` -> `1234.56`. */
export function price(options: PriceOptions = {}) {
    return numeric("a price", options, z.number())
}

export type PercentageOptions = Pick<NumberOptions, "locale" | "min" | "max">

/** Percentage text as a fraction: `"85%"` -> `0.85`. Numbers pass through untouched. */
export function percentage(options: PercentageOptions = {}) {
    return numeric("a percentage", options, z.number(), 100)
}

export type RatingOptions = Pick<NumberOptions, "locale"> & {
    /** Highest rating allowed. */
    max?: number
}

/** Rating text: `"4,5 de 5"` -> `4.5`. Must be between `0` and `max`. */
export function rating({ locale, max }: RatingOptions = {}) {
    return numeric("a rating", { locale, min: 0, max }, z.number())
}
