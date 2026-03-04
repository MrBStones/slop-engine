import type { Accessor, Setter } from 'solid-js'
import type { Scene, Node } from 'babylonjs'
import { getAssetStore, getBlob, setBlob, deleteBlob } from '../../../assetStore'
import { openScript, openScriptFile } from '../../../scriptEditorStore'
import { logs, type LogEntry } from '../../../scripting/consoleStore'
import {
    addMeshToScene,
    addLightToScene,
    updateNodeInScene,
    deleteNodeFromScene,
    getSceneSnapshot,
    importModelToScene,
    createGroupInScene,
    setParentInScene,
    executeBulkOperations,
    serializeNodeAsPrefab,
    type AddMeshOptions,
    type AddLightOptions,
    type UpdateNodeOptions,
    type CreateGroupOptions,
    type BulkOperation,
    type AssetResolver,
} from '../../../scene/SceneOperations'
import { formatLogArg } from './utils'

export interface ToolExecutorContext {
    scene: Accessor<Scene | undefined>
    selectedNode: Accessor<Node | undefined>
    setSelectedNode: (node: Node | undefined) => void
    setNodeTick: Setter<number>
    isPlaying: Accessor<boolean>
    requestPlay: () => Promise<void>
    requestStop: () => Promise<void>
}

const SCRIPT_EXT = ['.ts', '.tsx', '.js', '.jsx']
const MODEL_EXT = ['.glb', '.gltf', '.obj']
const PREFAB_EXT = '.prefab.json'
const MAX_AGENT_STEPS = 20

async function typeCheckContent(content: string): Promise<string[]> {
    try {
        const res = await fetch('/api/typecheck', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content }),
        })
        const { errors } = (await res.json()) as { errors: string[] }
        return errors
    } catch {
        return []
    }
}

interface SubagentStep {
    text: string
    toolCalls: Array<{
        toolCallId: string
        toolName: string
        args: unknown
    }>
    finishReason: string
    error?: string
}

type SubagentMessage =
    | { role: 'user'; content: string }
    | {
          role: 'assistant'
          content: Array<
              | { type: 'text'; text: string }
              | {
                    type: 'tool-call'
                    toolCallId: string
                    toolName: string
                    input: unknown
                }
          >
      }
    | {
          role: 'tool'
          content: Array<{
              type: 'tool-result'
              toolCallId: string
              toolName: string
              output: { type: 'text'; value: string }
          }>
      }

export function createToolExecutor(
    ctx: ToolExecutorContext
): (toolName: string, input: unknown) => Promise<string> {
    const executeCreateScript = async (args: {
        path: string
        content: string
    }): Promise<string> => {
        const store = getAssetStore()
        const parts = args.path.split('/')
        const fileName = parts.at(-1)!

        let parentPath = ''
        for (let i = 0; i < parts.length - 1; i++) {
            const dirName = parts[i]
            const dirPath = parentPath ? `${parentPath}/${dirName}` : dirName
            if (!store.findNode(store.tree(), dirPath)) {
                store.addNode(parentPath, dirName, 'folder')
            }
            parentPath = dirPath
        }

        if (!store.findNode(store.tree(), args.path)) {
            store.addNode(parentPath, fileName, 'file')
        }

        await setBlob(
            args.path,
            new Blob([args.content], { type: 'text/plain' })
        )

        if (openScript()?.path === args.path) {
            await openScriptFile(args.path)
        }

        const errors = await typeCheckContent(args.content)
        if (errors.length > 0) {
            return `Script created at "${
                args.path
            }" but has TypeScript errors:\n${errors.join(
                '\n'
            )}\n\nFix these errors with edit_script.`
        }

        return `Script created at "${args.path}"`
    }

    const executeGetScene = (): string => {
        const s = ctx.scene()
        if (!s) throw new Error('Scene not initialized')
        const snapshot = getSceneSnapshot(s)
        return JSON.stringify(
            {
                simulation: ctx.isPlaying() ? 'running' : 'stopped',
                nodes: snapshot,
            },
            null,
            2
        )
    }

    const executeAddMesh = (args: AddMeshOptions): string => {
        const s = ctx.scene()
        if (!s) throw new Error('Scene not initialized')
        const mesh = addMeshToScene(s, args)
        ctx.setSelectedNode(mesh)
        ctx.setNodeTick((t) => t + 1)
        return `Created ${args.type} mesh "${mesh.name}"`
    }

    const executeAddLight = (args: AddLightOptions): string => {
        const s = ctx.scene()
        if (!s) throw new Error('Scene not initialized')
        const light = addLightToScene(s, args)
        ctx.setSelectedNode(light)
        ctx.setNodeTick((t) => t + 1)
        return `Created ${args.type} light "${light.name}"`
    }

    const executeUpdateNode = (args: UpdateNodeOptions): string => {
        const s = ctx.scene()
        if (!s) throw new Error('Scene not initialized')
        updateNodeInScene(s, args)
        ctx.setNodeTick((t) => t + 1)
        const fields = Object.keys(args)
            .filter((k) => k !== 'name')
            .join(', ')
        return `Updated "${args.name}" (${fields})`
    }

    const executeDeleteNode = (args: { name: string }): string => {
        const s = ctx.scene()
        if (!s) throw new Error('Scene not initialized')
        const node = s.getNodeByName(args.name)
        if (ctx.selectedNode() === node) {
            ctx.setSelectedNode(undefined)
        }
        deleteNodeFromScene(s, args.name)
        ctx.setNodeTick((t) => t + 1)
        return `Deleted node "${args.name}"`
    }

    const executeCreateGroup = (args: CreateGroupOptions): string => {
        const s = ctx.scene()
        if (!s) throw new Error('Scene not initialized')
        const group = createGroupInScene(s, args)
        ctx.setSelectedNode(group)
        ctx.setNodeTick((t) => t + 1)
        return `Created group "${group.name}"`
    }

    const executeSetParent = (args: {
        node: string
        parent: string | null
    }): string => {
        const s = ctx.scene()
        if (!s) throw new Error('Scene not initialized')
        setParentInScene(s, args.node, args.parent)
        ctx.setNodeTick((t) => t + 1)
        return args.parent
            ? `Set parent of "${args.node}" to "${args.parent}"`
            : `Unparented "${args.node}"`
    }

    const executeBulkScene = (args: {
        operations: BulkOperation[]
    }): string => {
        const s = ctx.scene()
        if (!s) throw new Error('Scene not initialized')
        const results = executeBulkOperations(s, args.operations)
        ctx.setNodeTick((t) => t + 1)
        const succeeded = results.filter((r) => r.success).length
        const failed = results.filter((r) => !r.success).length
        const summary = results
            .map((r) => (r.success ? `OK: ${r.message}` : `FAIL: ${r.message}`))
            .join('\n')
        return `Bulk: ${succeeded} succeeded, ${failed} failed\n${summary}`
    }

    const executeListScripts = (): string => {
        const store = getAssetStore()
        const allFiles = store.collectFilePaths(store.tree())
        const scripts = allFiles.filter((p) =>
            SCRIPT_EXT.some((ext) => p.toLowerCase().endsWith(ext))
        )
        if (scripts.length === 0) return 'No scripts found in asset store.'
        return JSON.stringify(scripts)
    }

    const executeAttachScript = (args: {
        node: string
        script: string
    }): string => {
        const s = ctx.scene()
        if (!s) throw new Error('Scene not initialized')
        const node = s.getNodeByName(args.node)
        if (!node) throw new Error(`Node "${args.node}" not found`)
        if (!node.metadata) node.metadata = {}
        const meta = node.metadata as Record<string, unknown>
        const scripts = (meta.scripts as string[] | undefined) ?? []
        if (scripts.includes(args.script)) {
            return `"${args.script}" is already attached to "${args.node}"`
        }
        meta.scripts = [...scripts, args.script]
        ctx.setNodeTick((t) => t + 1)
        return `Attached "${args.script}" to "${args.node}"`
    }

    const executeDetachScript = (args: {
        node: string
        script: string
    }): string => {
        const s = ctx.scene()
        if (!s) throw new Error('Scene not initialized')
        const node = s.getNodeByName(args.node)
        if (!node) throw new Error(`Node "${args.node}" not found`)
        const meta = node.metadata as { scripts?: string[] } | undefined
        const scripts = meta?.scripts ?? []
        if (!scripts.includes(args.script)) {
            throw new Error(
                `"${args.script}" is not attached to "${args.node}"`
            )
        }
        ;(node.metadata as Record<string, unknown>).scripts = scripts.filter(
            (s) => s !== args.script
        )
        ctx.setNodeTick((t) => t + 1)
        return `Detached "${args.script}" from "${args.node}"`
    }

    const executeReadScript = async (args: {
        path: string
    }): Promise<string> => {
        const blob = await getBlob(args.path)
        if (!blob) throw new Error(`Script "${args.path}" not found`)
        return await blob.text()
    }

    const executeEditScript = async (args: {
        path: string
        old_string: string
        new_string: string
    }): Promise<string> => {
        const blob = await getBlob(args.path)
        if (!blob) throw new Error(`Script "${args.path}" not found`)
        const content = await blob.text()

        const normalizedContent = content.replace(/\r\n/g, '\n')
        const normalizedOld = args.old_string.replace(/\r\n/g, '\n')

        if (!normalizedContent.includes(normalizedOld)) {
            throw new Error(
                `Could not find the specified text in "${args.path}". Make sure you use read_script first and copy the exact text including whitespace. Current file content:\n\`\`\`\n${normalizedContent}\n\`\`\``
            )
        }
        const updated = normalizedContent.replace(
            normalizedOld,
            () => args.new_string
        )
        await setBlob(args.path, new Blob([updated], { type: 'text/plain' }))
        if (openScript()?.path === args.path) {
            await openScriptFile(args.path)
        }

        const errors = await typeCheckContent(updated)
        if (errors.length > 0) {
            return `Edited "${
                args.path
            }" but it has TypeScript errors:\n${errors.join(
                '\n'
            )}\n\nFix these errors with edit_script.`
        }

        return `Edited "${args.path}"`
    }

    const executeDeleteScript = async (args: {
        path: string
    }): Promise<string> => {
        const s = ctx.scene()
        if (s) {
            const allNodes = [
                ...s.meshes,
                ...s.lights,
                ...s.cameras,
                ...s.transformNodes,
            ]
            for (const node of allNodes) {
                const meta = node.metadata as { scripts?: string[] } | undefined
                if (meta?.scripts?.includes(args.path)) {
                    meta.scripts = meta.scripts.filter((p) => p !== args.path)
                }
            }
        }

        await deleteBlob(args.path)
        const store = getAssetStore()
        if (store.findNode(store.tree(), args.path)) {
            store.deleteNode(args.path)
        }

        ctx.setNodeTick((t) => t + 1)
        return `Deleted script "${args.path}"`
    }

    const executeListAssets = (): string => {
        const store = getAssetStore()
        const allFiles = store.collectFilePaths(store.tree())
        const models = allFiles.filter((p) =>
            MODEL_EXT.some((ext) => p.toLowerCase().endsWith(ext))
        )
        if (models.length === 0) return 'No model assets found in asset store.'
        return JSON.stringify(models)
    }

    const resolveAsset: AssetResolver = (path) => getBlob(path)

    const executeImportAsset = async (args: {
        path: string
        position?: [number, number, number]
        scale?: [number, number, number]
    }): Promise<string> => {
        const s = ctx.scene()
        if (!s) throw new Error('Scene not initialized')

        const store = getAssetStore()
        const node = store.findNode(store.tree(), args.path)
        if (!node || node.type !== 'file') {
            throw new Error(`Asset "${args.path}" not found in asset store`)
        }

        const blob = await getBlob(args.path)
        if (!blob) throw new Error(`Could not read asset "${args.path}"`)

        const filename = args.path.slice(args.path.lastIndexOf('/') + 1)
        const lastSlash = args.path.lastIndexOf('/')
        const assetDir = lastSlash > 0 ? args.path.slice(0, lastSlash) : ''

        const root = await importModelToScene(
            s,
            blob,
            filename,
            assetDir,
            resolveAsset
        )

        if (args.position) {
            root.position.set(
                args.position[0],
                args.position[1],
                args.position[2]
            )
        }
        if (args.scale) {
            root.scaling.set(args.scale[0], args.scale[1], args.scale[2])
        }

        ctx.setSelectedNode(root)
        ctx.setNodeTick((t) => t + 1)
        return `Imported "${args.path}" as "${root.name}"`
    }

    const executeSavePrefab = async (args: {
        node: string
        path?: string
    }): Promise<string> => {
        const s = ctx.scene()
        if (!s) throw new Error('Scene not initialized')

        const sourceNode = s.getNodeByName(args.node)
        if (!sourceNode) {
            throw new Error(`Node "${args.node}" not found`)
        }

        const store = getAssetStore()

        const sanitizedNodeName = args.node.trim().replaceAll(/[\\/]+/g, '_')
        if (!sanitizedNodeName) {
            throw new Error('Node name is empty')
        }

        let path = args.path?.trim() || `prefabs/${sanitizedNodeName}`
        if (path.startsWith('/')) path = path.slice(1)
        if (!path.endsWith(PREFAB_EXT)) {
            path = `${path}${PREFAB_EXT}`
        }

        const segments = path.split('/').filter(Boolean)
        if (segments.length === 0) {
            throw new Error('Invalid prefab path')
        }

        const fileName = segments.at(-1)!
        let parentPath = ''
        for (let i = 0; i < segments.length - 1; i++) {
            const dirName = segments[i]
            const dirPath = parentPath ? `${parentPath}/${dirName}` : dirName
            if (!store.findNode(store.tree(), dirPath)) {
                store.addNode(parentPath, dirName, 'folder')
            }
            parentPath = dirPath
        }

        if (!store.findNode(store.tree(), path)) {
            store.addNode(parentPath, fileName, 'file')
        }

        const json = serializeNodeAsPrefab(sourceNode)
        await setBlob(path, new Blob([json], { type: 'application/json' }))

        return `Saved "${args.node}" as prefab at "${path}"`
    }

    const executePlaySimulation = async (): Promise<string> => {
        if (ctx.isPlaying()) return 'Simulation is already running'
        await ctx.requestPlay()
        return 'Simulation started'
    }

    const executeStopSimulation = async (): Promise<string> => {
        if (!ctx.isPlaying()) return 'Simulation is already stopped'
        await ctx.requestStop()
        return 'Simulation stopped'
    }

    const executeSleep = async (args: { seconds: number }): Promise<string> => {
        const sec = Math.min(30, Math.max(0.1, args.seconds))
        await new Promise((r) => setTimeout(r, sec * 1000))
        return `Waited ${sec} seconds`
    }

    const executeGetConsoleLogs = (): string => {
        const entries = logs()
        if (entries.length === 0) return 'No console logs yet.'
        const formatted = entries.map((e: LogEntry) => ({
            level: e.level,
            message: e.args.map(formatLogArg).join(' '),
            timestamp: e.timestamp,
        }))
        return JSON.stringify(formatted, null, 2)
    }

    const executeSpawnAgent = async (args: {
        agentType: 'scene' | 'script'
        task: string
        context?: string
    }): Promise<string> => {
        const userContent = args.context
            ? `${args.task}\n\nContext:\n${args.context}`
            : args.task

        const messages: SubagentMessage[] = [
            { role: 'user', content: userContent },
        ]

        const actionsLog: string[] = []
        let finalText = ''

        for (let step = 0; step < MAX_AGENT_STEPS; step++) {
            const res = await fetch('/api/subagent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages, agentType: args.agentType }),
            })

            if (!res.ok) {
                const err = (await res.json().catch(() => ({}))) as {
                    error?: string
                }
                throw new Error(
                    err.error ?? `Subagent request failed (${res.status})`
                )
            }

            const data = (await res.json()) as SubagentStep

            const assistantContent: Extract<
                SubagentMessage,
                { role: 'assistant' }
            >['content'] = []
            if (data.text) {
                assistantContent.push({ type: 'text', text: data.text })
                finalText = data.text
            }
            for (const tc of data.toolCalls) {
                assistantContent.push({
                    type: 'tool-call',
                    toolCallId: tc.toolCallId,
                    toolName: tc.toolName,
                    input: tc.args,
                })
            }
            if (assistantContent.length > 0) {
                messages.push({ role: 'assistant', content: assistantContent })
            }

            if (data.toolCalls.length === 0) break

            const toolResults: Extract<
                SubagentMessage,
                { role: 'tool' }
            >['content'] = []
            for (const tc of data.toolCalls) {
                let result: string
                try {
                    result = await executeTool(tc.toolName, tc.args)
                    actionsLog.push(`${tc.toolName}: ${result}`)
                } catch (err) {
                    result = `Error: ${
                        err instanceof Error ? err.message : String(err)
                    }`
                    actionsLog.push(`${tc.toolName} FAILED: ${result}`)
                }
                toolResults.push({
                    type: 'tool-result',
                    toolCallId: tc.toolCallId,
                    toolName: tc.toolName,
                    output: { type: 'text', value: result },
                })
            }
            messages.push({ role: 'tool', content: toolResults })

            if (data.finishReason === 'stop') break
        }

        const lines: string[] = []
        if (finalText) lines.push(finalText)
        if (actionsLog.length > 0) {
            lines.push(`\nActions taken (${actionsLog.length}):`)
            lines.push(...actionsLog.map((a) => `  • ${a}`))
        }
        return lines.join('\n') || 'Agent completed with no output.'
    }

    const executeTool = async (
        toolName: string,
        input: unknown
    ): Promise<string> => {
        switch (toolName) {
            case 'create_script':
                return executeCreateScript(
                    input as { path: string; content: string }
                )
            case 'get_scene':
                return executeGetScene()
            case 'add_mesh':
                return executeAddMesh(input as AddMeshOptions)
            case 'add_light':
                return executeAddLight(input as AddLightOptions)
            case 'update_node':
                return executeUpdateNode(input as UpdateNodeOptions)
            case 'delete_node':
                return executeDeleteNode(input as { name: string })
            case 'create_group':
                return executeCreateGroup(input as CreateGroupOptions)
            case 'set_parent':
                return executeSetParent(
                    input as { node: string; parent: string | null }
                )
            case 'bulk_scene':
                return executeBulkScene(
                    input as { operations: BulkOperation[] }
                )
            case 'list_scripts':
                return executeListScripts()
            case 'attach_script':
                return executeAttachScript(
                    input as { node: string; script: string }
                )
            case 'detach_script':
                return executeDetachScript(
                    input as { node: string; script: string }
                )
            case 'read_script':
                return executeReadScript(input as { path: string })
            case 'edit_script':
                return executeEditScript(
                    input as {
                        path: string
                        old_string: string
                        new_string: string
                    }
                )
            case 'delete_script':
                return executeDeleteScript(input as { path: string })
            case 'list_assets':
                return executeListAssets()
            case 'import_asset':
                return executeImportAsset(
                    input as {
                        path: string
                        position?: [number, number, number]
                        scale?: [number, number, number]
                    }
                )
            case 'save_prefab':
                return executeSavePrefab(
                    input as { node: string; path?: string }
                )
            case 'play_simulation':
                return executePlaySimulation()
            case 'stop_simulation':
                return executeStopSimulation()
            case 'sleep':
                return executeSleep(input as { seconds: number })
            case 'get_console_logs':
                return executeGetConsoleLogs()
            case 'spawn_agent':
                return executeSpawnAgent(
                    input as {
                        agentType: 'scene' | 'script'
                        task: string
                        context?: string
                    }
                )
            default:
                throw new Error(`Unknown tool: ${toolName}`)
        }
    }

    return executeTool
}
