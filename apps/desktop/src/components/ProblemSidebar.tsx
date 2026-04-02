import { FileText, History, CheckCircle2, XCircle, Clock, Trophy, Eye } from "lucide-react";
// Import the type 'Challenge' exactly as defined in your questions.ts file
import type { Challenge } from "../data/questions";
export interface SubmissionData {
    status: "idle" | "accepted" | "rejected" | "error";
    message: string;
    expected?: string;
    actual?: string;
    time?: number;
    score?: number;
    peeks?: number;
}

interface ProblemSidebarProps {
    challenge: Challenge; // Using the correct singular 'Challenge' interface
    activeTab: "description" | "submissions";
    onTabChange: (tab: "description" | "submissions") => void;
    submission: SubmissionData;
    level: number;
}

export default function ProblemSidebar({ challenge, activeTab, onTabChange, submission, level }: ProblemSidebarProps) {
    return (
        // Changed w-[450px] to w-full so the parent div in App.tsx controls the resizable width
        <div className="w-full bg-[#252526] flex flex-col border-r border-[#3c3c3c] shrink-0 h-full overflow-hidden">
            {/* Tabs Header */}
            <div className="flex items-center bg-[#1e1e1e] px-2 pt-2 border-b border-[#3c3c3c]">
                <button
                    onClick={() => onTabChange("description")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-colors text-sm font-medium ${activeTab === "description" ? "bg-[#252526] text-white" : "text-[#858585] hover:bg-[#2a2d2e] hover:text-[#cccccc]"
                        }`}
                >
                    <FileText size={16} />
                    Description
                </button>
                <button
                    onClick={() => onTabChange("submissions")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-colors text-sm font-medium ${activeTab === "submissions" ? "bg-[#252526] text-white" : "text-[#858585] hover:bg-[#2a2d2e] hover:text-[#cccccc]"
                        }`}
                >
                    <History size={16} />
                    Submissions
                </button>
            </div>

            {/* Tab Content Area */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                {activeTab === "description" ? (
                    <div className="flex flex-col gap-6">
                        {/* Title & Difficulty */}
                        <div>
                            <h1 className="text-2xl font-bold text-white mb-4">
                                {level}. {challenge.title}
                            </h1>
                            <div className="flex items-center gap-3">
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold tracking-wide ${challenge.difficulty === "easy" ? "bg-teal-500/20 text-teal-400" :
                                    challenge.difficulty === "medium" ? "bg-yellow-500/20 text-yellow-400" :
                                        "bg-red-500/20 text-red-400"
                                    }`}>
                                    {challenge.difficulty.charAt(0).toUpperCase() + challenge.difficulty.slice(1)}
                                </span>
                            </div>
                        </div>

                        {/* Description Text */}
                        <div className="text-[#d4d4d4] text-base leading-relaxed whitespace-pre-wrap">
                            {challenge.description}
                        </div>

                        {/* Input Format */}
                        {challenge.inputFormat && (
                            <div className="mt-2">
                                <p className="font-bold text-white mb-2">Input Format:</p>
                                <div className="text-[#858585] text-sm leading-relaxed whitespace-pre-wrap">
                                    {challenge.inputFormat}
                                </div>
                            </div>
                        )}

                        {/* Output Format */}
                        {challenge.outputFormat && (
                            <div className="mt-2">
                                <p className="font-bold text-white mb-2">Output Format:</p>
                                <div className="text-[#858585] text-sm leading-relaxed whitespace-pre-wrap">
                                    {challenge.outputFormat}
                                </div>
                            </div>
                        )}

                        {/* Constraints */}
                        <div className="mt-2">
                            <p className="font-bold text-white mb-2">Constraints:</p>
                            <ul className="list-disc list-inside text-[#858585] text-sm space-y-1">
                                {challenge.constraints ? (
                                    <li className="whitespace-pre-wrap">{challenge.constraints}</li>
                                ) : (
                                    <li>Time Limit: {challenge.timeLimit} seconds</li>
                                )}
                                <li>Vision Peeks allowed: Yes (with time penalty)</li>
                            </ul>
                        </div>

                        {/* Visible Sample Test Cases */}
                        {challenge.testCases.filter(tc => !tc.hidden).length > 0 && (
                            <div className="mt-4">
                                <p className="font-bold text-white mb-3">Sample Test Cases:</p>
                                <div className="flex flex-col gap-3">
                                    {challenge.testCases
                                        .filter(tc => !tc.hidden)
                                        .map((tc, i) => (
                                            <div key={i} className="bg-[#1a1a1a] border border-[#3c3c3c] rounded-xl p-4">
                                                <div className="text-xs text-[#555] font-mono uppercase tracking-widest mb-2">
                                                    Example {i + 1}
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <div className="text-[#858585] text-xs mb-1 font-semibold">Input</div>
                                                        <pre className="bg-[#0d0d0d] text-[#d4d4d4] text-xs font-mono px-3 py-2 rounded-lg border border-[#2a2a2a] whitespace-pre-wrap overflow-auto">
                                                            {tc.input || '(empty)'}
                                                        </pre>
                                                    </div>
                                                    <div>
                                                        <div className="text-[#858585] text-xs mb-1 font-semibold">Expected Output</div>
                                                        <pre className="bg-[#0d0d0d] text-[#4ec9b0] text-xs font-mono px-3 py-2 rounded-lg border border-[#2a2a2a] whitespace-pre-wrap overflow-auto">
                                                            {tc.expected}
                                                        </pre>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                                <p className="text-[#555] text-xs mt-3 italic">
                                    🔒 Additional hidden test cases will be run on submission.
                                </p>
                            </div>
                        )}
                    </div>
                ) : (
                    // Submissions View
                    <div className="flex flex-col gap-4">
                        {submission.status === "idle" ? (
                            <div className="text-center text-[#858585] mt-10">
                                <History size={48} className="mx-auto mb-4 opacity-20" />
                                <p>No submissions yet for this challenge.</p>
                                <p className="text-sm mt-2">Run your code to test, then click Submit when ready.</p>
                            </div>
                        ) : (
                            <div className={`p-6 rounded-xl border ${submission.status === "accepted" ? "bg-green-500/10 border-green-500/30" :
                                "bg-red-500/10 border-red-500/30"
                                }`}>
                                <div className="flex items-center gap-3 mb-4">
                                    {submission.status === "accepted" ? (
                                        <CheckCircle2 size={28} className="text-green-500" />
                                    ) : (
                                        <XCircle size={28} className="text-red-500" />
                                    )}
                                    <h2 className={`text-2xl font-bold ${submission.status === "accepted" ? "text-green-500" : "text-red-500"
                                        }`}>
                                        {submission.status === "accepted" ? "Accepted" : "Wrong Answer"}
                                    </h2>
                                </div>

                                <p className="text-[#d4d4d4] mb-6">{submission.message}</p>

                                {submission.status === "accepted" && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-[#1e1e1e] p-4 rounded-lg flex flex-col gap-1">
                                            <span className="text-[#858585] text-xs uppercase flex items-center gap-2"><Trophy size={14} /> Score Earned</span>
                                            <span className="text-yellow-400 font-bold text-xl">+{submission.score} pts</span>
                                        </div>
                                        <div className="bg-[#1e1e1e] p-4 rounded-lg flex flex-col gap-1">
                                            <span className="text-[#858585] text-xs uppercase flex items-center gap-2"><Clock size={14} /> Time Taken</span>
                                            <span className="text-white font-mono text-xl">{submission.time}s</span>
                                        </div>
                                        <div className="bg-[#1e1e1e] p-4 rounded-lg flex flex-col gap-1 col-span-2">
                                            <span className="text-[#858585] text-xs uppercase flex items-center gap-2"><Eye size={14} /> Peeks Used</span>
                                            <span className="text-white font-mono text-xl">{submission.peeks}</span>
                                        </div>
                                    </div>
                                )}

                                {submission.status === "rejected" && (
                                    <div className="flex flex-col gap-4 mt-4">
                                        <div>
                                            <span className="text-red-400 text-sm font-bold">Output:</span>
                                            <div className="bg-red-950/30 text-red-200 p-3 rounded mt-1 font-mono text-sm border border-red-500/20">
                                                {submission.actual || "Empty string"}
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-green-400 text-sm font-bold">Expected:</span>
                                            <div className="bg-green-950/30 text-green-200 p-3 rounded mt-1 font-mono text-sm border border-green-500/20">
                                                {submission.expected}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}