import { describe, expect, test } from 'bun:test'
import { SCRIPTING_API_SLIM } from '../src/server/scripting-api-slim'

describe('SCRIPTING_API_SLIM', () => {
    test('includes core script lifecycle and spawn', () => {
        expect(SCRIPTING_API_SLIM).toContain('declare class Script')
        expect(SCRIPTING_API_SLIM).toContain('start(): void')
        expect(SCRIPTING_API_SLIM).toContain('spawn(')
    })

    test('includes input and raycast surface area', () => {
        expect(SCRIPTING_API_SLIM).toContain('declare class Input')
        expect(SCRIPTING_API_SLIM).toContain('raycast(')
    })
})
