import { isValid, Locale, parse, parseISO } from "date-fns"
import { z } from "zod"

export type DateOptions = {
    /** date-fns format of the text (`"dd/MM/yyyy"`). Without it, ISO 8601 and whatever `new Date()` accepts. */
    format?: string
    /** date-fns locale, needed for month/weekday names (`import { ptBR } from "date-fns/locale"`). */
    locale?: Locale
    /** Unit of numeric timestamps. Default: `"ms"`. */
    unit?: "ms" | "s"
}

/** Text or timestamp as a valid `Date`: `date({ format: "dd/MM/yyyy" })`. */
export function date({ format, locale, unit = "ms" }: DateOptions = {}) {
    return z.union([z.string(), z.number(), z.date()]).transform((value, ctx) => {
        let parsed: Date

        if (value instanceof Date) {
            parsed = value
        } else if (typeof value === "number") {
            parsed = new Date(unit === "s" ? value * 1000 : value)
        } else if (format) {
            parsed = parse(value.trim(), format, new Date(), { locale })
        } else {
            parsed = parseISO(value.trim())

            if (!isValid(parsed)) parsed = new Date(value)
        }

        if (!isValid(parsed)) {
            ctx.issues.push({
                code: "custom",
                message: format ? `"${value}" does not match the date format "${format}"` : `"${value}" is not a valid date`,
                input: value,
            })

            return z.NEVER
        }

        return parsed
    })
}
