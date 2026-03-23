import { describe, expect, test } from 'bun:test'
import { resolvePlanningOutlineIcon } from '../src/components/panels/ai/planningIconUtils'

describe('resolvePlanningOutlineIcon', () => {
    test('empty falls back to sparkles', () => {
        const icon = resolvePlanningOutlineIcon('')
        expect(icon).toBeDefined()
        expect('path' in icon).toBe(true)
    })

    test('strips heroicons: and outline: prefixes', () => {
        const a = resolvePlanningOutlineIcon('heroicons:bolt')
        const b = resolvePlanningOutlineIcon('outline:bolt')
        expect(a).toBe(b)
    })

    test('legacy alias palette -> swatch', () => {
        const fromAlias = resolvePlanningOutlineIcon('palette')
        const direct = resolvePlanningOutlineIcon('swatch')
        expect(fromAlias).toBe(direct)
    })

    test('kebab-case maps to camel export', () => {
        const icon = resolvePlanningOutlineIcon('paint-brush')
        expect(icon).toBeDefined()
    })

    test('unknown name falls back to default', () => {
        const def = resolvePlanningOutlineIcon('')
        const bad = resolvePlanningOutlineIcon('totally-unknown-icon-name-xyz')
        expect(bad).toBe(def)
    })
})
