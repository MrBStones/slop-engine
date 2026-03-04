import { createSignal } from 'solid-js'

export function CodeBlock(props: Readonly<{ lang: string; code: string }>) {
    const [copied, setCopied] = createSignal(false)

    const handleCopy = async () => {
        await navigator.clipboard.writeText(props.code)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div class="my-2 rounded-md overflow-hidden border border-gray-700">
            <div class="flex items-center justify-between bg-gray-800 px-3 py-1">
                <span class="text-xs text-gray-400 font-mono">
                    {props.lang}
                </span>
                <button
                    class="text-xs text-gray-400 hover:text-gray-200 transition-colors"
                    onClick={handleCopy}
                    type="button"
                >
                    {copied() ? 'Copied!' : 'Copy'}
                </button>
            </div>
            <pre class="p-3 overflow-x-auto bg-gray-950 text-sm leading-relaxed">
                <code class="font-mono text-gray-200 whitespace-pre">
                    {props.code}
                </code>
            </pre>
        </div>
    )
}
