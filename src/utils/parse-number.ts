export type ParseNumberOptions = {
    /** BCP 47 locale used to decide which character is the decimal separator. Without it a heuristic is used. */
    locale?: string
    /** Understand compact suffixes: `1.2k`, `3M`, `1B`. */
    compact?: boolean
}

const NUMBER_TOKEN = /(?:(?<![\w])([-\u2212])[^\d]{0,4})?(\d[\d.,]*(?:[\s\u00a0\u202f'\u2019]\d{3}(?!\d)[\d.,]*)*)/
const COMPACT_SUFFIX = /^\s?([kmb])(?![a-z])/i
const COMPACT_MULTIPLIERS: Record<string, number> = { k: 1e3, m: 1e6, b: 1e9 }

const decimalSeparatorCache = new Map<string, string>()

function getDecimalSeparator(locale: string): string | undefined {
    if (!decimalSeparatorCache.has(locale)) {
        const parts = new Intl.NumberFormat(locale).formatToParts(1.5)
        const decimal = parts.map((part) => (part.type === "decimal" ? part.value : "")).join("")

        decimalSeparatorCache.set(locale, decimal)
    }

    const separator = decimalSeparatorCache.get(locale)

    return separator === "." || separator === "," ? separator : undefined
}

function guessDecimalSeparator(digits: string): "." | "," | undefined {
    const lastDot = digits.lastIndexOf(".")
    const lastComma = digits.lastIndexOf(",")

    if (lastDot === -1 && lastComma === -1) return undefined
    if (lastDot !== -1 && lastComma !== -1) return lastDot > lastComma ? "." : ","

    const separator = lastDot !== -1 ? "." : ","
    const pieces = digits.split(separator)

    if (pieces.length > 2) return undefined

    const [integerPart, fractionPart] = pieces
    const looksLikeThousands = fractionPart.length === 3 && integerPart !== "0" && integerPart.length <= 3

    return looksLikeThousands ? undefined : separator
}

/**
 * Finds the first number inside a text and parses it, dealing with currency symbols,
 * thousands separators and decimal commas. Returns `null` when no number is found.
 */
export function parseNumber(text: string, { locale, compact = false }: ParseNumberOptions = {}): number | null {
    const match = NUMBER_TOKEN.exec(text)

    if (!match) return null

    const [, sign, token] = match
    const digits = token.replace(/[\s\u00a0\u202f'\u2019]/g, "").replace(/[.,]+$/, "")
    const decimal = (locale && getDecimalSeparator(locale)) || guessDecimalSeparator(digits)
    const group = decimal === "," ? "." : ","

    const normalized = decimal ? digits.split(group).join("").replace(decimal, ".") : digits.replace(/[.,]/g, "")

    let value = Number(normalized)

    if (!Number.isFinite(value)) return null

    if (compact) {
        const suffix = COMPACT_SUFFIX.exec(text.slice(match.index + match[0].length))

        if (suffix) {
            value *= COMPACT_MULTIPLIERS[suffix[1].toLowerCase()]
        }
    }

    return sign ? -value : value
}
