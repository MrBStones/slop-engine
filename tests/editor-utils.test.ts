import { describe, expect, test } from 'bun:test'
import { collectImagePaths, collectScriptPaths } from '../src/utils/editorUtils'
import type { AssetNode } from '../src/assetStore'

function folder(name: string, children: AssetNode[]): AssetNode {
    return {
        id: `folder_${name}`,
        name,
        type: 'folder',
        path: name,
        children,
    }
}

function file(path: string): AssetNode {
    const parts = path.split('/')
    const name = parts[parts.length - 1]!
    return {
        id: `file_${path}`,
        name,
        type: 'file',
        path,
    }
}

describe('collectScriptPaths', () => {
    test('collects script extensions only', () => {
        const root: AssetNode = {

            id: 'root',

            name: 'Assets',

            type: 'folder',

            path: '',

            children: [

                file('scripts/foo.ts'),

                file('scripts/bar.js'),

                file('models/a.glb'),

                file('readme.txt'),

            ],

        }

        const paths = collectScriptPaths(root).sort()

        expect(paths).toEqual(['scripts/bar.js', 'scripts/foo.ts'])

    })

    test('includes .tsx and .jsx', () => {
        const root: AssetNode = {
            id: 'root',
            name: 'Assets',
            type: 'folder',
            path: '',
            children: [
                file('a.tsx'),
                file('b.jsx'),
                file('c.txt'),
            ],
        }
        expect(collectScriptPaths(root).sort()).toEqual(['a.tsx', 'b.jsx'])
    })

})

describe('collectImagePaths', () => {

    test('collects image extensions under nested folders', () => {

        const root: AssetNode = {

            id: 'root',

            name: 'Assets',

            type: 'folder',

            path: '',

            children: [

                folder('tex', [

                    file('tex/diffuse.png'),

                    file('tex/normal.webp'),

                ]),

                file('data.json'),

            ],

        }

        const paths = collectImagePaths(root).sort()

        expect(paths).toEqual(['tex/diffuse.png', 'tex/normal.webp'])

    })

    test('matches uppercase image extensions', () => {
        const root: AssetNode = {
            id: 'root',
            name: 'Assets',
            type: 'folder',
            path: '',
            children: [file('icon.PNG'), file('photo.JPEG')],
        }
        expect(collectImagePaths(root).sort()).toEqual([
            'icon.PNG',
            'photo.JPEG',
        ])
    })

})

