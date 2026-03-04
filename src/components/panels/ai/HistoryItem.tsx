import type { ChatSession } from '../../../chatHistoryStore'
import { formatSessionDate } from '../../../chatHistoryStore'

export function HistoryItem(
    props: Readonly<{
        session: ChatSession
        isActive: boolean
        onSelect: () => void
        onDelete: () => void
    }>
) {
    return (
        <div
            class={`group flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-sm transition-colors ${
                props.isActive ? 'bg-gray-700/70' : 'hover:bg-gray-800/60'
            }`}
            onClick={props.onSelect}
        >
            <div class="flex-1 min-w-0">
                <div class="text-gray-200 truncate text-xs">
                    {props.session.title}
                </div>
                <div class="text-gray-500 text-[10px]">
                    {formatSessionDate(props.session.updatedAt)}
                    {' · '}
                    {props.session.messages.length} msg
                    {props.session.messages.length !== 1 ? 's' : ''}
                </div>
            </div>
            <button
                class="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 p-0.5"
                onClick={(e) => {
                    e.stopPropagation()
                    props.onDelete()
                }}
                title="Delete chat"
                type="button"
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
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                </svg>
            </button>
        </div>
    )
}
