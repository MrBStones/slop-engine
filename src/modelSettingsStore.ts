import { createSignal } from 'solid-js'
import { makePersisted } from '@solid-primitives/storage'

export type AIProvider = 'azure' | 'openrouter'

export type AgentType = 'orchestrator' | 'scene' | 'script' | 'ui' | 'asset'

export interface ModelSettings {
    provider: AIProvider
    models: Record<AgentType, string>
}

const DEFAULT_MODELS: Record<AgentType, string> = {
    orchestrator: 'gpt-5.3-chat',
    scene: 'gpt-5.3-chat',
    script: 'gpt-5.3-chat',
    ui: 'gpt-5.3-chat',
    asset: 'gpt-5.3-chat',
}

const DEFAULT_OPENROUTER_MODELS: Record<AgentType, string> = {
    orchestrator: 'anthropic/claude-4.6-sonnet',
    scene: 'google/gemini-3.1-pro-preview',
    script: 'anthropic/claude-4.6-sonnet',
    ui: 'google/gemini-3.1-pro-preview',
    asset: 'openai/gpt-5.3-chat',
}

export const AGENT_LABELS: Record<AgentType, string> = {
    orchestrator: 'Orchestrator',
    scene: 'Scene Builder',
    script: 'Script Agent',
    ui: 'UI Agent',
    asset: 'Asset Generator',
}

export function getDefaultModel(
    provider: AIProvider,
    agentType: AgentType
): string {
    return provider === 'openrouter'
        ? DEFAULT_OPENROUTER_MODELS[agentType]
        : DEFAULT_MODELS[agentType]
}

export const [modelSettings, setModelSettings] = makePersisted(
    createSignal<ModelSettings>({
        provider: 'azure',
        models: { ...DEFAULT_MODELS },
    }),
    { name: 'slop-ai-model-settings' }
)
