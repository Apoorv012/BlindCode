import { useEffect, useRef } from "react";
import { Terminal as TerminalIcon, X } from "lucide-react";

interface TerminalProps {
    logs: string[];
}

export default function Terminal({ logs }: TerminalProps) {
    const terminalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    }, [logs]);

    return (
        <div className="h-full flex flex-col bg-[#1e1e1e]">
            <div className="flex items-center justify-between px-8 py-4 bg-[#252526] border-b border-[#3c3c3c] shrink-0">
                <div className="flex items-center gap-8">
                    <span className="text-[#6e6e6e] hover:text-white cursor-pointer text-base">PROBLEMS</span>
                    <span className="text-[#6e6e6e] hover:text-white cursor-pointer text-base">OUTPUT</span>
                    <span className="text-[#6e6e6e] hover:text-white cursor-pointer text-base">DEBUG CONSOLE</span>
                    <span className="text-white border-b-2 border-yellow-500 pb-1 text-base font-medium">TERMINAL</span>
                    <span className="text-[#6e6e6e] hover:text-white cursor-pointer text-base">PORTS</span>
                </div>
                <div className="flex items-center gap-3">
                    <TerminalIcon size={18} className="text-[#6e6e6e]" />
                    <X size={18} className="text-[#6e6e6e] hover:text-white cursor-pointer" />
                </div>
            </div>

            <div className="px-8 py-3 bg-[#1e1e1e] border-b border-[#3c3c3c] shrink-0">
                <div className="flex items-center gap-3">
                    <span className="text-green-400 text-base font-medium">➜</span>
                    <span className="text-cyan-400 text-base font-medium">zsh</span>
                    <X size={14} className="text-[#6e6e6e] hover:text-white cursor-pointer ml-2" />
                </div>
            </div>

            <div ref={terminalRef} className="flex-1 p-6 overflow-y-auto font-mono text-base">
                {logs.length === 0 ? (
                    <div className="text-[#6e6e6e]">
                        Terminal ready. Run your code to see output here.
                    </div>
                ) : (
                    logs.map((log, index) => {
                        let colorClass = "text-[#d4d4d4]";

                        if (log.includes("✓") || log.includes("✅") || log.includes("CORRECT")) {
                            colorClass = "text-green-400";
                        } else if (log.includes("❌") || log.includes("error") || log.includes("Error")) {
                            colorClass = "text-red-400";
                        } else if (log.includes("⚠️") || log.includes("TAB SWITCH") || log.includes("Sabotage")) {
                            colorClass = "text-yellow-400";
                        } else if (log.includes("🎮") || log.includes("Level")) {
                            colorClass = "text-purple-400";
                        } else if (log.includes("📋") || log.includes("Challenge")) {
                            colorClass = "text-blue-400";
                        } else if (log.includes("⏱️") || log.includes("Time")) {
                            colorClass = "text-cyan-400";
                        } else if (log.includes("🔄") || log.includes("Compiling")) {
                            colorClass = "text-orange-400";
                        } else if (log.includes("▶️")) {
                            colorClass = "text-green-300";
                        } else if (log.includes("👁️")) {
                            colorClass = "text-purple-300";
                        } else if (log.includes("🏆") || log.includes("Score")) {
                            colorClass = "text-yellow-300";
                        } else if (log.includes("🎉")) {
                            colorClass = "text-pink-400";
                        } else if (log.includes("━")) {
                            colorClass = "text-[#555]";
                        }

                        return (
                            <div key={index} className={`${colorClass} leading-8`}>
                                {log}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
