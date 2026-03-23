import { describe, expect, test } from 'bun:test'
import {
    buildAssetAgentSystemPrompt,
    buildSceneAgentSystemPrompt,
    buildUIAgentSystemPrompt,
} from '../src/server/prompts'

describe('system prompts', () => {
    test('scene prompt mentions bulk_scene and Y up', () => {
        const s = buildSceneAgentSystemPrompt()
        expect(s).toContain('bulk_scene')
        expect(s).toContain('Y up')
    })

    test('asset prompt lists Tripo and texture tools', () => {
        const s = buildAssetAgentSystemPrompt()
        expect(s).toContain('generate_tripo_mesh')
        expect(s).toContain('apply_texture')
    })

    test('UI prompt references gui', () => {
        const s = buildUIAgentSystemPrompt('/tmp')
        expect(s.toLowerCase()).toContain('gui')
    })
})
