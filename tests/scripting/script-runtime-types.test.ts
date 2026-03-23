import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import {
    NullEngine,
    Scene,
    MeshBuilder,
    HemisphericLight,
    TransformNode,
    Vector3,
} from 'babylonjs'
import {
    formatError,
    getNodeTypeName,
    isNodeCompatible,
    parseScriptNodeType,
} from '../../src/scripting/ScriptRuntime'

describe('parseScriptNodeType', () => {
    test('detects MeshScript / LightScript extends', () => {
        expect(
            parseScriptNodeType('export default class extends MeshScript {\n}')
        ).toBe('Mesh')
        expect(
            parseScriptNodeType('export default class extends LightScript {}')
        ).toBe('Light')
    })

    test('reads static nodeType with single or double quotes', () => {
        expect(
            parseScriptNodeType(
                `export default class extends Script { static nodeType = 'TransformNode' }`
            )
        ).toBe('TransformNode')
        expect(
            parseScriptNodeType(
                `export default class extends Script { static nodeType = "Mesh" }`
            )
        ).toBe('Mesh')
    })

    test('returns undefined when no constraint is declared', () => {
        expect(parseScriptNodeType('export default class extends Script {}')).toBe(
            undefined
        )
    })
})

describe('formatError', () => {
    test('filters stack frames to the script path when provided', () => {
        const err = new Error('boom')
        err.stack =
            'Error: boom\n' +
            '    at run (scripts/game.ts:10:5)\n' +
            '    at engine (vendor.js:1:1)'
        const out = formatError(err, 'scripts/game.ts')
        expect(out).toContain('scripts/game.ts')
        expect(out).not.toContain('vendor.js')
    })

    test('returns non-Error values as string', () => {
        expect(formatError('plain')).toBe('plain')
    })

    test('returns only header when no stack frame matches path', () => {
        const err = new Error('x')
        err.stack = 'Error: x\n    at a (other.js:1:1)'
        expect(formatError(err, 'scripts/mine.ts')).toBe('Error: x')
    })
})

describe('getNodeTypeName + isNodeCompatible', () => {
    let engine: NullEngine
    let scene: Scene

    beforeEach(() => {
        engine = new NullEngine()
        scene = new Scene(engine)
    })

    afterEach(() => {
        scene.dispose()
        engine.dispose()
    })

    test('classifies mesh, transform, and light nodes', () => {
        const mesh = MeshBuilder.CreateBox('box', { size: 1 }, scene)
        expect(getNodeTypeName(mesh)).toBe('Mesh')

        const tn = new TransformNode('tn', scene)
        expect(getNodeTypeName(tn)).toBe('TransformNode')

        const light = new HemisphericLight('sun', Vector3.Up(), scene)
        expect(getNodeTypeName(light)).toBe('Light')
    })

    test('isNodeCompatible enforces Mesh vs TransformNode', () => {
        const mesh = MeshBuilder.CreateBox('m', { size: 1 }, scene)
        const tn = new TransformNode('t', scene)
        expect(isNodeCompatible(mesh, 'Mesh')).toBe(true)
        expect(isNodeCompatible(tn, 'Mesh')).toBe(false)
        expect(isNodeCompatible(tn, 'TransformNode')).toBe(true)
        expect(isNodeCompatible(mesh, 'Node')).toBe(true)
    })

    test('light nodes satisfy Light and Node', () => {
        const light = new HemisphericLight('L', Vector3.Up(), scene)
        expect(isNodeCompatible(light, 'Light')).toBe(true)
        expect(isNodeCompatible(light, 'Mesh')).toBe(false)
    })
})
