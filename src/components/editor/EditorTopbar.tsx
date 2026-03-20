import { Show } from 'solid-js'
import { play, stop } from 'solid-heroicons/solid'
import {
    arrowPath,
    arrowsPointingOut,
    arrowsRightLeft,
    cubeTransparent,
    arrowDownTray,
    arrowUpTray,
    arrowRightCircle,
    viewColumns,
    arrowUturnLeft,
    arrowUturnRight,
} from 'solid-heroicons/outline'
import { Icon } from 'solid-heroicons'
import { Button, IconButton, Tooltip } from '../ui'
import type { GizmoType } from '../../hooks/useEditorState'

interface EditorTopbarProps {
    isPlaying: () => boolean
    onPlayStop: () => void | Promise<void>
    onResetClick: () => void
    onDownload: () => void
    onImportClick: () => void
    isVibeMode: () => boolean
    onVibeModeToggle: () => void
    isDirty: () => boolean
    lastSaved: () => Date | null
    selectedGizmo: () => GizmoType
    onGizmoSelect: (gizmo: GizmoType) => void
    /** When true, bounding box mode is unavailable (e.g. multi mesh selection). */
    boundingBoxGizmoDisabled?: () => boolean
    canUndo?: () => boolean
    canRedo?: () => boolean
    onUndo?: () => void
    onRedo?: () => void
}

export function EditorTopbar(props: Readonly<EditorTopbarProps>) {
    return (
        <div class="flex items-center mb-2 bg-gray-800 p-2 rounded-md gap-5">
            <div class="flex items-center space-x-1 gap-1">
                <Show when={props.onUndo}>
                    <Tooltip content="Undo (Ctrl+Z)" position="bottom">
                        <IconButton
                            label="Undo"
                            variant="ghost"
                            size="sm"
                            disabled={!props.canUndo?.()}
                            onClick={props.onUndo}
                        >
                            <Icon path={arrowUturnLeft} class="size-5" />
                        </IconButton>
                    </Tooltip>
                </Show>
                <Show when={props.onRedo}>
                    <Tooltip content="Redo (Ctrl+Y)" position="bottom">
                        <IconButton
                            label="Redo"
                            variant="ghost"
                            size="sm"
                            disabled={!props.canRedo?.()}
                            onClick={props.onRedo}
                        >
                            <Icon path={arrowUturnRight} class="size-5" />
                        </IconButton>
                    </Tooltip>
                </Show>
                <Button
                    variant={props.isPlaying() ? 'primary' : 'secondary'}
                    size="md"
                    onClick={props.onPlayStop}
                >
                    <Icon
                        path={props.isPlaying() ? stop : play}
                        class="size-5"
                    />
                </Button>
                <Tooltip content="Reset scene" position="bottom">
                    <IconButton
                        label="Reset"
                        variant="ghost"
                        size="sm"
                        onClick={props.onResetClick}
                    >
                        <Icon path={arrowRightCircle} class="size-5" />
                    </IconButton>
                </Tooltip>
                <Tooltip content="Download scene bundle" position="bottom">
                    <IconButton
                        label="Download"
                        variant="ghost"
                        size="sm"
                        onClick={props.onDownload}
                    >
                        <Icon path={arrowDownTray} class="size-5" />
                    </IconButton>
                </Tooltip>
                <Tooltip content="Import scene bundle" position="bottom">
                    <IconButton
                        label="Import"
                        variant="ghost"
                        size="sm"
                        onClick={props.onImportClick}
                    >
                        <Icon path={arrowUpTray} class="size-5" />
                    </IconButton>
                </Tooltip>
            </div>
            <div class="flex items-center space-x-1 gap-1 ml-auto">
                <Tooltip
                    content={
                        props.isVibeMode()
                            ? 'Exit Vibe Mode'
                            : 'Vibe Mode: chat + viewport only'
                    }
                    position="bottom"
                >
                    <IconButton
                        label="Vibe Mode"
                        variant={props.isVibeMode() ? 'primary' : 'ghost'}
                        size="sm"
                        onClick={props.onVibeModeToggle}
                    >
                        <Icon path={viewColumns} class="size-5" />
                    </IconButton>
                </Tooltip>
                <Show when={!props.isVibeMode()}>
                    <>
                        <span
                            class={`text-xs px-1 ${
                                props.isDirty()
                                    ? 'text-yellow-400'
                                    : 'text-green-400'
                            }`}
                            style={{
                                visibility:
                                    props.lastSaved() || props.isDirty()
                                        ? 'visible'
                                        : 'hidden',
                            }}
                        >
                            {props.isDirty() ? '● Unsaved' : '● Saved'}
                        </span>
                        <div class="w-px h-4 bg-gray-600 mx-1" />
                        <Tooltip content="Rotate" position="bottom">
                            <IconButton
                                label="Rotate"
                                variant={
                                    props.selectedGizmo() === 'rotation'
                                        ? 'primary'
                                        : 'ghost'
                                }
                                size="sm"
                                onClick={() =>
                                    props.onGizmoSelect('rotation')
                                }
                            >
                                <Icon path={arrowPath} class="size-5" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip content="Scale" position="bottom">
                            <IconButton
                                label="Scale"
                                variant={
                                    props.selectedGizmo() === 'scale'
                                        ? 'primary'
                                        : 'ghost'
                                }
                                size="sm"
                                onClick={() => props.onGizmoSelect('scale')}
                            >
                                <Icon
                                    path={arrowsPointingOut}
                                    class="size-5"
                                />
                            </IconButton>
                        </Tooltip>
                        <Tooltip content="Move" position="bottom">
                            <IconButton
                                label="Move"
                                variant={
                                    props.selectedGizmo() === 'position'
                                        ? 'primary'
                                        : 'ghost'
                                }
                                size="sm"
                                onClick={() =>
                                    props.onGizmoSelect('position')
                                }
                            >
                                <Icon
                                    path={arrowsRightLeft}
                                    class="size-5"
                                />
                            </IconButton>
                        </Tooltip>
                        <Tooltip
                            content={
                                props.boundingBoxGizmoDisabled?.()
                                    ? 'Bounding box (single mesh only)'
                                    : 'Bounding Box'
                            }
                            position="bottom"
                        >
                            <IconButton
                                label="Bounding Box"
                                variant={
                                    props.selectedGizmo() === 'boundingBox'
                                        ? 'primary'
                                        : 'ghost'
                                }
                                size="sm"
                                disabled={props.boundingBoxGizmoDisabled?.()}
                                onClick={() =>
                                    props.onGizmoSelect('boundingBox')
                                }
                            >
                                <Icon
                                    path={cubeTransparent}
                                    class="size-5"
                                />
                            </IconButton>
                        </Tooltip>
                    </>
                </Show>
            </div>
        </div>
    )
}
