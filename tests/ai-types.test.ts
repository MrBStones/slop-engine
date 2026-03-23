import { describe, expect, test } from 'bun:test'
import {
    getToolNameFromPart,
    isToolPart,
    type ToolUIPart,
} from '../src/components/panels/ai/types'

describe('isToolPart', () => {
    test('matches tool- prefix', () => {
        expect(isToolPart({ type: 'tool-foo' })).toBe(true)
        expect(isToolPart({ type: 'text' })).toBe(false)
    })
})

describe('getToolNameFromPart', () => {
    test('strips tool- prefix', () => {
        const p: ToolUIPart = {
            type: 'tool-create_script',
            toolCallId: 'x',
            state: 'done',
        }
        expect(getToolNameFromPart(p)).toBe('create_script')
    })
})
