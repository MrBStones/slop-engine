import { For, Show } from 'solid-js'
import { isToolPart } from './types'
import { groupPartsInOrder, parseContent } from './utils'
import { CodeBlock } from './CodeBlock'
import { ToolCallIndicator } from './ToolCallIndicator'

export function ChatMessage(
    props: Readonly<{
        role: string
        parts: Array<{ type: string; text?: string; [key: string]: unknown }>
    }>
) {
    const isUser = () => props.role === 'user'

    const segments = () => groupPartsInOrder(props.parts, isToolPart)
    const hasContent = () =>
        props.parts.some(
            (p) =>
                isToolPart(p) ||
                (p.type === 'text' && (p.text?.length ?? 0) > 0)
        )

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
                            ) : (
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
                            )
                        }
                    </For>
                </div>
            </div>
        </Show>
    )
}
