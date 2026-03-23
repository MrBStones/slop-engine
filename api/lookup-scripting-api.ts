import { handleLookupScriptingApi } from './_core'

export const runtime = 'nodejs'
export const maxDuration = 30

export default async function handler(req: unknown, res: unknown) {
    await handleLookupScriptingApi(req as never, res as never)
}
