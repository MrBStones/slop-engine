import { describe, expect, test, beforeEach } from 'bun:test'
import { clearLogs, logs, pushLog } from '../src/scripting/consoleStore'

describe('consoleStore', () => {
    beforeEach(() => {
        clearLogs()
    })

    test('pushLog appends entries with level and args', () => {
        pushLog('log', 'a', 1)
        pushLog('warn', 'b')
        pushLog('error', new Error('e'))
        const entries = logs()
        expect(entries.length).toBe(3)
        expect(entries[0]!.level).toBe('log')
        expect(entries[0]!.args).toEqual(['a', 1])
        expect(entries[1]!.level).toBe('warn')
        expect(entries[2]!.level).toBe('error')
        expect(entries[2]!.args[0]).toBeInstanceOf(Error)
    })

    test('entries are ordered and carry monotonic timestamps', () => {
        pushLog('log', 'first')
        pushLog('log', 'second')
        const e = logs()
        expect(e[0]!.args[0]).toBe('first')
        expect(e[1]!.args[0]).toBe('second')
        expect(e[1]!.timestamp).toBeGreaterThanOrEqual(e[0]!.timestamp)
    })

    test('clearLogs empties', () => {
        pushLog('error', 'x')
        clearLogs()
        expect(logs().length).toBe(0)
    })
})
