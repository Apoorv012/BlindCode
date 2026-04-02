import { useEffect, useState } from "react";
import { Play, Eye, X, ChevronDown, Code2, Send } from "lucide-react";
import CodeWorkspace from "./CodeWorkspace";

interface EditorProps {
    code: string;
    onCodeChange: (code: string) => void;
    isBlurred: boolean;
    onRun: () => void;
    onSubmit: () => void; // <--- ADD THIS LINE
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
    { id: "javascript", name: "JavaScript", icon: "JS", extension: ".js" },
];

export default function Editor({
    code,
    onCodeChange,
    isBlurred,
    onRun,
    onSubmit,
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

    useEffect(() => {
        const lines = code.split("\n").length;
        setLineCount(Math.max(lines, 25));
    }, [code]);

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
    };

    const handleCopy = (e: React.ClipboardEvent) => {
        e.preventDefault();
    };

    const handleContextMenu = (e: React.MouseEvent, externalSelectedText?: string) => {
        e.preventDefault();
        const selectedText = externalSelectedText || window.getSelection()?.toString() || "";
        if (selectedText && isBlurred) {
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

                    {/* <button
                        onClick={onVision}
                        disabled={visionTimeLeft > 0}
                        className={`flex items-center gap-3 px-6 py-3 rounded-xl transition-all duration-300 text-base font-semibold ${visionTimeLeft > 0
                            ? "bg-[#3c3c3c] text-[#858585] cursor-not-allowed"
                            : "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white hover:scale-105"
                            }`}
                    >
                        {isBlurred ? <Eye size={20} /> : <EyeOff size={20} />}
                        <span>Vision</span>
                    </button> */}

                    {/* <button
                        onClick={onRun}
                        disabled={isCompiling}
                        className={`flex items-center gap-3 px-6 py-3 rounded-xl transition-all duration-300 text-base font-semibold ${isCompiling
                            ? "bg-[#3c3c3c] text-[#858585] cursor-not-allowed"
                            : "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white hover:scale-105"
                            }`}
                    >
                        <Play size={20} fill="currentColor" />
                        <span>{isCompiling ? "Compiling..." : "Run Code"}</span>
                    </button> */}

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

                    {/* NEW SUBMIT BUTTON */}
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

                {/* The new CodeWorkspace handles the textarea and dynamic blur */}
                <div className="flex-1 relative overflow-hidden flex">
                    <CodeWorkspace
                        code={code}
                        onCodeChange={onCodeChange}
                        isBlurred={isBlurred}
                        level={level}
                        currentLang={currentLang}
                        onPaste={handlePaste}
                        onCopy={handleCopy}
                        onContextMenu={handleContextMenu}
                    />

                    {/* Atmospheric Overlays (Gradients and Droplets) */}
                    {/* {isBlurred && (
                        <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">

                            <div
                                className="absolute inset-0"
                                style={{
                                    background: `
                    linear-gradient(135deg, 
                      rgba(30, 30, 30, 0.4) 0%, 
                      rgba(40, 40, 50, 0.3) 25%,
                      rgba(30, 30, 30, 0.35) 50%,
                      rgba(45, 45, 55, 0.3) 75%,
                      rgba(30, 30, 30, 0.4) 100%
                    )
                  `,
                                }}
                            />

                            <div
                                className="absolute inset-0"
                                style={{
                                    background: `
                    radial-gradient(ellipse 80% 50% at 20% 30%, rgba(100, 150, 200, 0.05) 0%, transparent 50%),
                    radial-gradient(ellipse 60% 40% at 80% 70%, rgba(100, 150, 200, 0.05) 0%, transparent 50%)
                  `,
                                }}
                            />

                            {droplets.map((drop) => (
                                <div
                                    key={drop.id}
                                    className={`water-droplet water-droplet-${drop.size}`}
                                    style={{
                                        left: `${drop.x}%`,
                                        top: `${drop.y}%`,
                                        transform: `rotate(${drop.rotation}deg)`,
                                    }}
                                />
                            ))}

                            <div className="absolute bottom-8 right-8 text-white/30 text-base flex items-center gap-3">
                                <Eye size={20} />
                                <span>Use Vision to see clearly</span>
                            </div>
                        </div>
                    )} */}
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