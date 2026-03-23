import { describe, expect, test } from 'bun:test'
import {
    getDefaultModel,
    getDefaultModels,
    normalizeModelSettings,
    type ModelSettings,
} from '../src/modelSettingsStore'

function baseSettings(overrides: Partial<ModelSettings> = {}): ModelSettings {
    return {
        provider: 'azure',
        models: {
            orchestrator: 'a',
            scene: 'b',
            script: 'c',
            ui: 'd',
            asset: 'e',
            test: 'f',
        },
        providerModels: {
            azure: { ...getDefaultModels('azure') },
            openrouter: { ...getDefaultModels('openrouter') },
            google: { ...getDefaultModels('google') },
        },
        credentials: {},
        ...overrides,
    }
}

describe('getDefaultModel', () => {
    test('azure uses default model strings', () => {
        expect(getDefaultModel('azure', 'scene')).toContain('gpt')
    })

    test('openrouter uses slash model ids', () => {
        expect(getDefaultModel('openrouter', 'scene')).toContain('/')
    })

    test('google uses gemini-style ids', () => {
        expect(getDefaultModel('google', 'script')).toContain('gemini')
    })
})

describe('normalizeModelSettings', () => {
    test('fills missing agent keys from provider defaults', () => {
        const partial = baseSettings({
            models: {
                orchestrator: 'custom-orchestrator',
                scene: '',
                script: '',
                ui: '',
                asset: '',
                test: '',
            },
        })
        const n = normalizeModelSettings(partial)
        expect(n.models.orchestrator).toBe('custom-orchestrator')
        expect(n.models.scene).toBeTruthy()
        expect(n.models.scene).toBe(getDefaultModel('azure', 'scene'))
    })

    test('syncs providerModels for all providers', () => {
        const n = normalizeModelSettings(
            baseSettings({
                provider: 'openrouter',
                models: {
                    orchestrator: 'x',
                    scene: 'y',
                    script: 'z',
                    ui: 'u',
                    asset: 'a',
                    test: 't',
                },
            })
        )
        expect(n.providerModels.openrouter.orchestrator).toBe('x')
        expect(n.providerModels.azure.orchestrator).toBe(
            getDefaultModel('azure', 'orchestrator')
        )
    })
})
