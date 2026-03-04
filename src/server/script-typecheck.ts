import ts from 'typescript'

export function typeCheckScript(
    scriptContent: string,
    apiDtsContent: string
): string[] {
    const virtualScriptPath = '/virtual/script.ts'
    const virtualApiPath = '/virtual/api.d.ts'

    const virtualFiles = new Map<string, string>([
        [virtualScriptPath, scriptContent],
        [virtualApiPath, apiDtsContent],
    ])

    const options: ts.CompilerOptions = {
        target: ts.ScriptTarget.ESNext,
        module: ts.ModuleKind.ESNext,
        strict: false,
        noEmit: true,
        skipLibCheck: true,
    }

    const host = ts.createCompilerHost(options)
    const origGetSourceFile = host.getSourceFile.bind(host)
    const origFileExists = host.fileExists.bind(host)
    const origReadFile = host.readFile.bind(host)

    host.getSourceFile = (fileName, languageVersion, onError) => {
        const virtual = virtualFiles.get(fileName)
        if (virtual !== undefined) {
            return ts.createSourceFile(fileName, virtual, languageVersion)
        }
        return origGetSourceFile(fileName, languageVersion, onError)
    }

    host.fileExists = (fileName) => {
        if (virtualFiles.has(fileName)) return true
        return origFileExists(fileName)
    }

    host.readFile = (fileName) => {
        const virtual = virtualFiles.get(fileName)
        if (virtual !== undefined) return virtual
        return origReadFile(fileName)
    }

    const program = ts.createProgram(
        [virtualScriptPath, virtualApiPath],
        options,
        host
    )

    const diagnostics = ts
        .getPreEmitDiagnostics(program)
        .filter(
            (d) =>
                d.file?.fileName === virtualScriptPath &&
                d.category === ts.DiagnosticCategory.Error
        )

    return diagnostics.map((d) => {
        const line = d.file
            ? ts.getLineAndCharacterOfPosition(d.file, d.start!).line + 1
            : '?'
        const msg = ts.flattenDiagnosticMessageText(d.messageText, ' ')
        return `Line ${line}: ${msg}`
    })
}
