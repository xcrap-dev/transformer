import { z } from "zod"

function parseJson(value: string, ctx: z.RefinementCtx<string>) {
    try {
        return JSON.parse(value) as unknown
    } catch (error) {
        ctx.issues.push({ code: "custom", message: `Invalid JSON: ${(error as Error).message}`, input: value })

        return z.NEVER
    }
}

/** JSON text (an `ld+json` script, a `data-*` attribute) parsed and, optionally, validated by `schema`. */
export function json(): z.ZodPipe<z.ZodString, z.ZodTransform<unknown, string>>
export function json<S extends z.ZodType>(schema: S): z.ZodPipe<z.ZodPipe<z.ZodString, z.ZodTransform<unknown, string>>, S>
export function json(schema?: z.ZodType) {
    const parsed = z.string().transform(parseJson)

    return schema ? parsed.pipe(schema) : parsed
}
