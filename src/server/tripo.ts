const TRIPO_OPENAPI = 'https://api.tripo3d.ai/v2/openapi'

/**
 * Must match Tripo OpenAPI `model_version` literals (see official tripo3d Python SDK
 * `TripoClient.text_to_model` — short names like "v2.5" are rejected).
 * Default there is v2.5-20250123 (balanced cost vs quality).
 */
const TRIPO_TEXT_TO_MODEL_VERSION = 'v2.5-20250123'

type TripoEnvelope = {
    code?: number
    message?: string
    data?: {
        task_id?: string
        taskId?: string
        status?: string
        task_status?: string
        output?: {
            model?: string
            pbr_model?: string
        }
    }
}

function tripoErrorMessage(json: unknown, fallback: string): string {
    if (json && typeof json === 'object') {
        const o = json as Record<string, unknown>
        if (typeof o.message === 'string') return o.message
        if (typeof o.msg === 'string') return o.msg
    }
    return fallback
}

export async function tripoSubmitTextToModel(options: {
    apiKey: string
    prompt: string
    negativePrompt?: string
}): Promise<string> {
    const body: Record<string, unknown> = {
        type: 'text_to_model',
        prompt: options.prompt,
        model_version: TRIPO_TEXT_TO_MODEL_VERSION,
    }
    if (options.negativePrompt?.trim()) {
        body.negative_prompt = options.negativePrompt.trim()
    }

    const res = await fetch(`${TRIPO_OPENAPI}/task`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${options.apiKey}`,
        },
        body: JSON.stringify(body),
    })
    const json = (await res.json()) as TripoEnvelope
    if (json.code !== undefined && json.code !== 0) {
        throw new Error(
            tripoErrorMessage(json, `Tripo create task failed (code ${json.code})`)
        )
    }
    if (!res.ok) {
        throw new Error(
            tripoErrorMessage(json, `Tripo create task failed (${res.status})`)
        )
    }
    const id = json.data?.task_id ?? json.data?.taskId
    if (!id) {
        throw new Error('Tripo did not return a task_id')
    }
    return id
}

function terminalFailureStatus(status: string): boolean {
    const s = status.toLowerCase()
    return (
        s === 'failed' ||
        s === 'error' ||
        s === 'cancelled' ||
        s === 'canceled' ||
        s === 'failure'
    )
}

function terminalSuccessStatus(status: string): boolean {
    const s = status.toLowerCase()
    return s === 'success' || s === 'completed' || s === 'finished' || s === 'done'
}

export async function tripoPollUntilModelReady(options: {
    apiKey: string
    taskId: string
    maxWaitMs?: number
    pollIntervalMs?: number
}): Promise<{ modelUrl: string }> {
    const {
        apiKey,
        taskId,
        maxWaitMs = 600_000,
        pollIntervalMs = 3000,
    } = options
    const start = Date.now()
    while (Date.now() - start < maxWaitMs) {
        const res = await fetch(
            `${TRIPO_OPENAPI}/task/${encodeURIComponent(taskId)}`,
            {
                headers: { Authorization: `Bearer ${apiKey}` },
            }
        )
        const json = (await res.json()) as TripoEnvelope
        if (json.code !== undefined && json.code !== 0) {
            throw new Error(
                tripoErrorMessage(
                    json,
                    `Tripo task poll failed (code ${json.code})`
                )
            )
        }
        const data = json.data
        if (!data) {
            await new Promise((r) => setTimeout(r, pollIntervalMs))
            continue
        }
        const status = String(data.status ?? data.task_status ?? '')
        const out = data.output
        const modelUrl =
            (typeof out?.pbr_model === 'string' ? out.pbr_model : null) ??
            (typeof out?.model === 'string' ? out.model : null)

        if (terminalSuccessStatus(status)) {
            if (!modelUrl) {
                throw new Error('Tripo task succeeded but no model URL in output')
            }
            return { modelUrl }
        }
        if (terminalFailureStatus(status)) {
            throw new Error(`Tripo task failed (status: ${status || 'unknown'})`)
        }
        await new Promise((r) => setTimeout(r, pollIntervalMs))
    }
    throw new Error('Tripo task timed out waiting for 3D model')
}
