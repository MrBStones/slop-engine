import { describe, expect, test } from 'bun:test'
import { compileScript } from '../../src/scripting/ScriptRuntime'

describe('compileScript', () => {
    test('compiles default export class extending Script', () => {
        const Ctor = compileScript(
            `
export default class extends Script {
    start() {
        this.ran = true
    }
}
`,
            'scripts/Minimal.ts'
        )
        const inst = new Ctor() as InstanceType<typeof Ctor> & { ran?: boolean }
        inst.start()
        expect(inst.ran).toBe(true)
    })

    test('exposes vec3, rgb, and SlopMath on Math', () => {
        const Ctor = compileScript(
            `
export default class extends Script {
    start() {
        const v = vec3(1, 2, 3)
        const c = rgb(0.1, 0.2, 0.3)
        if (v.x !== 1 || v.y !== 2 || v.z !== 3) throw new Error('vec3')
        if (c.r !== 0.1) throw new Error('rgb')
        if (Math.clamp(5, 0, 10) !== 5) throw new Error('clamp')
        if (Math.lerp(0, 100, 0.25) !== 25) throw new Error('lerp')
        if (Math.degToRad(180) !== Math.PI) throw new Error('degToRad')
        const s = Math.smoothstep(0, 1, 0.5)
        if (s <= 0 || s >= 1) throw new Error('smoothstep')
        if (Math.remap(5, 0, 10, 0, 100) !== 50) throw new Error('remap')
        if (Math.moveTowards(0, 10, 3) !== 3) throw new Error('moveTowards')
        if (Math.pingPong(3, 2) !== 1) throw new Error('pingPong')
    }
}
`,
            'scripts/MathCheck.ts'
        )
        new Ctor().start()
    })

    test('MeshScript subclass carries static nodeType Mesh', () => {
        const Ctor = compileScript(
            `
export default class extends MeshScript {
    start() {}
}
`,
            'scripts/MeshOnly.ts'
        )
        expect(Ctor.nodeType).toBe('Mesh')
    })

    test('static nodeType string is visible on constructor', () => {
        const Ctor = compileScript(
            `
export default class extends Script {
    static nodeType = 'Light'
    start() {}
}
`,
            'scripts/LightTagged.ts'
        )
        expect(Ctor.nodeType).toBe('Light')
    })

    test('throws when default export is not a function', () => {
        expect(() =>
            compileScript(`export default 42`, 'scripts/Bad.ts')
        ).toThrow(/Script must export a default class/)
    })

    test('rejects source with syntax errors', () => {
        expect(() => compileScript(`export default class {`, 'scripts/Syntax.ts')).toThrow()
    })
})
