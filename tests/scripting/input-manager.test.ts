import { describe, expect, test } from 'bun:test'
import { InputManager } from '../../src/scripting/InputManager'

describe('InputManager', () => {
    test('tracks key down / pressed / released across ticks', () => {
        const target = document.createElement('canvas')
        const input = new InputManager()
        input.attach(target)

        globalThis.dispatchEvent(
            new KeyboardEvent('keydown', { code: 'KeyA', bubbles: true })
        )
        input.tick()
        expect(input.isKeyDown('KeyA')).toBe(true)
        expect(input.isKeyPressed('KeyA')).toBe(true)

        input.tick()
        expect(input.isKeyPressed('KeyA')).toBe(false)
        expect(input.isKeyDown('KeyA')).toBe(true)

        globalThis.dispatchEvent(
            new KeyboardEvent('keyup', { code: 'KeyA', bubbles: true })
        )
        input.tick()
        expect(input.isKeyDown('KeyA')).toBe(false)
        expect(input.isKeyReleased('KeyA')).toBe(true)

        input.detach()
    })

    test('accumulates pointer deltas until tick flushes them', () => {
        const target = document.createElement('div')
        const input = new InputManager()
        input.attach(target)

        target.dispatchEvent(
            new PointerEvent('pointermove', {
                movementX: 2,
                movementY: -3,
                bubbles: true,
            })
        )
        target.dispatchEvent(
            new PointerEvent('pointermove', {
                movementX: 1,
                movementY: 1,
                bubbles: true,
            })
        )
        input.tick()
        expect(input.mouseDeltaX).toBe(3)
        expect(input.mouseDeltaY).toBe(-2)

        input.tick()
        expect(input.mouseDeltaX).toBe(0)
        expect(input.mouseDeltaY).toBe(0)

        input.detach()
    })

    test('detach clears listeners and state', () => {
        const target = document.createElement('canvas')
        const input = new InputManager()
        input.attach(target)
        globalThis.dispatchEvent(
            new KeyboardEvent('keydown', { code: 'KeyZ', bubbles: true })
        )
        input.tick()
        input.detach()
        expect(input.isKeyDown('KeyZ')).toBe(false)
    })
})
