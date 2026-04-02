import { useState } from "react";
import { useEffect, useCallback, useRef } from "react";
import Editor from "./components/Editor";
import Terminal from "./components/Terminal";
import ProblemSidebar, { type SubmissionData, type LeaderboardParticipant } from "./components/ProblemSidebar";
import { LogOut, Trophy, Target, Clock, Zap, Loader2 } from "lucide-react";
import type { Challenge } from "./data/questions";

import { io, Socket } from "socket.io-client";
import { compileCode } from "./services/api";
import UserDashboard from "./pages/UserDashboard";
import { apiGetProblem, apiSubmitScore, API_URL, apiGetLeaderboard } from "./services/desktopApi";
import "./App.css";

// ── Contest info shape (passed from UserDashboard on join) ────────────────────
export interface ContestInfo {
    _id: string;
    contestCode: string;
    name: string;
    duration: number;
    status: "draft" | "running" | "paused" | "ended";
    startedAt?: string;
    intendedEndTime?: string;
    problemIds: { _id: string; title: string; difficulty: string }[];
}

// ─────────────────────────────────────────────────────────────────────────────
// OUTER GATE — shows UserDashboard until a contest is joined, then renders game
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
    const [contestInfo, setContestInfo] = useState<ContestInfo | null>(null);
    const [joinedTeamName, setJoinedTeamName] = useState("");
    const [joinedPassword, setJoinedPassword] = useState("");
    const [participantId, setParticipantId] = useState("");

    if (!contestInfo) {
        return (
            <UserDashboard
                onContestJoined={(_contestId, teamName, password, info, pId) => {
                    setJoinedTeamName(teamName);
                    setJoinedPassword(password);
                    setContestInfo(info);
                    setParticipantId(pId);
                }}
            />
        );
    }

    return (
        <ContestApp
            contestInfo={contestInfo}
            joinedTeamName={joinedTeamName}
            joinedPassword={joinedPassword}
            participantId={participantId}
            onExit={() => setContestInfo(null)}
        />
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// INNER GAME — Contest Application Logic
// ─────────────────────────────────────────────────────────────────────────────
const SABOTAGE_CHARS = [";", "{", "}", "[", "]", "?", "!", "x", "=", ")", "(", "<", ">"];

function ContestApp({
    contestInfo,
    joinedTeamName,
    joinedPassword,
    participantId,
    onExit,
}: {
    contestInfo: ContestInfo;
    joinedTeamName: string;
    joinedPassword: string;
    participantId: string;
    onExit: () => void;
}) {
    const [teamName] = useState(joinedTeamName);
    const [_password] = useState(joinedPassword);
    const [code, setCode] = useState("");
    const [isBlurred, setIsBlurred] = useState(true);
    const [logs, setLogs] = useState<string[]>([]);
    const [currentLevel, setCurrentLevel] = useState(1);
    const [timer, setTimer] = useState(0);
    const [visionTimeLeft, setVisionTimeLeft] = useState(0);
    const [peekCount, setPeekCount] = useState(0);
    const [language, setLanguage] = useState("cpp");
    const [isCompiling, setIsCompiling] = useState(false);
    const [contestTimeLeft, setContestTimeLeft] = useState(0);
    const [socket, setSocket] = useState<Socket | null>(null);

    // Heartbeat logic
    const statusTracker = useRef({
        status: 'idle',
        compiles: 0,
        wrongSubmissions: 0,
        reveals: 0
    });

    // Resizer States
    const [editorHeight, setEditorHeight] = useState(65);
    const [isDraggingEditor, setIsDraggingEditor] = useState(false);

    const [sidebarWidth, setSidebarWidth] = useState(450);
    const [isDraggingSidebar, setIsDraggingSidebar] = useState(false);

    const [score, setScore] = useState(0);
    const [showLevelComplete, setShowLevelComplete] = useState(false);
    const [showGameComplete, setShowGameComplete] = useState(false);
    const [levelStartTime, setLevelStartTime] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    // Problems fetched from API
    const [problems, setProblems] = useState<Challenge[]>([]);
    const [problemsLoading, setProblemsLoading] = useState(true);
    const [problemsError, setProblemsError] = useState("");

    // Sidebar States (UPDATED with Leaderboard)
    const [activeSidebarTab, setActiveSidebarTab] = useState<"description" | "submissions" | "leaderboard">("description");
    const [submissionData, setSubmissionData] = useState<SubmissionData>({ status: "idle", message: "" });
    const [leaderboardData, setLeaderboardData] = useState<LeaderboardParticipant[]>([]);

    // Fetch Leaderboard periodically
    useEffect(() => {
        const fetchLb = () => {
            if (!contestInfo?.contestCode) return;
            apiGetLeaderboard(contestInfo.contestCode)
                .then(data => setLeaderboardData(data))
                .catch(err => console.error("Failed to update leaderboard:", err));
        };

        fetchLb(); // Initial fetch
        const interval = setInterval(fetchLb, 5000); // Poll every 5 seconds

        return () => clearInterval(interval);
    }, [contestInfo.contestCode]);

    const handlePartialVision = (cost: number, text: string) => {
        setTimer(prev => prev + cost);
        statusTracker.current.reveals += 1;
        addLog(`👁️ Partial Vision used! +${cost}s penalty.`);
        addLog(`   Revealed: "${text.substring(0, 20)}${text.length > 20 ? "..." : ""}"`);
    };

    const currentChallenge = problems[currentLevel - 1];

    const addLog = useCallback((message: string) => {
        const timestamp = new Date().toLocaleTimeString();
        setLogs((prev) => [...prev, `[${timestamp}] ${message}`]);
    }, []);

    // Fetch all problems for this contest on mount
    useEffect(() => {
        if (contestInfo.problemIds.length === 0) {
            setProblemsLoading(false);
            setProblemsError("This contest has no problems assigned.");
            return;
        }
        Promise.all(contestInfo.problemIds.map(p => apiGetProblem(p._id)))
            .then(fetched => {
                setProblems(fetched);
                setProblemsLoading(false);
            })
            .catch(err => {
                setProblemsError(err.message || "Failed to load problems.");
                setProblemsLoading(false);
            });
    }, []);

    // Set starter code and log welcome once problems are loaded
    useEffect(() => {
        if (problemsLoading || !currentChallenge) return;
        setCode(currentChallenge.starterCode[language] ?? "");
        setLevelStartTime(Date.now());
        addLog(`✓ Welcome, Team ${teamName}! Contest: ${contestInfo.name}`);
        addLog(`🎮 Problem 1: ${currentChallenge.title}`);
        addLog(`⏱️ Solve each problem to advance to the next.`);
        addLog("👁️ Use Vision to peek, but beware of the sabotage...");
    }, [problemsLoading]);

    useEffect(() => {
        let contestEndTime = contestInfo.intendedEndTime
            ? new Date(contestInfo.intendedEndTime).getTime()
            : (contestInfo.startedAt ? new Date(contestInfo.startedAt).getTime() + (contestInfo.duration * 60000) : Date.now() + (contestInfo.duration * 60000));

        const interval = setInterval(() => {
            setTimer((prev) => prev + 1);
            setContestTimeLeft(Math.floor(Math.max(0, contestEndTime - Date.now()) / 1000));
        }, 1000);
        return () => clearInterval(interval);
    }, [contestInfo]);

    useEffect(() => {
        const newSocket = io(API_URL);
        setSocket(newSocket);

        newSocket.on("connect", () => {
            newSocket.emit("participant_join", {
                contestId: contestInfo.contestCode,
                participantId: participantId
            });
        });

        return () => {
            newSocket.disconnect();
        };
    }, [contestInfo.contestCode, participantId]);

    // We keep these in refs so the heartbeat interval doesn't reset on every minor state change
    const latestBeatPayload = useRef({
        contestCode: contestInfo.contestCode,
        participantId: participantId,
        problemId: currentChallenge?._id,
    });
    useEffect(() => {
        latestBeatPayload.current = {
            contestCode: contestInfo.contestCode,
            participantId: participantId,
            problemId: currentChallenge?._id,
        };
    }, [contestInfo.contestCode, participantId, currentChallenge?._id]);

    useEffect(() => {
        let timeoutId: ReturnType<typeof setTimeout>;

        const beat = () => {
            if (socket && socket.connected) {
                const currentObj = latestBeatPayload.current;
                socket.emit("update_status", {
                    contestId: currentObj.contestCode,
                    participantId: currentObj.participantId,
                    status: statusTracker.current.compiles > 0 ? 'coding' : 'idle',
                    compiles: statusTracker.current.compiles,
                    wrongSubmissions: statusTracker.current.wrongSubmissions,
                    reveals: statusTracker.current.reveals,
                    currentProblemId: currentObj.problemId
                });
            }
            // 10s + random 0 to 2 seconds
            timeoutId = setTimeout(beat, 10000 + Math.floor(Math.random() * 2000));
        };

        // First beat stagger
        timeoutId = setTimeout(beat, 10000 + Math.floor(Math.random() * 2000));

        return () => clearTimeout(timeoutId);
    }, [socket]);

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) {
                addLog("⚠️ TAB SWITCH DETECTED. +30s PENALTY.");
                setTimer((prev) => prev + 30);
            }
        };
        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    }, [addLog]);

    useEffect(() => {
        if (visionTimeLeft > 0) {
            const interval = setInterval(() => {
                setVisionTimeLeft((prev) => {
                    const newTime = Math.max(0, prev - 0.1);
                    if (newTime === 0) {
                        setIsBlurred(true);
                        sabotageCode();
                    }
                    return newTime;
                });
            }, 100);
            return () => clearInterval(interval);
        }
    }, [visionTimeLeft]);

    // Handle Editor Vertical Resizing
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDraggingEditor || !containerRef.current) return;
            const containerRect = containerRef.current.getBoundingClientRect();
            const newHeight = ((e.clientY - containerRect.top) / containerRect.height) * 100;
            setEditorHeight(Math.min(Math.max(newHeight, 30), 85));
        };

        const handleMouseUp = () => {
            setIsDraggingEditor(false);
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
        };

        if (isDraggingEditor) {
            document.body.style.cursor = "row-resize";
            document.body.style.userSelect = "none";
            document.addEventListener("mousemove", handleMouseMove);
            document.addEventListener("mouseup", handleMouseUp);
        }

        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isDraggingEditor]);

    // Handle Sidebar Horizontal Resizing
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDraggingSidebar) return;
            // Constrain the sidebar width between 300px and 800px
            const newWidth = Math.max(300, Math.min(e.clientX, 800));
            setSidebarWidth(newWidth);
        };

        const handleMouseUp = () => {
            setIsDraggingSidebar(false);
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
        };

        if (isDraggingSidebar) {
            document.body.style.cursor = "col-resize";
            document.body.style.userSelect = "none";
            document.addEventListener("mousemove", handleMouseMove);
            document.addEventListener("mouseup", handleMouseUp);
        }

        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isDraggingSidebar]);

    const sabotageCode = () => {
        setCode((prevCode) => {
            if (prevCode.length === 0) return prevCode;
            const randomChar = SABOTAGE_CHARS[Math.floor(Math.random() * SABOTAGE_CHARS.length)];
            const randomIndex = Math.floor(Math.random() * (prevCode.length + 1));
            const newCode = prevCode.slice(0, randomIndex) + randomChar + prevCode.slice(randomIndex);
            addLog(`🎭 Sabotage! Character '${randomChar}' injected at position ${randomIndex}`);
            return newCode;
        });
    };

    const handleLogout = () => {
        setCode("");
        setLogs([]);
        setTimer(0);
        setPeekCount(0);
        setIsBlurred(true);
        setCurrentLevel(1);
        setScore(0);
        setShowLevelComplete(false);
        setShowGameComplete(false);
        setSubmissionData({ status: "idle", message: "" });
        setActiveSidebarTab("description");
        onExit();
    };

    const handleCodeChange = (newCode: string) => {
        setCode(newCode);
    };

    const handleLanguageChange = (newLang: string) => {
        setLanguage(newLang);
        setCode(currentChallenge.starterCode[newLang] || "");
        addLog(`🔄 Switched to ${newLang === "cpp" ? "C++" : newLang === "python" ? "Python" : "JavaScript"}`);
    };

    const calculateScore = (timeTaken: number, peeks: number, difficulty: string) => {
        const baseScore = difficulty === "easy" ? 100 : difficulty === "medium" ? 200 : 300;
        const timeBonus = Math.max(0, Math.floor((currentChallenge.timeLimit - timeTaken) * 0.5));
        const peekPenalty = peeks * 20;
        return Math.max(0, baseScore + timeBonus - peekPenalty);
    };

    // Run only visible test cases
    const handleRun = async () => {
        if (isCompiling || !currentChallenge) return;
        setIsCompiling(true);
        statusTracker.current.compiles += 1;

        const visibleCases = currentChallenge.testCases.filter(tc => !tc.hidden);
        addLog(`🔄 Running ${visibleCases.length} visible test case${visibleCases.length !== 1 ? 's' : ''}...`);

        try {
            for (let i = 0; i < visibleCases.length; i++) {
                const tc = visibleCases[i];
                addLog(`⏳ Case ${i + 1}: input="${tc.input || '(empty)'}"`);

                const result = await compileCode(code, language, tc.input);

                if (result.error || result.hasError) {
                    addLog(`❌ Case ${i + 1} — Error: ${result.error || result.output}`);
                    break;
                }

                const actual = result.output.trim();
                const expected = tc.expected.trim();
                if (actual === expected) {
                    addLog(`✅ Case ${i + 1} Passed — Output: "${actual}"`);
                } else {
                    addLog(`❌ Case ${i + 1} Failed`);
                    addLog(`   Expected: "${expected}"`);
                    addLog(`   Got:      "${actual}"`);
                }
            }
            addLog("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        } catch (error) {
            addLog("❌ Failed to connect to compiler service");
            console.error(error);
        } finally {
            setIsCompiling(false);
        }
    };

    const handleSubmit = async () => {
        if (isCompiling) return;

        setIsCompiling(true);
        setActiveSidebarTab("submissions");
        setSubmissionData({ status: "idle", message: "Evaluating your code..." });
        addLog("🚀 Submitting code for evaluation...");

        // Submit runs ALL test cases (visible + hidden)
        const allTestCases = currentChallenge?.testCases || [];
        let allPassed = true;
        let passedCount = 0;
        const testResults = [];

        try {
            for (let i = 0; i < allTestCases.length; i++) {
                const tc = allTestCases[i];
                const label = tc.hidden ? `Hidden Case ${i + 1}` : `Case ${i + 1}`;
                addLog(`⏳ Running ${label}/${allTestCases.length}...`);

                const result = await compileCode(code, language, tc.input);

                if (result.error || result.hasError) {
                    allPassed = false;
                    testResults.push({
                        input: tc.hidden ? '(hidden)' : tc.input,
                        expected: tc.hidden ? '(hidden)' : tc.expected,
                        actual: result.output || result.error || "Runtime Error",
                        status: "error",
                        hidden: tc.hidden
                    });
                    addLog(`❌ ${label} Failed: Compilation/Runtime Error.`);
                    break;
                }

                const actualOutput = result.output.trim();
                const expectedOutput = tc.expected.trim();

                if (actualOutput === expectedOutput) {
                    passedCount++;
                    testResults.push({
                        input: tc.hidden ? '(hidden)' : tc.input,
                        expected: tc.hidden ? '(hidden)' : tc.expected,
                        actual: actualOutput,
                        status: "passed",
                        hidden: tc.hidden
                    });
                    addLog(`✅ ${label} Passed`);
                } else {
                    allPassed = false;
                    testResults.push({
                        input: tc.hidden ? '(hidden)' : tc.input,
                        expected: tc.hidden ? '(hidden)' : tc.expected,
                        actual: tc.hidden ? '(hidden)' : actualOutput,
                        status: "failed",
                        hidden: tc.hidden
                    });
                    addLog(`❌ ${label} Failed: Wrong Answer.`);
                }
            }

            // Submit to backend to update real score and status
            let backendScore = 0;
            try {
                const submitRes = await apiSubmitScore(contestInfo.contestCode, participantId, {
                    passed: allPassed,
                    timeTaken: Math.floor((Date.now() - levelStartTime) / 1000), // Note: does not include penalties correctly, but we'll abide by current compute
                    peeks: peekCount,
                    difficulty: currentChallenge.difficulty
                });
                if (submitRes.success && submitRes.passed) {
                    backendScore = submitRes.scoreEarned || 0;
                }
            } catch (err) {
                console.error("Failed to submit score to backend", err);
            }

            if (allPassed) {
                const timeTaken = Math.floor((Date.now() - levelStartTime) / 1000);
                const levelScore = backendScore > 0 ? backendScore : calculateScore(timeTaken, peekCount, currentChallenge.difficulty);

                setScore((prev) => prev + levelScore);

                // Extended submission data
                setSubmissionData({
                    status: "accepted",
                    message: "All test cases passed! Outstanding work.",
                    score: levelScore,
                    time: timeTaken,
                    peeks: peekCount,
                    testResults: testResults,
                    passedCount,
                    totalCount: allTestCases.length
                } as any);

                addLog(`✅ SUBMISSION ACCEPTED: +${levelScore} pts`);

                setTimeout(() => {
                    if (currentLevel >= problems.length) {
                        setShowGameComplete(true);
                    } else {
                        setShowLevelComplete(true);
                    }
                }, 1500);
            } else {
                statusTracker.current.wrongSubmissions += 1;
                // Determine if it was just hidden tests that failed or visible tests
                const failedVisible = testResults.some(r => r.status === 'error' || (r.status === 'failed' && !r.hidden));

                if (failedVisible) {
                    setSubmissionData({
                        status: "rejected",
                        message: `Failed some sample test cases. Check your logic and expected outputs.`,
                        testResults: testResults.filter(r => r.status === 'failed' && !r.hidden),
                        passedCount,
                        totalCount: allTestCases.length
                    } as any);
                } else {
                    setSubmissionData({
                        status: "rejected",
                        message: `Sample cases passed, but hidden cases failed. Passed ${passedCount}/${allTestCases.length}.`,
                        testResults: [], // hide details for hidden cases!
                        passedCount,
                        totalCount: allTestCases.length
                    } as any);
                }
                addLog(`❌ SUBMISSION REJECTED: Failed some test cases.`);
            }
        } catch (error) {
            setSubmissionData({ status: "error", message: "Failed to connect to compiler service." } as any);
            addLog("❌ Failed to connect to compiler service");
        } finally {
            setIsCompiling(false);
        }
    };

    const handleNextLevel = () => {
        setShowLevelComplete(false);
        setCurrentLevel((prev) => prev + 1);
        const nextChallenge = problems[currentLevel]; // currentLevel not yet incremented
        setCode(nextChallenge?.starterCode[language] ?? "");
        setPeekCount(0);
        setIsBlurred(true);
        setLevelStartTime(Date.now());
        setActiveSidebarTab("description");
        setSubmissionData({ status: "idle", message: "" });

        addLog(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        addLog(`🎮 Problem ${currentLevel + 1}: ${nextChallenge?.title ?? ""}`);
    };

    const handleVision = () => {
        if (visionTimeLeft > 0) return;
        setPeekCount((prev) => prev + 1);
        statusTracker.current.reveals += 1;
        setIsBlurred(false);
        setVisionTimeLeft(5);
        setTimer(prev => prev + 30);
        addLog(`👁️ Vision activated! +30s PENALTY. Glass clears for 5 seconds...`);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    return (
        <div className="h-screen flex flex-row bg-[#1a1a1a] overflow-hidden">

            {/* Problems loading overlay */}
            {problemsLoading && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[100]">
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 size={48} className="text-cyan-400 animate-spin" />
                        <p className="text-white text-xl font-semibold">Loading problems...</p>
                    </div>
                </div>
            )}

            {!problemsLoading && problemsError && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[100]">
                    <div className="text-center">
                        <p className="text-red-400 text-2xl font-bold mb-2">⚠️ Error Loading Problems</p>
                        <p className="text-white">{problemsError}</p>
                    </div>
                </div>
            )}

            {showLevelComplete && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-8">
                    <div className="bg-[#252526] border border-[#3c3c3c] rounded-3xl p-14 text-center max-w-lg shadow-2xl">
                        <div className="text-8xl mb-8">🎉</div>
                        <h2 className="text-4xl font-bold text-white mb-4">Level Complete!</h2>
                        <p className="text-[#858585] mb-3 text-xl">You completed Level {currentLevel}</p>
                        <p className="text-yellow-400 text-3xl font-bold mb-10">Score: {score}</p>
                        <button
                            onClick={handleNextLevel}
                            className="px-10 py-5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-bold text-xl transition-all hover:scale-105"
                        >
                            Next Level →
                        </button>
                    </div>
                </div>
            )}

            {showGameComplete && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center z-50 p-8">
                    <div className="bg-[#252526] border border-yellow-500/30 rounded-3xl p-14 text-center max-w-lg shadow-[0_0_50px_rgba(234,179,8,0.2)] relative overflow-hidden">
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                        <div className="relative z-10">
                            <div className="text-8xl mb-8 animate-bounce">🏆</div>
                            <h2 className="text-5xl font-black text-white mb-4 tracking-tighter" style={{ fontFamily: 'var(--font-orbitron)' }}>MISSION ACCOMPLISHED</h2>
                            <p className="text-[#858585] mb-6 text-xl font-mono">Operations complete. System standby.</p>
                            <div className="bg-black/50 p-6 rounded-2xl border border-[#3c3c3c] mb-10">
                                <p className="text-yellow-400 text-5xl font-bold mb-2 tracking-widest" style={{ fontFamily: 'var(--font-orbitron)' }}>{score}</p>
                                <p className="text-[#666] text-sm uppercase tracking-widest">Final Parameter Score</p>
                            </div>
                            <p className="text-[#858585] mb-10 text-lg font-mono">Time: {formatTime(timer)} | Peeks: {peekCount}</p>
                            <button
                                onClick={handleLogout}
                                className="px-12 py-5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-bold text-xl transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(168,85,247,0.5)]"
                                style={{ fontFamily: 'var(--font-orbitron)' }}
                            >
                                INITIATE REBOOT
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Left Column: Problem Sidebar (Now wrapped for dynamic width) */}
            <div style={{ width: sidebarWidth }} className="shrink-0 flex flex-col relative h-full">
                {currentChallenge && (
                    <ProblemSidebar
                        challenge={currentChallenge}
                        activeTab={activeSidebarTab}
                        onTabChange={setActiveSidebarTab}
                        submission={submissionData}
                        level={currentLevel}
                        leaderboard={leaderboardData}
                        currentParticipantId={participantId}
                    />
                )}
            </div>

            {/* Horizontal Resizer for Sidebar */}
            <div
                className="w-2 bg-[#252526] hover:bg-[#007acc] cursor-col-resize flex flex-col items-center justify-center shrink-0 transition-colors group z-50 border-r border-[#3c3c3c]"
                onMouseDown={() => setIsDraggingSidebar(true)}
            >
                <div className="h-20 w-1 bg-[#555] rounded group-hover:bg-white/50 transition-colors" />
            </div>

            {/* Right Column: Editor and Terminal */}
            <div className="flex-1 flex flex-col min-w-0 h-full">
                {/* Top Info Bar */}
                <div className="flex items-center justify-between px-8 py-4 bg-[#252526] border-b border-[#3c3c3c] shrink-0">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3">
                            <Zap className="text-yellow-400" size={28} />
                            <span className="text-white font-bold text-xl tracking-wider" style={{ fontFamily: 'var(--font-orbitron)' }}>BLINDCODE</span>
                        </div>
                        <div className="h-8 w-px bg-[#3c3c3c]" />
                        <div className="flex items-center gap-3">
                            <span className="text-[#858585] text-base">Team:</span>
                            <span className="text-white font-semibold text-base">{teamName || "—"}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3 px-5 py-3 bg-[#1e1e1e] rounded-xl">
                            <Target size={18} className="text-cyan-400" />
                            <span className="text-cyan-400 font-bold text-base">{currentLevel}/{problems.length}</span>
                        </div>
                        <div className="flex items-center gap-3 px-5 py-3 bg-[#1e1e1e] rounded-xl">
                            <Trophy size={18} className="text-yellow-400" />
                            <span className="text-yellow-400 font-bold text-base">{score}</span>
                        </div>
                        <div className="flex items-center gap-3 px-5 py-3 bg-[#1e1e1e] rounded-xl flex-col items-start gap-0 min-w-32">
                            <span className="text-[#858585] text-[10px] uppercase font-bold tracking-widest leading-none mb-1">Time Left</span>
                            <div className="flex items-center gap-2">
                                <Clock size={16} className="text-white opacity-60" />
                                <span className="text-white font-mono font-bold text-base leading-none">{formatTime(contestTimeLeft)}</span>
                            </div>
                        </div>

                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 px-5 py-3 bg-red-600/20 hover:bg-red-600/30 border border-red-600/40 text-red-400 rounded-xl transition-all text-base font-semibold"
                        >
                            <LogOut size={18} />
                            <span>Quit</span>
                        </button>
                    </div>
                </div>

                <div ref={containerRef} className="flex-1 flex flex-col overflow-hidden">
                    <div style={{ height: `${editorHeight}%` }} className="overflow-hidden">
                        <Editor
                            code={code}
                            onCodeChange={handleCodeChange}
                            isBlurred={isBlurred}
                            onRun={handleRun}
                            onSubmit={handleSubmit}
                            onVision={handleVision}
                            level={currentLevel}
                            visionTimeLeft={visionTimeLeft}
                            teamName={teamName}
                            language={language}
                            onLanguageChange={handleLanguageChange}
                            isCompiling={isCompiling}
                            onPartialVision={handlePartialVision}
                        />
                    </div>

                    <div
                        className="h-2 bg-[#252526] hover:bg-[#007acc] cursor-row-resize flex items-center justify-center shrink-0 transition-colors group"
                        onMouseDown={() => setIsDraggingEditor(true)}
                    >
                        <div className="w-20 h-1 bg-[#555] rounded group-hover:bg-white/50 transition-colors" />
                    </div>

                    <div style={{ height: `${100 - editorHeight}%` }} className="overflow-hidden">
                        <Terminal logs={logs} />
                    </div>
                </div>
            </div>
        </div>
    );
}