/**
 * Planning card icons use **Heroicons v2** in **outline** style (`solid-heroicons/outline`).
 * Pass any export name in camelCase or kebab-case (e.g. `swatch`, `paint-brush`, `bars_3`).
 * Optional prefix: `heroicons:` or `outline:` (ignored). Unknown names fall back to `sparkles`.
 */
import * as heroOutline from 'solid-heroicons/outline'

const DEFAULT_KEY: keyof typeof heroOutline = 'sparkles'

/** Old built-in keys and common LLM synonyms → real `solid-heroicons/outline` exports */
const LEGACY_ALIASES: Record<string, keyof typeof heroOutline> = {
    palette: 'swatch',
    zap: 'bolt',
    layout: 'rectangleGroup',
    gamepad: 'puzzlePiece',
    music: 'musicalNote',
}

function kebabPartsToCamel(parts: string[]): string {
    if (parts.length === 0) return ''
    let acc = parts[0].toLowerCase()
    for (let i = 1; i < parts.length; i++) {
        const p = parts[i]
        if (/^\d+$/.test(p)) acc += '_' + p
        else acc += p[0].toUpperCase() + p.slice(1).toLowerCase()
    }
    return acc
}

function toExportKey(raw: string): string {
    let s = raw.trim()
    if (!s) return ''
    const li = s.toLowerCase()
    if (li.startsWith('heroicons:')) s = s.slice('heroicons:'.length).trim()
    if (li.startsWith('outline:')) s = s.slice('outline:'.length).trim()
    s = s.replaceAll('_', '-')
    if (s.includes('-')) return kebabPartsToCamel(s.split('-').filter(Boolean))
    if (/^[a-z][a-zA-Z0-9]*$/.test(s)) return s
    if (/^[A-Z][a-zA-Z0-9]*$/.test(s)) return s[0].toLowerCase() + s.slice(1)
    return s.toLowerCase()
}

function isIconData(v: unknown): v is (typeof heroOutline)[typeof DEFAULT_KEY] {
    return typeof v === 'object' && v !== null && 'path' in v
}

export function resolvePlanningOutlineIcon(raw?: string) {
    if (!raw?.trim()) return heroOutline[DEFAULT_KEY]
    const key = toExportKey(raw)
    const alias = LEGACY_ALIASES[key.toLowerCase()]
    const candidates: string[] = []
    if (alias) candidates.push(alias)
    candidates.push(key)
    const lowered = key[0].toLowerCase() + key.slice(1)
    if (lowered !== key) candidates.push(lowered)
    for (const k of candidates) {
        const icon = heroOutline[k as keyof typeof heroOutline]
        if (isIconData(icon)) return icon
    }
    return heroOutline[DEFAULT_KEY]
}
