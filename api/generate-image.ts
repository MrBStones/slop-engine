import { handleGenerateImage } from './_core'

export const runtime = 'nodejs'
export const maxDuration = 120

export default async function handler(req: unknown, res: unknown) {
    await handleGenerateImage(req as never, res as never)
}
