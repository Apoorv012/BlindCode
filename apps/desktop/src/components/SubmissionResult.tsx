import { CheckCircle2, XCircle, Clock, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface TestCaseResult {
    input: string;
    expected: string;
    actual: string;
    status: "passed" | "failed" | "error";
}

interface SubmissionResultProps {
    data: {
        status: "idle" | "accepted" | "rejected" | "error";
        message: string;
        score?: number;
        time?: number;
        peeks?: number;
        testResults?: TestCaseResult[];
        passedCount?: number;
        totalCount?: number;
    };
}

export default function SubmissionResult({ data }: SubmissionResultProps) {
    const [expandedCase, setExpandedCase] = useState<number | null>(0); // Pehla test case by default open

    if (data.status === "idle") {
        return (
            <div className="flex flex-col items-center justify-center h-full text-[#858585] p-8 text-center">
                <div className="w-16 h-16 mb-4 rounded-full border-4 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent animate-spin opacity-50"></div>
                <p className="text-lg font-mono">{data.message || "Waiting for submission..."}</p>
            </div>
        );
    }

    if (data.status === "error") {
        return (
            <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-xl m-4">
                <div className="flex items-center gap-3 text-red-400 font-bold text-lg mb-2">
                    <AlertTriangle size={24} />
                    <span>Execution Error</span>
                </div>
                <p className="text-red-300/80 font-mono text-sm">{data.message}</p>
            </div>
        );
    }

    const isSuccess = data.status === "accepted";

    return (
        <div className="flex flex-col h-full overflow-y-auto custom-scrollbar p-6">
            {/* OVERALL STATUS BANNER */}
            <div className={`p-6 rounded-2xl border mb-8 flex flex-col gap-4 ${isSuccess
                    ? "bg-green-500/10 border-green-500/30 shadow-[0_0_30px_rgba(34,197,94,0.1)]"
                    : "bg-red-500/10 border-red-500/30"
                }`}>
                <div className="flex items-center gap-4">
                    {isSuccess ? <CheckCircle2 size={36} className="text-green-500" /> : <XCircle size={36} className="text-red-500" />}
                    <div>
                        <h2 className={`text-2xl font-black tracking-wider ${isSuccess ? "text-green-500" : "text-red-500"}`}>
                            {isSuccess ? "ACCEPTED" : "WRONG ANSWER"}
                        </h2>
                        <p className="text-[#858585] text-sm mt-1">{data.message}</p>
                    </div>
                </div>

                {/* Stats row if available */}
                {(data.passedCount !== undefined && data.totalCount !== undefined) && (
                    <div className="flex items-center gap-6 mt-2 pt-4 border-t border-white/5">
                        <div className="flex flex-col">
                            <span className="text-[#858585] text-xs uppercase tracking-wider mb-1">Test Cases</span>
                            <span className="text-white font-bold font-mono text-lg">
                                <span className={isSuccess ? "text-green-400" : "text-red-400"}>{data.passedCount}</span>
                                <span className="text-[#555]"> / </span>
                                {data.totalCount}
                            </span>
                        </div>
                        {data.score !== undefined && (
                            <div className="flex flex-col">
                                <span className="text-[#858585] text-xs uppercase tracking-wider mb-1">Score Earned</span>
                                <span className="text-yellow-400 font-bold font-mono text-lg">+{data.score}</span>
                            </div>
                        )}
                        {data.time !== undefined && (
                            <div className="flex flex-col">
                                <span className="text-[#858585] text-xs uppercase tracking-wider mb-1">Time Taken</span>
                                <div className="flex items-center gap-1 text-white font-mono text-lg">
                                    <Clock size={16} className="text-cyan-400" />
                                    <span>{data.time}s</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* TEST CASES LIST */}
            {data.testResults && data.testResults.length > 0 && (
                <div className="flex flex-col gap-3">
                    <h3 className="text-white font-bold text-lg mb-2">Test Case Details</h3>
                    {data.testResults.map((test, index) => {
                        const isTestPassed = test.status === "passed";
                        const isExpanded = expandedCase === index;

                        return (
                            <div key={index} className="flex flex-col border border-[#3c3c3c] rounded-xl overflow-hidden bg-[#1e1e1e]">
                                {/* Test Case Header */}
                                <button
                                    onClick={() => setExpandedCase(isExpanded ? null : index)}
                                    className="flex items-center justify-between p-4 hover:bg-[#252526] transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        {isTestPassed ? <CheckCircle2 size={20} className="text-green-500" /> : <XCircle size={20} className="text-red-500" />}
                                        <span className={`font-bold ${isTestPassed ? "text-white" : "text-red-400"}`}>
                                            Test Case {index + 1}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className={`text-xs font-mono uppercase px-2 py-1 rounded ${isTestPassed ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                                            {isTestPassed ? "Passed" : "Failed"}
                                        </span>
                                        {isExpanded ? <ChevronUp size={18} className="text-[#858585]" /> : <ChevronDown size={18} className="text-[#858585]" />}
                                    </div>
                                </button>

                                {/* Test Case Expanded Details */}
                                {isExpanded && (
                                    <div className="p-4 bg-[#141414] border-t border-[#3c3c3c] flex flex-col gap-4">
                                        <div>
                                            <span className="text-[#858585] text-xs uppercase tracking-wider mb-1 block">Input</span>
                                            <div className="bg-[#1e1e1e] border border-[#2d2d2d] rounded-lg p-3 font-mono text-sm text-[#e0e0e0] whitespace-pre-wrap">
                                                {test.input || "(Empty Input)"}
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-[#858585] text-xs uppercase tracking-wider mb-1 block">Expected Output</span>
                                            <div className="bg-[#1e1e1e] border border-[#2d2d2d] rounded-lg p-3 font-mono text-sm text-green-400 whitespace-pre-wrap">
                                                {test.expected}
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-[#858585] text-xs uppercase tracking-wider mb-1 block">Your Output</span>
                                            <div className={`bg-[#1e1e1e] border border-[#2d2d2d] rounded-lg p-3 font-mono text-sm whitespace-pre-wrap ${isTestPassed ? "text-[#e0e0e0]" : "text-red-400"}`}>
                                                {test.actual || "(No Output)"}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}