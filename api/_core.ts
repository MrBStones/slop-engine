import { createAzure } from '@ai-sdk/azure'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import {
    streamText,
    generateText,
    convertToModelMessages,
    type UIMessage,
} from 'ai'
import { Readable } from 'node:stream'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { ReadableStream as WebReadableStream } from 'node:stream/web'

import {
    buildSceneAgentSystemPrompt,
    buildScriptAgentSystemPrompt,
    buildUIAgentSystemPrompt,
    buildAssetAgentSystemPrompt,
    buildTestAgentSystemPrompt,
    buildCoordinatorSystemPrompt,
} from '../src/server/prompts'
import {
    getSceneTool,
    playSimulationTool,
    stopSimulationTool,
    sleepTool,
    getConsoleLogsTool,
    runAutonomousTestTool,
    spawnAgentTool,
    askClarificationTool,
    presentPlanTool,
    generateImageTool,
    generateTripoMeshTool,
    createScriptTool,
    listScriptsTool,
    readScriptTool,
    editScriptTool,
    deleteScriptTool,
    attachScriptTool,
    detachScriptTool,
    addMeshTool,
    addLightTool,
    updateNodeTool,
    deleteNodeTool,
    createGroupTool,
    setParentTool,
    bulkSceneTool,
    listAssetsTool,
    importAssetTool,
    savePrefabTool,
    lookupScriptingApiTool,
    listImageAssetsTool,
    applyTextureTool,
    removeTextureTool,
    updateMaterialPropertiesTool,
    setBillboardModeTool,
    deleteAssetTool,
    createAssetFolderTool,
} from '../src/server/tools'
import { typeCheckScript } from '../src/server/script-typecheck'
import { createLookupHandler } from '../src/server/api-lookup'
import { generateImage, pollTaskResult } from '../src/server/nanobanana'
import {
    tripoPollUntilModelReady,
    tripoSubmitTextToModel,
} from '../src/server/tripo'

type NodeRequest = {
    method?: string
    body?: unknown
    url?: string
    on: (event: 'data' | 'end', callback: (chunk?: Buffer) => void) => void
}

type NodeResponse = {
    statusCode: number
    headersSent?: boolean
    setHeader: (name: string, value: string) => void
    end: (body?: string) => void
}

type SubagentMessage = {
    role: 'user' | 'assistant' | 'tool'
    content: unknown
}

type ModelSettings = {
    provider: 'azure' | 'openrouter' | 'google'
    models: Record<string, string>
    credentials?: {
        azureApiKey?: string
        azureResourceName?: string
        openrouterApiKey?: string
        googleApiKey?: string
    }
}

type AgentType = 'orchestrator' | 'scene' | 'script' | 'ui' | 'asset' | 'test'

type AnyToolCall = {
    toolCallId: string
    toolName: string
    input: unknown
}

let apiDtsCache: string | null = null
let lookupHandlerCache: ((topic: string) => string) | null = null

function projectRoot() {
    return process.cwd()
}

function getApiDtsContent() {
    if (apiDtsCache) return apiDtsCache
    apiDtsCache = readFileSync(
        resolve(projectRoot(), 'src/scripting/api.d.ts'),
        'utf-8'
    )
    return apiDtsCache
}

function getLookupHandler() {
    if (lookupHandlerCache) return lookupHandlerCache
    lookupHandlerCache = createLookupHandler(projectRoot())
    return lookupHandlerCache
}

function envRecord() {
    return process.env as Record<string, string | undefined>
}

async function readRequestBody(req: NodeRequest): Promise<string> {
    if (typeof req.body === 'string') return req.body
    if (req.body && typeof req.body === 'object') {
        return JSON.stringify(req.body)
    }

    return await new Promise<string>((resolveBody) => {
        let data = ''
        req.on('data', (chunk: Buffer) => {
            data += chunk.toString()
        })
        req.on('end', () => resolveBody(data))
    })
}

async function readJsonBody<T>(req: NodeRequest): Promise<T> {
    const raw = await readRequestBody(req)
    return JSON.parse(raw) as T
}

function methodNotAllowed(res: NodeResponse) {
    res.statusCode = 405
    res.end('Method Not Allowed')
}

function sendJson(res: NodeResponse, payload: unknown, statusCode = 200) {
    res.statusCode = statusCode
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(payload))
}

function getModel(
    settings: ModelSettings | undefined,
    agentType: AgentType,
    envDefault: string
) {
    const env = envRecord()
    const modelId = settings?.models?.[agentType]?.trim() || envDefault
    const credentials = settings?.credentials

    if (settings?.provider === 'openrouter') {
        const openrouter = createOpenRouter({
            apiKey:
                credentials?.openrouterApiKey?.trim() ||
                env.OPENROUTER_API_KEY,
        })
        return openrouter.chat(modelId)
    }

    if (settings?.provider === 'google') {
        const google = createGoogleGenerativeAI({
            apiKey: credentials?.googleApiKey?.trim() || env.GOOGLE_API_KEY,
        })
        return google(modelId)
    }

    const azure = createAzure({
        apiKey:
            credentials?.azureApiKey?.trim() || env.AZURE_OPENAI_API_KEY,
        resourceName:
            credentials?.azureResourceName?.trim() ||
            env.AZURE_OPENAI_RESOURCE_NAME,
    })

    return azure(modelId)
}

export async function handleLookupScriptingApi(req: NodeRequest, res: NodeResponse) {
    if (req.method !== 'POST') {
        methodNotAllowed(res)
        return
    }

    try {
        const { topic } = await readJsonBody<{ topic: string }>(req)
        const result = getLookupHandler()(typeof topic === 'string' ? topic : '')
        sendJson(res, { content: result })
    } catch (error) {
        console.error('[lookup-scripting-api]', error)
        sendJson(
            res,
            {
                error:
                    error instanceof Error
                        ? error.message
                        : 'Lookup failed',
            },
            500
        )
    }
}

export async function handleTypecheck(req: NodeRequest, res: NodeResponse) {
    if (req.method !== 'POST') {
        methodNotAllowed(res)
        return
    }

    try {
        const { content } = await readJsonBody<{ content: string }>(req)
        const errors = typeCheckScript(content, getApiDtsContent())
        sendJson(res, { errors })
    } catch (error) {
        console.error('[typecheck]', error)
        sendJson(
            res,
            {
                errors: [
                    error instanceof Error ? error.message : 'Typecheck failed',
                ],
            },
            500
        )
    }
}

export async function handleChat(req: NodeRequest, res: NodeResponse) {
    if (req.method !== 'POST') {
        methodNotAllowed(res)
        return
    }

    try {
        const { messages, modelSettings, selectedNode } = await readJsonBody<{
            messages: UIMessage[]
            modelSettings?: ModelSettings
            selectedNode?: { name: string; type: string }
        }>(req)

        const modelMessages = await convertToModelMessages(messages, {
            ignoreIncompleteToolCalls: true,
        })
        const model = getModel(
            modelSettings,
            'orchestrator',
            envRecord().AZURE_OPENAI_DEPLOYMENT ?? 'gpt-5.2-chat'
        )

        const result = streamText({
            model,
            system: buildCoordinatorSystemPrompt(selectedNode),
            tools: {
                get_scene: getSceneTool,
                spawn_agent: spawnAgentTool,
                ask_clarification: askClarificationTool,
                present_plan: presentPlanTool,
            },
            messages: modelMessages,
        })

        const webResponse = result.toUIMessageStreamResponse()

        res.statusCode = webResponse.status
        webResponse.headers.forEach((value, key) => {
            res.setHeader(key, value)
        })

        if (webResponse.body) {
            const nodeStream = Readable.fromWeb(
                webResponse.body as WebReadableStream
            )
            nodeStream.pipe(res as unknown as NodeJS.WritableStream)
        } else {
            res.end()
        }
    } catch (error) {
        console.error('[chat-api]', error)
        if (!res.headersSent) {
            sendJson(
                res,
                {
                    error:
                        error instanceof Error
                            ? error.message
                            : 'Internal server error',
                },
                500
            )
        }
    }
}

export async function handleGenerateTripoMesh(req: NodeRequest, res: NodeResponse) {
    if (req.method !== 'POST') {
        methodNotAllowed(res)
        return
    }

    const apiKey = envRecord().TRIPO_API_KEY
    if (!apiKey) {
        sendJson(res, { error: 'TRIPO_API_KEY not configured' }, 500)
        return
    }

    try {
        const { prompt, path, negativePrompt } = await readJsonBody<{
            prompt: string
            path: string
            negativePrompt?: string
        }>(req)

        if (!prompt || !path) {
            sendJson(res, { error: 'prompt and path are required' }, 400)
            return
        }

        if (!path.toLowerCase().endsWith('.glb')) {
            sendJson(res, { error: 'path must end with .glb' }, 400)
            return
        }

        const taskId = await tripoSubmitTextToModel({
            apiKey,
            prompt,
            negativePrompt,
        })
        const { modelUrl } = await tripoPollUntilModelReady({ apiKey, taskId })
        const glbRes = await fetch(modelUrl)

        if (!glbRes.ok) {
            sendJson(res, { error: 'Failed to download generated GLB' }, 500)
            return
        }

        const buf = await glbRes.arrayBuffer()
        const base64 = Buffer.from(buf).toString('base64')
        const contentType =
            glbRes.headers.get('content-type') ?? 'model/gltf-binary'
        sendJson(res, { path, base64, contentType })
    } catch (error) {
        console.error('[generate-tripo-mesh]', error)
        if (!res.headersSent) {
            sendJson(
                res,
                {
                    error:
                        error instanceof Error
                            ? error.message
                            : 'Tripo mesh generation failed',
                },
                500
            )
        }
    }
}

export async function handleGenerateImage(req: NodeRequest, res: NodeResponse) {
    if (req.method !== 'POST') {
        methodNotAllowed(res)
        return
    }

    const apiKey = envRecord().NANOBANANA_API_KEY
    if (!apiKey) {
        sendJson(res, { error: 'NANOBANANA_API_KEY not configured' }, 500)
        return
    }

    try {
        const { prompt, path, imageSize } = await readJsonBody<{
            prompt: string
            path: string
            imageSize?: string
        }>(req)

        if (!prompt || !path) {
            sendJson(res, { error: 'prompt and path are required' }, 400)
            return
        }

        const { taskId } = await generateImage({
            apiKey,
            prompt,
            imageSize: imageSize as
                | '1:1'
                | '9:16'
                | '16:9'
                | '3:4'
                | '4:3'
                | '3:2'
                | '2:3'
                | '5:4'
                | '4:5'
                | '21:9'
                | undefined,
        })
        const result = await pollTaskResult({ apiKey, taskId })
        if (!result) {
            sendJson(
                res,
                { error: 'Image generation failed or timed out' },
                500
            )
            return
        }

        const imgRes = await fetch(result.resultImageUrl)
        if (!imgRes.ok) {
            sendJson(res, { error: 'Failed to download generated image' }, 500)
            return
        }

        const buf = await imgRes.arrayBuffer()
        const base64 = Buffer.from(buf).toString('base64')
        const contentType = imgRes.headers.get('content-type') ?? 'image/png'
        sendJson(res, { path, base64, contentType })
    } catch (error) {
        console.error('[generate-image]', error)
        if (!res.headersSent) {
            sendJson(
                res,
                {
                    error:
                        error instanceof Error
                            ? error.message
                            : 'Image generation failed',
                },
                500
            )
        }
    }
}

export async function handleSubagent(req: NodeRequest, res: NodeResponse) {
    if (req.method !== 'POST') {
        methodNotAllowed(res)
        return
    }

    try {
        const { messages, agentType, modelSettings } = await readJsonBody<{
            messages: SubagentMessage[]
            agentType: 'scene' | 'script' | 'ui' | 'asset' | 'test'
            modelSettings?: ModelSettings
        }>(req)

        const isScriptingAgent = agentType === 'script' || agentType === 'ui'

        const system =
            agentType === 'script'
                ? buildScriptAgentSystemPrompt(projectRoot())
                : agentType === 'ui'
                ? buildUIAgentSystemPrompt(projectRoot())
                : agentType === 'asset'
                ? buildAssetAgentSystemPrompt()
                : agentType === 'test'
                ? buildTestAgentSystemPrompt()
                : buildSceneAgentSystemPrompt()

        const tools =
            agentType === 'asset'
                ? {
                      get_scene: getSceneTool,
                      generate_image: generateImageTool,
                      generate_tripo_mesh: generateTripoMeshTool,
                      list_assets: listAssetsTool,
                      list_image_assets: listImageAssetsTool,
                      apply_texture: applyTextureTool,
                      remove_texture: removeTextureTool,
                      update_material_properties: updateMaterialPropertiesTool,
                      set_billboard_mode: setBillboardModeTool,
                      delete_asset: deleteAssetTool,
                      create_asset_folder: createAssetFolderTool,
                  }
                : agentType === 'test'
                ? {
                      get_scene: getSceneTool,
                      play_simulation: playSimulationTool,
                      stop_simulation: stopSimulationTool,
                      sleep: sleepTool,
                      get_console_logs: getConsoleLogsTool,
                      run_autonomous_test: runAutonomousTestTool,
                  }
                : isScriptingAgent
                ? {
                      get_scene: getSceneTool,
                      lookup_scripting_api: lookupScriptingApiTool,
                      list_scripts: listScriptsTool,
                      create_script: createScriptTool,
                      read_script: readScriptTool,
                      edit_script: editScriptTool,
                      delete_script: deleteScriptTool,
                      attach_script: attachScriptTool,
                      detach_script: detachScriptTool,
                      play_simulation: playSimulationTool,
                      stop_simulation: stopSimulationTool,
                      sleep: sleepTool,
                      get_console_logs: getConsoleLogsTool,
                      run_autonomous_test: runAutonomousTestTool,
                  }
                : {
                      get_scene: getSceneTool,
                      add_mesh: addMeshTool,
                      add_light: addLightTool,
                      update_node: updateNodeTool,
                      delete_node: deleteNodeTool,
                      create_group: createGroupTool,
                      set_parent: setParentTool,
                      bulk_scene: bulkSceneTool,
                      list_assets: listAssetsTool,
                      import_asset: importAssetTool,
                      save_prefab: savePrefabTool,
                  }

        const model = getModel(
            modelSettings,
            agentType,
            envRecord().AZURE_OPENAI_DEPLOYMENT ?? 'gpt-5.2-chat'
        )

        const result = await generateText({
            model,
            system,
            tools: tools as never,
            messages: messages as never,
        })

        const response = {
            text: result.text,
            toolCalls: ((result.toolCalls ?? []) as unknown as AnyToolCall[]).map(
                (tc) => ({
                    toolCallId: tc.toolCallId,
                    toolName: tc.toolName,
                    args: tc.input,
                })
            ),
            finishReason: result.finishReason,
        }

        sendJson(res, response)
    } catch (error) {
        console.error('[subagent]', error)
        if (!res.headersSent) {
            sendJson(
                res,
                {
                    error:
                        error instanceof Error ? error.message : 'Subagent error',
                },
                500
            )
        }
    }
}
