import { beforeEach, describe, expect, test } from 'bun:test'
import { createAssetStore } from '../src/assetStore'

const ASSET_TREE_KEY = 'slop-engine-asset-tree-v1'

describe('createAssetStore', () => {
    beforeEach(() => {
        localStorage.removeItem(ASSET_TREE_KEY)
    })

    test('addNode creates nested file path', () => {
        const store = createAssetStore()
        store.addNode('', 'src', 'folder')
        const file = store.addNode('src', 'game.ts', 'file')
        expect(file.path).toBe('src/game.ts')
        expect(store.findNode(store.tree(), 'src/game.ts')?.type).toBe('file')
    })

    test('renameNode updates path and name', () => {
        const store = createAssetStore()
        store.addNode('', 'old', 'folder')
        store.renameNode('old', 'new')
        expect(store.findNode(store.tree(), 'new')).not.toBeNull()
        expect(store.findNode(store.tree(), 'old')).toBeNull()
    })

    test('deleteNode removes leaf', () => {
        const store = createAssetStore()
        store.addNode('', 'x.ts', 'file')
        store.deleteNode('x.ts')
        expect(store.findNode(store.tree(), 'x.ts')).toBeNull()
    })

    test('addNode rejects duplicate names in the same folder', () => {
        const store = createAssetStore()
        store.addNode('', 'dup', 'folder')
        store.addNode('dup', 'a.ts', 'file')
        expect(() => store.addNode('dup', 'a.ts', 'file')).toThrow(/already exists/)
    })

    test('moveNode places file inside another folder', () => {
        const store = createAssetStore()
        store.addNode('', 'models', 'folder')
        store.addNode('', 'temp', 'folder')
        store.addNode('temp', 'mesh.glb', 'file')
        store.moveNode('temp/mesh.glb', 'models', 'inside')
        expect(store.findNode(store.tree(), 'models/mesh.glb')).not.toBeNull()
        expect(store.findNode(store.tree(), 'temp/mesh.glb')).toBeNull()
    })

    test('renameNode rewrites paths under a renamed folder', () => {
        const store = createAssetStore()
        store.addNode('', 'old', 'folder')
        store.addNode('old', 'sub', 'folder')
        store.addNode('old/sub', 'f.ts', 'file')
        store.renameNode('old', 'new')
        expect(store.findNode(store.tree(), 'new/sub/f.ts')).not.toBeNull()
        expect(store.findNode(store.tree(), 'old/sub/f.ts')).toBeNull()
    })
})
