import { describe, expect, test, beforeEach } from 'bun:test'
import { Script } from '../../src/scripting/Script'
import { clearLogs, logs } from '../../src/scripting/consoleStore'

describe('Script helpers', () => {
    beforeEach(() => {
        clearLogs()
    })

    test('getScript and getScriptOn delegate to _lookup with node uniqueIds', () => {
        const a = new Script()
        const b = new Script()
        const lookup = (
            nodeId: number,
            path: string
        ): Script | null => {
            if (nodeId === 1 && path === 'scripts/A.ts') return a
            if (nodeId === 2 && path === 'scripts/B.ts') return b
            return null
        }

        const host = new Script()
        host._lookup = lookup
        host.node = { uniqueId: 1 } as never

        const otherNode = { uniqueId: 2 } as never

        expect(host.getScript('scripts/A.ts')).toBe(a)
        expect(host.getScript('scripts/B.ts')).toBeNull()
        expect(host.getScriptOn(otherNode, 'scripts/B.ts')).toBe(b)
        expect(host.getScriptOn(otherNode, 'scripts/A.ts')).toBeNull()
    })

    test('log forwards arguments to the console store', () => {
        const s = new Script()
        s._lookup = () => null
        s.node = { uniqueId: 0 } as never
        s.log('score', 10)
        const e = logs()
        expect(e.length).toBe(1)
        expect(e[0]!.level).toBe('log')
        expect(e[0]!.args).toEqual(['score', 10])
    })
})
