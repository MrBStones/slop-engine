import { describe, expect, test } from 'bun:test'
import {
    detectBaseClass,
    extractClassBody,
    generateScriptRegistry,
    inferTypeFromLiteral,
    parseMembers,
} from '../../src/scripting/scriptRegistry'

describe('inferTypeFromLiteral', () => {
    test('maps literals to TS types', () => {
        expect(inferTypeFromLiteral('42')).toBe('number')
        expect(inferTypeFromLiteral('-3.5')).toBe('number')
        expect(inferTypeFromLiteral('true')).toBe('boolean')
        expect(inferTypeFromLiteral("'hi'")).toBe('string')
        expect(inferTypeFromLiteral('vec3(0,1,0)')).toBe('Vector3')
        expect(inferTypeFromLiteral('rgb(1,0,0)')).toBe('Color3')
        expect(inferTypeFromLiteral('[1,2]')).toBe('any[]')
    })

    test('returns null for unknown expressions', () => {
        expect(inferTypeFromLiteral('someVar')).toBeNull()
    })
})

describe('extractClassBody', () => {
    test('returns inner body for export default class', () => {
        const src = `
export default class Foo extends Script {
  hp = 100
  start() {}
}`
        const body = extractClassBody(src)
        expect(body).toContain('hp = 100')
        expect(body).toContain('start()')
    })

    test('returns null when there is no default-exported class', () => {
        expect(extractClassBody('const x = 1')).toBeNull()
    })
})

describe('parseMembers', () => {
    test('collects fields and methods and skips lifecycle + private', () => {
        const body = `
  hp: number = 10
  alive = true
  _secret = 1
  start() {}
  takeDamage(amount: number): void {
  }
  async load(): Promise<void> {
  }
`
        const members = parseMembers(body)
        const names = members.map((m) => m.name).sort()
        expect(names).toEqual(['alive', 'hp', 'load', 'takeDamage'])
        expect(members.find((m) => m.name === 'hp')?.signature).toContain(
            'hp: number'
        )
        expect(members.find((m) => m.name === 'takeDamage')?.signature).toContain(
            'takeDamage(amount: number): void'
        )
        expect(members.find((m) => m.name === 'load')?.signature).toContain(
            'Promise'
        )
    })
})

describe('detectBaseClass', () => {
    test('reads MeshScript / LightScript / Script (anonymous default class is not supported)', () => {
        expect(
            detectBaseClass(
                'export default class Player extends MeshScript { }'
            )
        ).toBe('MeshScript')
        expect(
            detectBaseClass(
                'export default class Lamp extends LightScript { }'
            )
        ).toBe('LightScript')
        expect(
            detectBaseClass('export default class Foo extends Script { }')
        ).toBe('Script')
    })
})

describe('generateScriptRegistry', () => {
    test('returns empty string when nothing parseable exists', () => {
        expect(generateScriptRegistry([])).toBe('')
        expect(
            generateScriptRegistry([
                { path: 'scripts/empty.ts', source: 'export default 1' },
            ])
        ).toBe('')
    })

    test('emits ScriptRegistry entries with path keys and member signatures', () => {
        const decl = generateScriptRegistry([
            {
                path: 'scripts/Player.ts',
                source: `
export default class Player extends Script {
  health: number = 100
  alive = true
  takeDamage(n: number): void {
  }
}
`,
            },
        ])
        expect(decl).toContain("'scripts/Player.ts'")
        expect(decl).toContain('Script & {')
        expect(decl).toContain('health: number')
        expect(decl).toContain('alive: boolean')
        expect(decl).toContain('takeDamage(n: number): void')
        expect(decl).toContain('interface ScriptRegistry')
        expect(decl).toContain('getScript<P extends keyof ScriptRegistry>')
    })

    test('uses MeshScript as base when class extends MeshScript', () => {
        const decl = generateScriptRegistry([
            {
                path: 'scripts/Bullet.ts',
                source: `
export default class Bullet extends MeshScript {
  speed = 10
}
`,
            },
        ])
        expect(decl).toContain('MeshScript & {')
        expect(decl).toContain('speed: number')
    })
})
