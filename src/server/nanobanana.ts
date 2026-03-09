const NANOBANANA_BASE = 'https://api.nanobananaapi.ai'

export type ImageSize =
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

export async function generateImage(options: {
    apiKey: string
    prompt: string
    numImages?: number
    imageSize?: ImageSize
}): Promise<{ taskId: string }> {
    const { apiKey, prompt, numImages = 1, imageSize = '1:1' } = options
    const res = await fetch(`${NANOBANANA_BASE}/api/v1/nanobanana/generate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            prompt,
            type: 'TEXTTOIAMGE',
            numImages: Math.min(4, Math.max(1, numImages)),
            image_size: imageSize,
            callBackUrl: 'https://example.com/nanobanana-callback',
        }),
    })
    const json = (await res.json()) as {
        code?: number
        msg?: string
        data?: { taskId?: string }
    }
    if (json.code !== 200 || !json.data?.taskId) {
        throw new Error(json.msg ?? 'NanoBanana generate failed')
    }
    return { taskId: json.data.taskId }
}

export async function pollTaskResult(options: {
    apiKey: string
    taskId: string
    maxWaitMs?: number
    pollIntervalMs?: number
}): Promise<{ resultImageUrl: string } | null> {
    const {
        apiKey,
        taskId,
        maxWaitMs = 120_000,
        pollIntervalMs = 2000,
    } = options
    const start = Date.now()
    while (Date.now() - start < maxWaitMs) {
        const res = await fetch(
            `${NANOBANANA_BASE}/api/v1/nanobanana/record-info?taskId=${encodeURIComponent(taskId)}`,
            {
                headers: { Authorization: `Bearer ${apiKey}` },
            }
        )
        const json = (await res.json()) as {
            code?: number
            data?: {
                successFlag?: number
                response?: { resultImageUrl?: string }
            }
        }
        if (json.code !== 200) continue
        const flag = json.data?.successFlag
        if (flag === 1 && json.data?.response?.resultImageUrl) {
            return { resultImageUrl: json.data.response.resultImageUrl }
        }
        if (flag === 2 || flag === 3) {
            return null
        }
        await new Promise((r) => setTimeout(r, pollIntervalMs))
    }
    return null
}
