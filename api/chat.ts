import { handleChat } from './_core'

export const runtime = 'nodejs'
export const maxDuration = 60

export default async function handler(req: unknown, res: unknown) {
    await handleChat(req as never, res as never)
}
