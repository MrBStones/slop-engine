import { describe, expect, test } from 'bun:test'
import { isSlopEditorHelper } from '../src/utils/editorGizmoUtils'

describe('isSlopEditorHelper', () => {
    test('false when metadata missing', () => {
        expect(isSlopEditorHelper({})).toBe(false)
    })

    test('false when slopEditorHelper is not true', () => {
        expect(isSlopEditorHelper({ metadata: { slopEditorHelper: false } })).toBe(
            false
        )
        expect(isSlopEditorHelper({ metadata: {} })).toBe(false)
    })

    test('true when metadata marks helper', () => {
        expect(
            isSlopEditorHelper({ metadata: { slopEditorHelper: true } })
        ).toBe(true)
    })
})
