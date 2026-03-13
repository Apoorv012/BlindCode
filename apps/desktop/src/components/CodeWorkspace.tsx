import React, { useRef, useState, useEffect } from "react";
import DynamicBlurLayer from "./DynamicBlurLayer";

interface CodeWorkspaceProps {
    code: string;
    onCodeChange: (code: string) => void;
    isBlurred: boolean;
    level: number;
    currentLang: { name: string; extension: string };
    onPaste: (e: React.ClipboardEvent) => void;
    onCopy: (e: React.ClipboardEvent) => void;
    onContextMenu: (e: React.MouseEvent) => void;
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
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const backgroundRef = useRef<HTMLDivElement>(null);
    const [currentLine, setCurrentLine] = useState(0);

    // Sync scrolling between the invisible textarea and the visual background
    const handleScroll = () => {
        if (textareaRef.current && backgroundRef.current) {
            backgroundRef.current.scrollTop = textareaRef.current.scrollTop;
            backgroundRef.current.scrollLeft = textareaRef.current.scrollLeft;
        }
    };

    // Calculate which line the cursor is currently on
    const updateCursorLine = () => {
        if (textareaRef.current) {
            const cursorPosition = textareaRef.current.selectionStart;
            const textBeforeCursor = code.substring(0, cursorPosition);
            const lineIndex = textBeforeCursor.split("\n").length - 1;
            setCurrentLine(lineIndex);
        }
    };

    // Recalculate if the code changes externally or on mount
    useEffect(() => {
        updateCursorLine();
    }, [code]);

    return (
        <div className="relative flex-1 overflow-hidden bg-transparent">
            {/* The Visual Render Layer (Behind) */}
            <div
                ref={backgroundRef}
                className="absolute inset-0 overflow-hidden"
                style={{ scrollbarWidth: 'none' /* Hide scrollbar on background */ }}
            >
                <DynamicBlurLayer
                    code={code}
                    isBlurred={isBlurred}
                    currentLine={currentLine}
                    level={level}
                />
            </div>

            {/* The Actual Input Layer (In Front) */}
            <textarea
                ref={textareaRef}
                value={code}
                onChange={(e) => {
                    onCodeChange(e.target.value);
                    updateCursorLine();
                }}
                onKeyUp={updateCursorLine}
                onClick={updateCursorLine}
                onScroll={handleScroll}
                onPaste={onPaste}
                onCopy={onCopy}
                onContextMenu={onContextMenu}
                className="absolute inset-0 w-full h-full resize-none bg-transparent p-4 font-mono text-sm leading-6 focus:outline-none z-10"
                style={{
                    caretColor: "#ffcc00",
                    color: "transparent", // Hides the actual textarea text
                }}
                spellCheck={false}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                placeholder={`// Start typing your ${currentLang.name} code here...`}
            />
        </div>
    );
}