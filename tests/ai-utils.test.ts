import { describe, expect, test } from 'bun:test'
import {
    formatLogArg,
    groupPartsInOrder,
    parseContent,
} from '../src/components/panels/ai/utils'
import { isToolPart, type ToolUIPart } from '../src/components/panels/ai/types'

describe('formatLogArg', () => {
    test('null and undefined', () => {
        expect(formatLogArg(null)).toBe('null')
        expect(formatLogArg(undefined)).toBe('undefined')
    })

    test('string passthrough', () => {
        expect(formatLogArg('hi')).toBe('hi')
    })

    test('object serializes as JSON', () => {
        expect(formatLogArg({ a: 1 })).toBe('{\n  "a": 1\n}')
    })

    test('number and boolean', () => {
        expect(formatLogArg(42)).toBe('42')
        expect(formatLogArg(true)).toBe('true')
    })
})

describe('parseContent', () => {
    test('extracts fenced code blocks', () => {
        const parts = parseContent('Hello\n\n```ts\nconst x = 1\n```\n')
        expect(parts.some((p) => p.kind === 'code' && p.lang === 'ts')).toBe(true)
        const code = parts.find((p) => p.kind === 'code')
        expect(code && code.kind === 'code' && code.code.includes('const x')).toBe(
            true
        )
    })

    test('plain text becomes html part', () => {
        const parts = parseContent('Just **markdown**')
        expect(parts.length).toBeGreaterThan(0)
        expect(parts[0]!.kind).toBe('html')
    })
})

describe('groupPartsInOrder', () => {
    test('merges adjacent text parts and inserts tool segments', () => {
        const tool: ToolUIPart = {
            type: 'tool-add_mesh',
            toolCallId: '1',
            state: 'output-available',
        }
        const segments = groupPartsInOrder(
            [
                { type: 'text', text: 'a' },
                { type: 'text', text: 'b' },
                tool,
                { type: 'text', text: 'c' },
            ],
            isToolPart
        )
        expect(segments[0]).toEqual({ kind: 'text', text: 'ab' })
        expect(segments[1]).toEqual({ kind: 'tool', part: tool })
        expect(segments[2]).toEqual({ kind: 'text', text: 'c' })
    })

    test('file parts break text like tools', () => {
        const segments = groupPartsInOrder(
            [
                { type: 'text', text: 'x' },
                {
                    type: 'file',
                    mediaType: 'image/png',
                    url: 'blob:abc',
                },
            ],
            isToolPart
        )
        expect(segments[1]!.kind).toBe('file')
    })
})
