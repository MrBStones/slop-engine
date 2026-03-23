/**
 * Persisted Solid stores (e.g. model settings) touch localStorage on import.
 * Bun's test runtime may not define it in all environments.
 */
import { Window } from 'happy-dom'

if (typeof globalThis.document === 'undefined') {
    const win = new Window({ url: 'http://localhost/' })
    const g = globalThis as typeof globalThis & {
        window: Window
        addEventListener: Window['addEventListener']
        removeEventListener: Window['removeEventListener']
        dispatchEvent: Window['dispatchEvent']
    }
    g.window = win
    g.addEventListener = win.addEventListener.bind(win)
    g.removeEventListener = win.removeEventListener.bind(win)
    g.dispatchEvent = win.dispatchEvent.bind(win)
    globalThis.document = win.document
    globalThis.HTMLElement = win.HTMLElement
    globalThis.KeyboardEvent = win.KeyboardEvent
    globalThis.PointerEvent = win.PointerEvent
}

if (typeof globalThis.localStorage === 'undefined') {
    const store: Record<string, string> = {}
    globalThis.localStorage = {
        get length() {
            return Object.keys(store).length
        },
        clear() {
            for (const k of Object.keys(store)) delete store[k]
        },
        getItem(key: string) {
            return Object.prototype.hasOwnProperty.call(store, key)
                ? store[key]
                : null
        },
        key(index: number) {
            return Object.keys(store)[index] ?? null
        },
        removeItem(key: string) {
            delete store[key]
        },
        setItem(key: string, value: string) {
            store[key] = value
        },
    } as Storage
}
