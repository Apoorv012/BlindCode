import React, { useRef, useState, useEffect } from "react";
import Editor, { type Monaco, type OnMount } from "@monaco-editor/react";

interface CodeWorkspaceProps {
    code: string;
    onCodeChange: (code: string) => void;
    isBlurred: boolean;
    level: number;
    currentLang: { name: string; extension: string };
    onPaste: (e: React.ClipboardEvent) => void;
    onCopy: (e: React.ClipboardEvent) => void;
    onContextMenu: (e: React.MouseEvent, selectedText?: string) => void;
}

export default function CodeWorkspace({
    code,
    onCodeChange,
    isBlurred,
    level,
    currentLang,
    onPaste,
    onCopy,
    onContextMenu,
}: CodeWorkspaceProps) {
    const editorRef = useRef<any>(null);
    const monacoRef = useRef<Monaco | null>(null);
    const [currentLine, setCurrentLine] = useState<number>(0);
    const decorationsRef = useRef<string[]>([]);

    const handleEditorDidMount: OnMount = (editor, monaco) => {
        editorRef.current = editor;
        monacoRef.current = monaco;

        // Track cursor position
        editor.onDidChangeCursorPosition((e: any) => {
            // Monaco lines are 1-indexed, we want 0-indexed to match computation logic
            setCurrentLine(e.position.lineNumber - 1);
        });

        // Intercept right click to show our custom Reveal context menu
        editor.onContextMenu((e: any) => {
            const selection = editor.getSelection();
            if (selection && !selection.isEmpty()) {
                const selectedText = editor.getModel()?.getValueInRange(selection);
                if (selectedText) {
                    onContextMenu(e.event.browserEvent as unknown as React.MouseEvent, selectedText);
                }
            }
        });

        // Initialize cursor line
        const pos = editor.getPosition();
        if (pos) {
            setCurrentLine(pos.lineNumber - 1);
        }
    };

    const handleEditorChange = (value: string | undefined) => {
        if (value !== undefined) {
            onCodeChange(value);
        }
    };

    // Calculate and apply line blurs
    useEffect(() => {
        if (!editorRef.current || !monacoRef.current) return;

        const editor = editorRef.current;
        const model = editor.getModel();
        if (!model) return;

        const lineCount = model.getLineCount();
        const newDecorations: any[] = [];
        for (let i = 0; i < lineCount; i++) {
            let className = "blur-line-clear";

            if (isBlurred) {
                const distance = Math.abs(currentLine - i);
                if (distance === 0) {
                    className = "blur-line-focus"; // 15%
                } else if (distance === 1) {
                    className = "blur-line-1"; // 30%
                } else if (distance === 2) {
                    className = "blur-line-2"; // 45%
                } else if (distance === 3) {
                    className = "blur-line-3"; // 70%
                } else {
                    className = "blur-line-max"; // 100%
                }
            }

            const maxCol = model.getLineMaxColumn(i + 1);

            newDecorations.push({
                range: new monacoRef.current!.Range(i + 1, 1, i + 1, maxCol),
                options: {
                    isWholeLine: true,
                    className: className,
                    inlineClassName: className,
                }
            });
        }

        decorationsRef.current = editor.deltaDecorations(decorationsRef.current, newDecorations);

    }, [code, isBlurred, currentLine, level]);

    // Format the language id for monaco based on extension
    const getMonacoLang = (ext: string) => {
        if (ext === ".py") return "python";
        if (ext === ".js") return "javascript";
        return "cpp";
    };

    return (
        <div
            className="flex-1 w-full h-full relative"
            onContextMenu={onContextMenu}
            onPaste={onPaste}
            onCopy={onCopy}
        >
            <Editor
                height="100%"
                language={getMonacoLang(currentLang.extension)}
                theme="vs-dark"
                value={code}
                onChange={handleEditorChange}
                onMount={handleEditorDidMount}
                options={{
                    minimap: { enabled: true },
                    fontSize: 14,
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    lineHeight: 24,
                    padding: { top: 16 },
                    scrollBeyondLastLine: false,
                    smoothScrolling: true,
                    cursorBlinking: "smooth",
                    cursorSmoothCaretAnimation: "on",
                }}
            />
        </div>
    );
}