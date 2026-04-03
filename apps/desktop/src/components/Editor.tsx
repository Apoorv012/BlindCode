import { useEffect, useState } from "react";
import { Play, Eye, X, ChevronDown, Code2, Send, Unlock } from "lucide-react"; // Added Unlock icon
import CodeWorkspace from "./CodeWorkspace";

interface EditorProps {
    code: string;
    onCodeChange: (code: string) => void;
    isBlurred: boolean;
    onRun: () => void;
    onSubmit: () => void;
    onRevealFull: () => void; // <--- ADD THIS LINE (Handle 5 point deduction in parent)
    onVision: () => void;
    onPartialVision: (cost: number, text: string) => void;
    level: number;
    visionTimeLeft: number;
    teamName: string;
    language: string;
    onLanguageChange: (lang: string) => void;
    isCompiling: boolean;
}

const LANGUAGES = [
    { id: "cpp", name: "C++", icon: "⚡", extension: ".cpp" },
    { id: "python", name: "Python", icon: "🐍", extension: ".py" },
    { id: "java", name: "Java", icon: "☕", extension: ".java" },
];

export default function Editor({
    code,
    onCodeChange,
    isBlurred,
    onRun,
    onSubmit,
    onRevealFull, // Destructure here
    onPartialVision,
    level,
    visionTimeLeft,
    teamName,
    language,
    onLanguageChange,
    isCompiling,
}: EditorProps) {
    const [lineCount, setLineCount] = useState(1);
    const [showLangMenu, setShowLangMenu] = useState(false);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; selectedText: string } | null>(null);
    const [revealedPopup, setRevealedPopup] = useState<{ x: number; y: number; text: string } | null>(null);

    // NEW: State for 10-second reveal timer
    const [revealTimeLeft, setRevealTimeLeft] = useState(0);
    const isTempRevealed = revealTimeLeft > 0;

    useEffect(() => {
        const lines = code.split("\n").length;
        setLineCount(Math.max(lines, 25));
    }, [code]);

    // NEW: Timer effect for the 10-second reveal
    useEffect(() => {
        let timer: any;
        if (revealTimeLeft > 0) {
            timer = setInterval(() => {
                setRevealTimeLeft((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [revealTimeLeft]);

    const handleRevealClick = () => {
        if (revealTimeLeft === 0) {
            onRevealFull(); // Trigger parent to deduct 5 points
            setRevealTimeLeft(10); // Start 10 second countdown
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
    };

    const handleCopy = (e: React.ClipboardEvent) => {
        e.preventDefault();
    };

    const handleContextMenu = (e: React.MouseEvent, externalSelectedText?: string) => {
        e.preventDefault();
        const selectedText = externalSelectedText || window.getSelection()?.toString() || "";
        if (selectedText && isBlurred && !isTempRevealed) {
            setContextMenu({ x: e.clientX, y: e.clientY, selectedText });
        }
    };

    const handleRevealSelection = () => {
        if (contextMenu) {
            onPartialVision(10, contextMenu.selectedText);
            setRevealedPopup({ x: contextMenu.x, y: contextMenu.y, text: contextMenu.selectedText });
            setContextMenu(null);
            setTimeout(() => setRevealedPopup(null), 5000);
        }
    };

    const getLevelBackground = () => {
        return "bg-[#1e1e1e]";
    };

    const currentLang = LANGUAGES.find((l) => l.id === language) || LANGUAGES[0];

    return (
        <div className={`h-full flex flex-col ${getLevelBackground()} transition-all duration-500 overflow-hidden`}>
            {/* Top Bar (Language, Player Info, Action Buttons) */}
            <div className="flex items-center justify-between px-6 py-2.5 bg-[#252526] border-b border-[#3c3c3c] shrink-0">
                <div className="flex items-center gap-5">
                    <div className="relative">
                        <button
                            onClick={() => setShowLangMenu(!showLangMenu)}
                            className="flex items-center gap-2 px-3 py-2 bg-[#1e1e1e] border border-[#3c3c3c] rounded-lg hover:border-[#555] transition-colors"
                        >
                            <Code2 size={16} className="text-yellow-400" />
                            <span className="text-white text-sm font-medium">{currentLang.name}</span>
                            <ChevronDown size={16} className={`text-[#858585] transition-transform ${showLangMenu ? "rotate-180" : ""}`} />
                        </button>

                        {showLangMenu && (
                            <div className="absolute top-full left-0 mt-2 w-52 bg-[#252526] border border-[#3c3c3c] rounded-xl shadow-2xl z-50 overflow-hidden">
                                {LANGUAGES.map((lang) => (
                                    <button
                                        key={lang.id}
                                        onClick={() => {
                                            onLanguageChange(lang.id);
                                            setShowLangMenu(false);
                                        }}
                                        className={`w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-[#2a2d2e] transition-colors ${language === lang.id ? "bg-[#37373d] text-yellow-400" : "text-white"
                                            }`}
                                    >
                                        <span className="text-xl">{lang.icon}</span>
                                        <span className="text-base font-medium">{lang.name}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2 px-3 py-2 bg-[#1e1e1e] rounded-lg">
                        <span className="text-yellow-500 text-base">{currentLang.icon}</span>
                        <span className="text-white text-sm">main{currentLang.extension}</span>
                        <X size={14} className="text-[#858585] hover:text-white cursor-pointer ml-1" />
                    </div>

                    <span className="text-[#858585] text-sm">{teamName} • Level {level}</span>
                </div>

                <div className="flex items-center gap-4">
                    {visionTimeLeft > 0 && (
                        <div className="flex items-center gap-4 px-5 py-3 bg-[#1e1e1e] rounded-xl">
                            <div className="w-28 h-2.5 bg-[#3c3c3c] rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 transition-all duration-100"
                                    style={{ width: `${(visionTimeLeft / 5) * 100}%` }}
                                />
                            </div>
                            <span className="text-yellow-400 text-base font-mono font-bold">{visionTimeLeft.toFixed(1)}s</span>
                        </div>
                    )}

                    {/* NEW REVEAL BUTTON */}
                    <button
                        onClick={handleRevealClick}
                        disabled={isTempRevealed}
                        className={`flex items-center gap-3 px-6 py-3 rounded-xl transition-all duration-300 text-base font-semibold shadow-lg ${isTempRevealed
                            ? "bg-[#3c3c3c] text-yellow-400 cursor-not-allowed"
                            : "bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white hover:scale-105 shadow-red-500/25"
                            }`}
                    >
                        {isTempRevealed ? <Unlock size={20} /> : <Eye size={20} />}
                        <span>{isTempRevealed ? `Revealed (${revealTimeLeft}s)` : "Reveal (-5 Pts)"}</span>
                    </button>

                    <button
                        onClick={onRun}
                        disabled={isCompiling}
                        className={`flex items-center gap-3 px-6 py-3 rounded-xl transition-all duration-300 text-base font-semibold ${isCompiling
                            ? "bg-[#3c3c3c] text-[#858585] cursor-not-allowed"
                            : "bg-[#2d2d2d] hover:bg-[#3d3d3d] border border-[#4c4c4c] text-white hover:scale-105"
                            }`}
                    >
                        <Play size={20} fill="currentColor" className={isCompiling ? "opacity-50" : "text-green-400"} />
                        <span>{isCompiling ? "Running..." : "Run Code"}</span>
                    </button>

                    <button
                        onClick={onSubmit}
                        disabled={isCompiling}
                        className={`flex items-center gap-3 px-6 py-3 rounded-xl transition-all duration-300 text-base font-semibold shadow-lg ${isCompiling
                            ? "bg-[#3c3c3c] text-[#858585] cursor-not-allowed"
                            : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white hover:scale-105 shadow-blue-500/25"
                            }`}
                    >
                        <Send size={20} />
                        <span>{isCompiling ? "Evaluating..." : "Submit"}</span>
                    </button>
                </div>
            </div>

            {/* Breadcrumb / File Tab */}
            <div className="flex items-center gap-3 px-6 py-2 bg-[#1e1e1e] border-b border-[#3c3c3c] text-sm text-[#858585] shrink-0">
                <span>src</span>
                <ChevronDown size={14} className="rotate-[-90deg]" />
                <span className="text-white">main{currentLang.extension}</span>
            </div>

            {/* Main Editor Area */}
            <div className="flex-1 flex overflow-hidden relative">
                {/* Line Numbers */}
                <div className="w-12 bg-[#1e1e1e] flex flex-col items-end pr-3 pt-4 text-[#6e6e6e] text-xs font-mono select-none border-r border-[#3c3c3c] shrink-0">
                    {Array.from({ length: lineCount }, (_, i) => (
                        <div key={i} className="leading-6 h-6">
                            {i + 1}
                        </div>
                    ))}
                </div>

                <div className="flex-1 relative overflow-hidden flex">
                    <CodeWorkspace
                        code={code}
                        onCodeChange={onCodeChange}
                        // PASS IN COMBINED BLUR STATE SO SABOTAGE CHARACTERS ARE REMOVED
                        isBlurred={isBlurred && !isTempRevealed}
                        level={level}
                        currentLang={currentLang}
                        onPaste={handlePaste}
                        onCopy={handleCopy}
                        onContextMenu={handleContextMenu}
                    />
                </div>
            </div>

            {/* Context Menu */}
            {contextMenu && (
                <div
                    className="fixed z-50 bg-[#252526] border border-[#3c3c3c] rounded-lg shadow-xl py-1 min-w-[150px]"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                >
                    <button
                        onClick={handleRevealSelection}
                        className="w-full text-left px-4 py-2 hover:bg-[#2a2d2e] text-white text-sm flex items-center gap-2"
                    >
                        <Eye size={14} className="text-yellow-400" />
                        Reveal Selection (+10s)
                    </button>
                    <button
                        onClick={() => setContextMenu(null)}
                        className="w-full text-left px-4 py-2 hover:bg-[#2a2d2e] text-[#858585] text-sm"
                    >
                        Cancel
                    </button>
                </div>
            )}

            {/* Revealed Text Popup */}
            {revealedPopup && (
                <div
                    className="fixed z-50 bg-black/90 border border-yellow-500/50 rounded-lg shadow-2xl p-4 max-w-md font-mono text-sm text-yellow-400 whitespace-pre-wrap break-words"
                    style={{ left: revealedPopup.x, top: revealedPopup.y }}
                >
                    {revealedPopup.text}
                </div>
            )}

            {/* Click outside to close context menu */}
            {contextMenu && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setContextMenu(null)}
                />
            )}
        </div>
    );
}