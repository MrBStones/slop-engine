import { createSignal, For, Show } from 'solid-js'
import { Icon } from 'solid-heroicons'
import type { ClarificationOption } from './types'
import { resolvePlanningOutlineIcon } from './planningIconUtils'

function OptionIcon(props: { icon?: string }) {
    return (
        <Icon
            path={resolvePlanningOutlineIcon(props.icon)}
            class="w-5 h-5 shrink-0 text-blue-400"
        />
    )
}

export function PlanningCards(props: {
    question: string
    options: ClarificationOption[]
    allowCustom?: boolean
    multiSelect?: boolean
    onSubmit: (selectedIds: string[], customText?: string) => void
    disabled: boolean
}) {
    const [selected, setSelected] = createSignal<Set<string>>(new Set())
    const [customText, setCustomText] = createSignal('')
    const [submitted, setSubmitted] = createSignal(false)

    const isDisabled = () => props.disabled || submitted()

    const toggleOption = (id: string) => {
        if (isDisabled()) return
        setSelected((prev) => {
            const next = new Set(prev)
            if (next.has(id)) {
                next.delete(id)
            } else {
                if (!props.multiSelect) next.clear()
                next.add(id)
            }
            return next
        })
    }

    const handleSubmit = () => {
        if (isDisabled()) return
        const ids = [...selected()]
        const custom = customText().trim()
        if (ids.length === 0 && !custom) return
        setSubmitted(true)
        props.onSubmit(ids, custom || undefined)
    }

    return (
        <div class="my-2">
            <p class="text-sm font-medium text-gray-100 mb-2.5">
                {props.question}
            </p>

            <div class="grid gap-2" style="grid-template-columns: repeat(auto-fill, minmax(180px, 1fr))">
                <For each={props.options}>
                    {(option) => {
                        const isSelected = () => selected().has(option.id)
                        return (
                            <button
                                type="button"
                                class={`text-left rounded-lg border p-2.5 transition-all duration-150 ${
                                    isDisabled()
                                        ? isSelected()
                                            ? 'border-blue-500/60 bg-blue-500/15 opacity-80'
                                            : 'border-gray-700/50 bg-gray-800/30 opacity-50'
                                        : isSelected()
                                          ? 'border-blue-500 bg-blue-500/15 ring-1 ring-blue-500/40'
                                          : 'border-gray-700 bg-gray-800/50 hover:border-gray-500 hover:bg-gray-800'
                                }`}
                                onClick={() => toggleOption(option.id)}
                                disabled={isDisabled()}
                            >
                                <div class="flex items-start gap-2">
                                    <OptionIcon icon={option.icon} />
                                    <div class="min-w-0 flex-1">
                                        <div class="flex items-center gap-1.5">
                                            <span class="text-xs font-semibold text-gray-100 leading-tight">
                                                {option.label}
                                            </span>
                                            <Show when={isSelected()}>
                                                <svg
                                                    class="w-3.5 h-3.5 text-blue-400 shrink-0"
                                                    fill="currentColor"
                                                    viewBox="0 0 20 20"
                                                >
                                                    <path
                                                        fill-rule="evenodd"
                                                        d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                                                        clip-rule="evenodd"
                                                    />
                                                </svg>
                                            </Show>
                                        </div>
                                        <p class="text-[11px] text-gray-400 mt-0.5 leading-snug">
                                            {option.description}
                                        </p>
                                    </div>
                                </div>
                            </button>
                        )
                    }}
                </For>
            </div>

            <Show when={(props.allowCustom ?? true) && !isDisabled()}>
                <div class="mt-2">
                    <input
                        type="text"
                        class="w-full rounded-lg border border-gray-700 bg-gray-800/50 px-2.5 py-1.5 text-xs text-gray-100 placeholder:text-gray-500 focus:border-blue-500/60 focus:outline-none"
                        placeholder="Or type your own idea..."
                        value={customText()}
                        onInput={(e) => setCustomText(e.currentTarget.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSubmit()
                        }}
                    />
                </div>
            </Show>

            <Show when={!isDisabled()}>
                <div class="mt-2.5 flex justify-end">
                    <button
                        type="button"
                        class="inline-flex items-center gap-1.5 rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-400 disabled:opacity-40 disabled:cursor-not-allowed"
                        onClick={handleSubmit}
                        disabled={
                            selected().size === 0 && !customText().trim()
                        }
                    >
                        Continue
                        <svg
                            class="w-3 h-3"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            stroke-width="2"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                            />
                        </svg>
                    </button>
                </div>
            </Show>

            <Show when={submitted()}>
                <div class="mt-2 flex items-center gap-1.5 text-[11px] text-green-400">
                    <svg
                        class="w-3.5 h-3.5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                    >
                        <path
                            fill-rule="evenodd"
                            d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                            clip-rule="evenodd"
                        />
                    </svg>
                    Choice submitted
                </div>
            </Show>
        </div>
    )
}
