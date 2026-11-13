import { z } from "zod"

export type UrlOptions = {
    /** Base used to resolve relative URLs (usually the URL of the scraped page). */
    base?: string | URL
    /** Accepted protocols. Default: `["http:", "https:"]`. */
    protocols?: string[]
}

/** Absolute URL: `url({ base: "https://site.com/a/" })` turns `"../b?x=1"` into `"https://site.com/b?x=1"`. */
export function url({ base, protocols = ["http:", "https:"] }: UrlOptions = {}) {
    return z.string().transform((value, ctx) => {
        let resolved: URL

        try {
            resolved = new URL(value.trim(), base)
        } catch {
            ctx.issues.push({
                code: "custom",
                message: base
                    ? `"${value}" is not a valid URL`
                    : `"${value}" is not an absolute URL and no base was given`,
                input: value,
            })

            return z.NEVER
        }

        if (!protocols.includes(resolved.protocol)) {
            ctx.issues.push({
                code: "custom",
                message: `Protocol "${resolved.protocol}" is not allowed in "${value}"`,
                input: value,
            })

            return z.NEVER
        }

        return resolved.href
    })
}
