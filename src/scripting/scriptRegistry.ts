/**
 * Auto-generates a TypeScript `ScriptRegistry` interface by parsing all
 * script files.  The output is fed to Monaco as an extra lib so that
 * `getScript('scripts/Foo.ts')` resolves to the correct instance type.
 */

/** A script file to be analysed. */
export interface ScriptSource {
    path: string
    source: string
}

// Lifecycle methods inherited from Script — skip these in the registry.
const LIFECYCLE = new Set(['start', 'update', 'destroy'])

/**
 * Infer a TypeScript type string from a literal value token.
 * Returns `null` if the value is not a recognisable literal.
 */
export function inferTypeFromLiteral(value: string): string | null {
    value = value.trim()
    if (/^-?\d+(\.\d+)?$/.test(value)) return 'number'
    if (value === 'true' || value === 'false') return 'boolean'
    if (/^['"`]/.test(value)) return 'string'
    if (value === 'null') return 'null'
    if (value === 'undefined') return 'undefined'
    // vec3(...) / rgb(...) helpers
    if (/^vec3\s*\(/.test(value)) return 'Vector3'
    if (/^rgb\s*\(/.test(value)) return 'Color3'
    if (/^new\s+Vector3\s*\(/.test(value)) return 'Vector3'
    if (/^new\s+Color3\s*\(/.test(value)) return 'Color3'
    if (/^new\s+Color4\s*\(/.test(value)) return 'Color4'
    if (/^new\s+Quaternion\s*\(/.test(value)) return 'Quaternion'
    if (/^\[/.test(value)) return 'any[]'
    return null
}

/**
 * Extract the class body from a script source string.
 * Returns the content between the opening `{` of the default-exported
 * class and its matching `}`, or `null` if not found.
 */
export function extractClassBody(source: string): string | null {
    // Match: export default class ... {
    const classMatch = source.match(
        /export\s+default\s+class\s+[^{]*\{/
    )
    if (!classMatch) return null

    const startIdx = classMatch.index! + classMatch[0].length
    let depth = 1
    let i = startIdx
    while (i < source.length && depth > 0) {
        if (source[i] === '{') depth++
        else if (source[i] === '}') depth--
        i++
    }
    if (depth !== 0) return null
    // Exclude the final closing brace
    return source.slice(startIdx, i - 1)
}

/** A parsed member of a script class. */
export interface ParsedMember {
    name: string
    signature: string // e.g. "hp: number" or "takeDamage(amount: number): void"
}

/**
 * Parse public fields and methods from a class body string.
 */
export function parseMembers(classBody: string): ParsedMember[] {
    const members: ParsedMember[] = []

    // Split into top-level statements by scanning for lines at depth 0.
    // We process line-by-line but track brace depth to skip method bodies.
    const lines = classBody.split('\n')
    let depth = 0

    for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
            continue
        }

        // Only process declarations at the class body's top level
        if (depth === 0) {
            // Try to match a field declaration:
            //   fieldName: Type = value
            //   fieldName = value
            //   fieldName: Type
            //   fieldName!: Type
            const fieldMatch = trimmed.match(
                /^(\w+)\s*[!?]?\s*(?::\s*([^=]+?))?\s*(?:=\s*(.+?))?$/
            )
            if (fieldMatch && !trimmed.includes('(')) {
                const [, name, declaredType, initialiser] = fieldMatch
                // Skip private/internal, lifecycle, and static
                if (name.startsWith('_') || LIFECYCLE.has(name) || trimmed.startsWith('static')) {
                    for (const ch of line) {
                        if (ch === '{') depth++
                        else if (ch === '}') depth--
                    }
                    continue
                }
                const type =
                    declaredType?.trim() ||
                    (initialiser
                        ? inferTypeFromLiteral(initialiser)
                        : null) ||
                    'any'
                members.push({ name, signature: `${name}: ${type}` })
                for (const ch of line) {
                    if (ch === '{') depth++
                    else if (ch === '}') depth--
                }
                continue
            }

            // Try to match a method declaration:
            //   methodName(params): ReturnType {
            //   methodName(params) {
            //   async methodName(params): Promise<ReturnType> {
            const methodMatch = trimmed.match(
                /^(?:async\s+)?(\w+)\s*(\([^)]*\))\s*(?::\s*([^{]+?))?\s*\{?\s*$/
            )
            if (methodMatch) {
                const [, name, params, returnType] = methodMatch
                if (
                    !name.startsWith('_') &&
                    !LIFECYCLE.has(name) &&
                    name !== 'constructor'
                ) {
                    const ret = returnType?.trim() || 'void'
                    const isAsync = trimmed.startsWith('async')
                    const finalRet =
                        isAsync && !ret.startsWith('Promise')
                            ? `Promise<${ret}>`
                            : ret
                    members.push({
                        name,
                        signature: `${name}${params}: ${finalRet}`,
                    })
                }
            }
        }

        // Track brace depth
        for (const ch of line) {
            if (ch === '{') depth++
            else if (ch === '}') depth--
        }
    }

    return members
}

/**
 * Detect which base class the script extends to set the correct
 * registry type (Script & ... vs MeshScript & ... etc.)
 */
export function detectBaseClass(source: string): string {
    const match = source.match(
        /export\s+default\s+class\s+\w*\s+extends\s+(MeshScript|LightScript|Script)/
    )
    return match?.[1] ?? 'Script'
}

/**
 * Generate a TypeScript declaration string containing the ScriptRegistry
 * interface and overloaded getScript/getScriptOn signatures.
 *
 * @param scripts  All script files in the project (path + source).
 * @returns A declaration string to feed to Monaco as an extra lib.
 */
export function generateScriptRegistry(scripts: ScriptSource[]): string {
    const entries: string[] = []

    for (const { path, source } of scripts) {
        const classBody = extractClassBody(source)
        if (!classBody) continue

        const members = parseMembers(classBody)
        if (members.length === 0) continue

        const base = detectBaseClass(source)
        const membersStr = members
            .map((m) => `        ${m.signature}`)
            .join('\n')
        entries.push(
            `    '${path}': ${base} & {\n${membersStr}\n    }`
        )
    }

    if (entries.length === 0) return ''

    return `// Auto-generated script registry — do not edit manually.
interface ScriptRegistry {
${entries.join('\n')}
}

declare class Script {
    getScript<P extends keyof ScriptRegistry>(path: P): ScriptRegistry[P] | null
    getScript<T = Script>(path: string): T | null
    getScriptOn<P extends keyof ScriptRegistry>(node: SceneNode, path: P): ScriptRegistry[P] | null
    getScriptOn<T = Script>(node: SceneNode, path: string): T | null
}
`
}
