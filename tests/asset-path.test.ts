import { describe, expect, test } from 'bun:test'
import { idToPath, pathToId } from '../src/assetStore'

describe('pathToId / idToPath', () => {
    test('empty path maps to root id', () => {
        expect(pathToId('')).toBe('__root__')
    })

    test('non-empty path is its own id', () => {
        expect(pathToId('models/foo.glb')).toBe('models/foo.glb')
    })

    test('root id maps back to empty path', () => {
        expect(idToPath('__root__')).toBe('')
    })

    test('round-trip for non-root paths', () => {
        const p = 'images/textures/brick.png'
        expect(idToPath(pathToId(p))).toBe(p)
    })
})
