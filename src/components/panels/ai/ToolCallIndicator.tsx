import { Show } from 'solid-js'
import { Spinner } from '../../ui/Spinner'
import type { ToolUIPart } from './types'
import { getToolNameFromPart } from './types'

export function ToolCallIndicator(props: Readonly<{ part: ToolUIPart }>) {
    const toolName = () => getToolNameFromPart(props.part)
    const isDone = () =>
        props.part.state === 'output-available' ||
        props.part.state === 'output-error'
    const isError = () => props.part.state === 'output-error'
    const isPending = () => !isDone()

    const label = () => {
        const name = toolName()
        const inp = props.part.input as Record<string, unknown> | undefined

        switch (name) {
            case 'create_script': {
                const path = inp?.path as string | undefined
                if (isError()) return `Failed to create ${path ?? 'script'}`
                if (isDone()) return `Created ${path ?? 'script'}`
                return `Creating ${path ?? 'script'}…`
            }
            case 'get_scene':
                if (isDone()) return 'Retrieved scene'
                return 'Reading scene…'
            case 'add_mesh': {
                const t = inp?.type as string | undefined
                if (isError()) return `Failed to add ${t ?? 'mesh'}`
                if (isDone()) return `Added ${t ?? 'mesh'}`
                return `Adding ${t ?? 'mesh'}…`
            }
            case 'add_light': {
                const t = inp?.type as string | undefined
                if (isError()) return `Failed to add ${t ?? 'light'} light`
                if (isDone()) return `Added ${t ?? 'light'} light`
                return `Adding ${t ?? 'light'} light…`
            }
            case 'update_node': {
                const n = inp?.name as string | undefined
                if (isError()) return `Failed to update "${n ?? 'node'}"`
                if (isDone()) return `Updated "${n ?? 'node'}"`
                return `Updating "${n ?? 'node'}"…`
            }
            case 'delete_node': {
                const n = inp?.name as string | undefined
                if (isError()) return `Failed to delete "${n ?? 'node'}"`
                if (isDone()) return `Deleted "${n ?? 'node'}"`
                return `Deleting "${n ?? 'node'}"…`
            }
            case 'create_group': {
                const n = inp?.name as string | undefined
                if (isError()) return `Failed to create group "${n ?? 'group'}"`
                if (isDone()) return `Created group "${n ?? 'group'}"`
                return `Creating group "${n ?? 'group'}"…`
            }
            case 'set_parent': {
                const n = inp?.node as string | undefined
                const p = inp?.parent as string | undefined
                if (isError()) return `Failed to set parent of "${n ?? 'node'}"`
                if (isDone())
                    return p
                        ? `Parented "${n}" under "${p}"`
                        : `Unparented "${n}"`
                return `Setting parent of "${n ?? 'node'}"…`
            }
            case 'bulk_scene': {
                const ops = inp?.operations as unknown[] | undefined
                const count = ops?.length ?? 0
                if (isError()) return `Bulk operation failed (${count} ops)`
                if (isDone()) return `Completed ${count} operations`
                return `Running ${count} operations…`
            }
            case 'list_scripts':
                if (isDone()) return 'Listed scripts'
                return 'Listing scripts…'
            case 'attach_script': {
                const s = inp?.script as string | undefined
                const n = inp?.node as string | undefined
                if (isError()) return `Failed to attach ${s ?? 'script'}`
                if (isDone())
                    return `Attached ${s ?? 'script'} to "${n ?? 'node'}"`
                return `Attaching ${s ?? 'script'}…`
            }
            case 'detach_script': {
                const s = inp?.script as string | undefined
                const n = inp?.node as string | undefined
                if (isError()) return `Failed to detach ${s ?? 'script'}`
                if (isDone())
                    return `Detached ${s ?? 'script'} from "${n ?? 'node'}"`
                return `Detaching ${s ?? 'script'}…`
            }
            case 'read_script': {
                const p = inp?.path as string | undefined
                if (isError()) return `Failed to read ${p ?? 'script'}`
                if (isDone()) return `Read ${p ?? 'script'}`
                return `Reading ${p ?? 'script'}…`
            }
            case 'edit_script': {
                const p = inp?.path as string | undefined
                if (isError()) return `Failed to edit ${p ?? 'script'}`
                if (isDone()) return `Edited ${p ?? 'script'}`
                return `Editing ${p ?? 'script'}…`
            }
            case 'delete_script': {
                const p = inp?.path as string | undefined
                if (isError()) return `Failed to delete ${p ?? 'script'}`
                if (isDone()) return `Deleted ${p ?? 'script'}`
                return `Deleting ${p ?? 'script'}…`
            }
            case 'list_assets':
                if (isDone()) return 'Listed assets'
                return 'Listing assets…'
            case 'import_asset': {
                const p = inp?.path as string | undefined
                if (isError()) return `Failed to import ${p ?? 'model'}`
                if (isDone()) return `Imported ${p ?? 'model'}`
                return `Importing ${p ?? 'model'}…`
            }
            case 'save_prefab': {
                const n = inp?.node as string | undefined
                const p = inp?.path as string | undefined
                if (isError()) return `Failed to save prefab for ${n ?? 'node'}`
                if (isDone()) {
                    return p
                        ? `Saved prefab ${p}`
                        : `Saved prefab for ${n ?? 'node'}`
                }
                return `Saving prefab for ${n ?? 'node'}…`
            }
            case 'play_simulation':
                if (isError()) return 'Failed to start simulation'
                if (isDone()) return 'Started simulation'
                return 'Starting simulation…'
            case 'stop_simulation':
                if (isError()) return 'Failed to stop simulation'
                if (isDone()) return 'Stopped simulation'
                return 'Stopping simulation…'
            case 'sleep': {
                const sec = inp?.seconds as number | undefined
                if (isError()) return 'Sleep failed'
                if (isDone()) return `Waited ${sec ?? '?'}s`
                return `Waiting ${sec ?? '?'}s…`
            }
            case 'get_console_logs':
                if (isError()) return 'Failed to read console'
                if (isDone()) return 'Read console logs'
                return 'Reading console…'
            case 'spawn_agent': {
                const agentType = inp?.agentType as string | undefined
                const task = inp?.task as string | undefined
                const typeLabel =
                    agentType === 'script'
                        ? 'Script Writer'
                        : agentType === 'scene'
                        ? 'Scene Builder'
                        : 'Agent'
                const short = task
                    ? task.length > 50
                        ? task.slice(0, 47) + '…'
                        : task
                    : 'task'
                if (isError()) return `${typeLabel} failed: ${short}`
                if (isDone()) return `${typeLabel} done: ${short}`
                return `${typeLabel} running: ${short}…`
            }
            default:
                if (isDone()) return `Ran ${name}`
                return `Running ${name}…`
        }
    }

    return (
        <div
            class={`my-1.5 flex items-center gap-1.5 text-xs rounded px-2 py-1 border ${
                isError()
                    ? 'bg-red-950/40 border-red-800/50 text-red-400'
                    : isDone()
                    ? 'bg-green-950/40 border-green-800/50 text-green-400'
                    : 'bg-gray-900 border-gray-700 text-gray-400'
            }`}
        >
            <Show when={isPending()}>
                <Spinner size="xs" />
            </Show>
            <Show when={isDone() && !isError()}>
                <svg
                    class="w-3 h-3 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2.5"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M4.5 12.75l6 6 9-13.5"
                    />
                </svg>
            </Show>
            <span>{label()}</span>
        </div>
    )
}
