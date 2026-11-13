import { decode } from "he"
import { z } from "zod"

export type TextOptions = {
    /** Collapse every run of whitespace (including line breaks and `&nbsp;`) into one space. Default: `true`. */
    collapse?: boolean
    /** Decode HTML entities such as `&amp;`. Default: `true`. */
    decodeEntities?: boolean
    /** Remove HTML tags. Default: `false`. */
    stripTags?: boolean
}

/** Clean text: tags removed (opt-in), entities decoded, whitespace collapsed and trimmed. */
export function text({ collapse = true, decodeEntities = true, stripTags = false }: TextOptions = {}) {
    return z.string().transform((value) => {
        if (stripTags) value = value.replace(/<\/?[^>]+(>|$)/g, " ")
        if (decodeEntities) value = decode(value)
        if (collapse) value = value.replace(/[\s\u00a0]+/g, " ")

        return value.trim()
    })
}

/** Text captured by a regular expression: `match(/SKU: (\w+)/, 1)`. Fails when it does not match. */
export function match(pattern: RegExp, group: number | string = 0) {
    return z.string().transform((value, ctx) => {
        const result = pattern.exec(value)
        const captured = typeof group === "number" ? result?.[group] : result?.groups?.[group]

        pattern.lastIndex = 0

        if (captured === undefined) {
            ctx.issues.push({ code: "custom", message: `Pattern ${pattern} did not match "${value}"`, input: value })

            return z.NEVER
        }

        return captured
    })
}

export type BooleanOptions = {
    truthy?: string[]
    falsy?: string[]
}

const DEFAULT_TRUTHY = ["true", "1", "yes", "y", "on", "sim", "s"]
const DEFAULT_FALSY = ["false", "0", "no", "n", "off", "nao"]

function normalizeWord(value: string) {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase()
}

/**
 * Text as boolean, ignoring case, accents and surrounding whitespace:
 * `boolean({ truthy: ["em estoque"], falsy: ["esgotado"] })`. Booleans pass through.
 */
export function boolean({ truthy = DEFAULT_TRUTHY, falsy = DEFAULT_FALSY }: BooleanOptions = {}) {
    const truthySet = new Set(truthy.map(normalizeWord))
    const falsySet = new Set(falsy.map(normalizeWord))

    return z.union([z.string(), z.boolean()]).transform((value, ctx) => {
        if (typeof value === "boolean") return value

        const word = normalizeWord(value)

        if (truthySet.has(word)) return true
        if (falsySet.has(word)) return false

        ctx.issues.push({ code: "custom", message: `"${value}" is not a known boolean text`, input: value })

        return z.NEVER
    })
}
