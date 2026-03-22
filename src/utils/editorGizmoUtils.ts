import { Mesh, MeshBuilder, Scene, Vector3 } from 'babylonjs'

export const EDITOR_GIZMO_PIVOT_NAME = '__editor_gizmo_pivot__'

export function isSlopEditorHelper(node: { metadata?: unknown }): boolean {
    const m = node.metadata as { slopEditorHelper?: boolean } | undefined
    return m?.slopEditorHelper === true
}

export function ensureEditorGizmoPivot(scene: Scene): Mesh {
    const existing = scene.getMeshByName(EDITOR_GIZMO_PIVOT_NAME)
    if (existing instanceof Mesh) return existing
    const mesh = MeshBuilder.CreateBox(
        EDITOR_GIZMO_PIVOT_NAME,
        { size: 0.01 },
        scene
    )
    mesh.isVisible = false
    mesh.isPickable = false
    mesh.doNotSerialize = true
    mesh.metadata = { slopEditorHelper: true }
    return mesh
}

export function worldAabbCenterForMeshes(meshes: Mesh[]): Vector3 {
    if (meshes.length === 0) return Vector3.Zero()
    let min = new Vector3(
        Number.POSITIVE_INFINITY,
        Number.POSITIVE_INFINITY,
        Number.POSITIVE_INFINITY
    )
    let max = new Vector3(
        Number.NEGATIVE_INFINITY,
        Number.NEGATIVE_INFINITY,
        Number.NEGATIVE_INFINITY
    )
    for (const mesh of meshes) {
        mesh.computeWorldMatrix(true)
        const box = mesh.getBoundingInfo().boundingBox
        const mn = box.minimumWorld
        const mx = box.maximumWorld
        min = Vector3.Minimize(min, mn)
        max = Vector3.Maximize(max, mx)
    }
    return min.add(max).scale(0.5)
}
