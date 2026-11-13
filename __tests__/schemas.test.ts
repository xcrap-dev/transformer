import { describe, expect, it } from "vitest"
import { z } from "zod"

import { parseNumber, t } from "../src"

describe("parseNumber", () => {
    it.each([
        ["R$ 1.234,56", 1234.56],
        ["$1,234.56", 1234.56],
        ["1 234,56 €", 1234.56],
        ["12.50", 12.5],
        ["1,5", 1.5],
        ["1.234", 1234],
        ["0.125", 0.125],
        ["1.234.567", 1234567],
        ["-R$ 10,00", -10],
        ["SKU-10", 10],
        ["4,5 de 5", 4.5],
        ["10 20", 10],
        ["Total: 99.", 99],
    ])("parses %s", (input, expected) => {
        expect(parseNumber(input)).toBeCloseTo(expected)
    })

    it("uses the locale to solve ambiguity", () => {
        expect(parseNumber("1.234", { locale: "en-US" })).toBe(1.234)
        expect(parseNumber("1,234", { locale: "pt-BR" })).toBe(1.234)
        expect(parseNumber("1.234", { locale: "pt-BR" })).toBe(1234)
    })

    it("understands compact suffixes only when asked", () => {
        expect(parseNumber("1.2k views", { compact: true })).toBe(1200)
        expect(parseNumber("3 M", { compact: true })).toBe(3e6)
        expect(parseNumber("12 meters", { compact: true })).toBe(12)
        expect(parseNumber("1.2k")).toBe(1.2)
    })

    it("falls back to the heuristic when the locale separator is neither dot nor comma", () => {
        expect(parseNumber("1.234,5", { locale: "ar-EG-u-nu-arab" })).toBe(1234.5)
    })

    it("returns null for malformed numbers", () => {
        expect(parseNumber("1,2,3", { locale: "pt-BR" })).toBeNull()
    })

    it("returns null without digits", () => {
        expect(parseNumber("Grátis")).toBeNull()
    })
})

describe("number schemas", () => {
    it("price", () => {
        expect(t.price().parse("R$ 1.234,56")).toBe(1234.56)
        expect(t.price().parse(10)).toBe(10)
        expect(t.price().safeParse("Grátis").success).toBe(false)
        expect(t.price({ min: 0 }).safeParse("-R$ 5,00").success).toBe(false)
    })

    it("number and integer", () => {
        expect(t.number({ compact: true }).parse("1.5k")).toBe(1500)
        expect(t.integer().parse("12 avaliações")).toBe(12)
        expect(t.integer().safeParse("1,5").success).toBe(false)
        expect(t.number({ min: 1, max: 10 }).safeParse("11").success).toBe(false)
        expect(t.number().safeParse("abc").error?.issues[0].message).toBe('Could not find a number in "abc"')
    })

    it("percentage and rating", () => {
        expect(t.percentage().parse("85%")).toBeCloseTo(0.85)
        expect(t.percentage().parse(0.5)).toBe(0.5)
        expect(t.percentage().safeParse("n/a").success).toBe(false)
        expect(t.rating().parse("9")).toBe(9)
        expect(t.rating({ max: 5 }).parse("4,5 de 5")).toBe(4.5)
        expect(t.rating({ max: 5 }).safeParse("7").success).toBe(false)
    })
})

describe("text schemas", () => {
    it("text", () => {
        expect(t.text().parse("  Tom &amp;\n  Jerry&nbsp; ")).toBe("Tom & Jerry")
        expect(t.text({ stripTags: true }).parse("<b>Hello</b><br>world")).toBe("Hello world")
        expect(t.text({ collapse: false, decodeEntities: false }).parse(" a  &amp; b ")).toBe("a  &amp; b")
    })

    it("match", () => {
        expect(t.match(/SKU: (\w+)/, 1).parse("SKU: AB12")).toBe("AB12")
        expect(t.match(/(?<year>\d{4})/, "year").parse("since 2019")).toBe("2019")
        expect(t.match(/\d+/).safeParse("none").success).toBe(false)

        const global = t.match(/\d+/g)

        expect(global.parse("a 1")).toBe("1")
        expect(global.parse("a 1")).toBe("1")
    })

    it("boolean", () => {
        expect(t.boolean().parse(" Sim ")).toBe(true)
        expect(t.boolean().parse("NÃO")).toBe(false)
        expect(t.boolean().parse(true)).toBe(true)
        expect(t.boolean({ truthy: ["em estoque"], falsy: ["esgotado"] }).parse("Em  Estoque")).toBe(true)
        expect(t.boolean().safeParse("maybe").success).toBe(false)
    })
})

describe("url", () => {
    it("resolves relative URLs", () => {
        expect(t.url({ base: "https://site.com/a/" }).parse(" ../b?x=1 ")).toBe("https://site.com/b?x=1")
        expect(t.url().parse("https://site.com")).toBe("https://site.com/")
    })

    it("rejects invalid input", () => {
        expect(t.url().safeParse("/relative").error?.issues[0].message).toContain("no base was given")
        expect(t.url({ base: "https://site.com" }).safeParse("http://").error?.issues[0].message).toContain(
            "not a valid URL",
        )
        expect(t.url({ base: "https://site.com" }).safeParse("javascript:void(0)").success).toBe(false)
        expect(t.url({ protocols: ["mailto:"] }).parse("mailto:a@b.co")).toBe("mailto:a@b.co")
    })
})

describe("date", () => {
    it("parses with and without format", () => {
        expect(t.date({ format: "dd/MM/yyyy" }).parse("25/12/2024").getMonth()).toBe(11)
        expect(t.date().parse("2024-12-25T10:00:00Z").toISOString()).toBe("2024-12-25T10:00:00.000Z")
        expect(t.date({ unit: "s" }).parse(1735120800).toISOString()).toBe("2024-12-25T10:00:00.000Z")
    })

    it("accepts dates, timestamps and loose formats", () => {
        const now = new Date()

        expect(t.date().parse(now)).toBe(now)
        expect(t.date().parse(1735120800000).toISOString()).toBe("2024-12-25T10:00:00.000Z")
        expect(t.date().parse("Dec 25, 2024").getFullYear()).toBe(2024)
        expect(t.date().safeParse(new Date("x")).success).toBe(false)
    })

    it("rejects invalid dates", () => {
        expect(t.date({ format: "dd/MM/yyyy" }).safeParse("2024-12-25").success).toBe(false)
        expect(t.date().safeParse("not a date").success).toBe(false)
    })
})

describe("json", () => {
    it("parses and validates", () => {
        expect(t.json().parse('{"a":1}')).toEqual({ a: 1 })
        expect(t.json(z.object({ price: t.price() })).parse('{"price":"R$ 9,90"}')).toEqual({ price: 9.9 })
        expect(t.json().safeParse("{oops").success).toBe(false)
    })
})

describe("composition", () => {
    it("works inside a regular zod object", () => {
        const product = z.object({
            name: t.text(),
            price: t.price({ locale: "pt-BR" }),
            url: t.url({ base: "https://loja.com" }),
            inStock: t.boolean({ truthy: ["em estoque"], falsy: ["esgotado"] }).catch(false),
            reviews: t.integer().optional(),
        })

        const data: z.infer<typeof product> = product.parse({
            name: " Teclado&nbsp;Mecânico ",
            price: "R$ 1.299,90",
            url: "/p/teclado",
            inStock: "???",
        })

        expect(data).toEqual({
            name: "Teclado Mecânico",
            price: 1299.9,
            url: "https://loja.com/p/teclado",
            inStock: false,
        })
    })
})
