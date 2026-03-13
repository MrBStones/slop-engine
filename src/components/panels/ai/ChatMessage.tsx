import { createSignal, For, Show } from 'solid-js'
import { isToolPart } from './types'
import { groupPartsInOrder, parseContent } from './utils'
import { CodeBlock } from './CodeBlock'
import { ToolCallIndicator } from './ToolCallIndicator'

export function ChatMessage(
    props: Readonly<{
        role: string
        parts: Array<{ type: string; text?: string; [key: string]: unknown }>
        onUndo?: () => Promise<void>
    }>
) {
    const isUser = () => props.role === 'user'
    const [isUndoing, setIsUndoing] = createSignal(false)

    const segments = () => groupPartsInOrder(props.parts, isToolPart)
    const hasContent = () =>
        props.parts.some(
            (p) =>
                isToolPart(p) ||
                p.type === 'file' ||
                (p.type === 'text' && (p.text?.length ?? 0) > 0)
        )

    const handleUndo = async () => {
        if (!props.onUndo || isUndoing()) return
        setIsUndoing(true)
        try {
            await props.onUndo()
        } finally {
            setIsUndoing(false)
        }
    }

    return (
        <Show when={hasContent()}>
            <div
                class={`flex ${
                    isUser() ? 'justify-end' : 'justify-start'
                } mb-3`}
            >
                <div
                    class={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                        isUser()
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-800 text-gray-100'
                    }`}
                >
                    <Show when={!isUser()}>
                        <span class="text-xs text-gray-400 font-medium mb-1 block">
                            AI
                        </span>
                    </Show>
                    <For each={segments()}>
                        {(seg) =>
                            seg.kind === 'tool' ? (
                                <ToolCallIndicator part={seg.part} />
                            ) : seg.kind === 'file' &&
                              seg.part.mediaType?.startsWith('image/') ? (
                                <div class="mt-1.5">
                                    <img
                                        src={seg.part.url}
                                        alt={seg.part.filename ?? 'image'}
                                        class="max-w-full max-h-48 rounded object-contain"
                                    />
                                </div>
                            ) : seg.kind === 'text' ? (
                                <For each={parseContent(seg.text)}>
                                    {(part) =>
                                        part.kind === 'code' ? (
                                            <CodeBlock
                                                lang={part.lang}
                                                code={part.code}
                                            />
                                        ) : (
                                            <div
                                                class="md-content"
                                                innerHTML={part.html}
                                            />
                                        )
                                    }
                                </For>
                            ) : null
                        }
                    </For>
                    <Show when={props.onUndo}>
                        <div class="mt-2 pt-2 border-t border-gray-700">
                            <button
                                type="button"
                                class="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={handleUndo}
                                disabled={isUndoing()}
                                title="Undo all scene changes from this response"
                            >
                                <svg
                                    class="w-3.5 h-3.5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    stroke-width="2"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3"
                                    />
                                </svg>
                                {isUndoing()
                                    ? 'Restoring…'
                                    : 'Undo scene changes'}
                            </button>
                        </div>
                    </Show>
                </div>
            </div>
        </Show>
    )
}
