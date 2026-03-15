import { useState, useEffect, useCallback, useRef } from "react";
import Registration from "./components/Registration";
import Editor from "./components/Editor";
import Terminal from "./components/Terminal";
import ProblemSidebar, { type SubmissionData } from "./components/ProblemSidebar";
import { LogOut, Trophy, Target, Clock, Zap } from "lucide-react";
import { CHALLENGES } from "./data/questions";
import { compileCode } from "./services/api";
import "./App.css";

const SABOTAGE_CHARS = [";", "{", "}", "[", "]", "?", "!", "x", "=", ")", "(", "<", ">"];

export default function App() {
    const [isRegistered, setIsRegistered] = useState(false);
    const [playerName, setPlayerName] = useState("");
    const [_rollNumber, setRollNumber] = useState("");
    const [code, setCode] = useState("");
    const [isBlurred, setIsBlurred] = useState(true);
    const [logs, setLogs] = useState<string[]>([]);
    const [currentLevel, setCurrentLevel] = useState(1);
    const [timer, setTimer] = useState(0);
    const [visionTimeLeft, setVisionTimeLeft] = useState(0);
    const [peekCount, setPeekCount] = useState(0);
    const [language, setLanguage] = useState("cpp");
    const [isCompiling, setIsCompiling] = useState(false);

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

    // Sidebar States
    const [activeSidebarTab, setActiveSidebarTab] = useState<"description" | "submissions">("description");
    const [submissionData, setSubmissionData] = useState<SubmissionData>({ status: "idle", message: "" });

    const handlePartialVision = (cost: number, text: string) => {
        setTimer(prev => prev + cost);
        addLog(`👁️ Partial Vision used! +${cost}s penalty.`);
        addLog(`   Revealed: "${text.substring(0, 20)}${text.length > 20 ? "..." : ""}"`);
    };

    const currentChallenge = CHALLENGES[currentLevel - 1] || CHALLENGES[0];

    const addLog = useCallback((message: string) => {
        const timestamp = new Date().toLocaleTimeString();
        setLogs((prev) => [...prev, `[${timestamp}] ${message}`]);
    }, []);

    useEffect(() => {
        if (!isRegistered) return;
        const interval = setInterval(() => {
            setTimer((prev) => prev + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, [isRegistered]);

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden && isRegistered) {
                addLog("⚠️ TAB SWITCH DETECTED. +30s PENALTY.");
                setTimer((prev) => prev + 30);
            }
        };
        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    }, [isRegistered, addLog]);

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

    const handleRegister = (name: string, roll: string) => {
        setPlayerName(name);
        setRollNumber(roll);
        setIsRegistered(true);
        setCode(currentChallenge.starterCode[language]);
        setLevelStartTime(Date.now());

        addLog(`✓ Welcome, ${name}! Game started.`);
        addLog(`🎮 Level ${currentLevel}: ${currentChallenge.title}`);
        addLog(`⏱️ Time limit: ${currentChallenge.timeLimit} seconds`);
        addLog("👁️ Use Vision to peek, but beware of the sabotage...");
    };

    const handleLogout = () => {
        setIsRegistered(false);
        setPlayerName("");
        setRollNumber("");
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

    // JUST FOR TESTING - Prints output to Terminal
    const handleRun = async () => {
        if (isCompiling) return;
        setIsCompiling(true);
        addLog("🔄 Compiling...");

        try {
            const result = await compileCode(code, language);

            if (result.error) {
                addLog(`❌ Error: ${result.error}`);
                return;
            }

            addLog("▶️ Execution started...");
            addLog("━━━━━━━━━━━━━━━━ Output ━━━━━━━━━━━━━━━━");
            const outputLines = result.output.split("\n");
            outputLines.forEach((line: string) => {
                if (line.trim()) addLog(`   ${line}`);
            });
            addLog("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

            if (result.hasError) {
                addLog(`❌ Compilation/Runtime error - check your code.`);
            }
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

        const testCases = currentChallenge.testCases || [];
        let allPassed = true;
        let passedCount = 0;
        const testResults = []; // NAYA: Sab test cases ka result store karenge

        try {
            for (let i = 0; i < testCases.length; i++) {
                const tc = testCases[i];
                addLog(`⏳ Running Test Case ${i + 1}/${testCases.length}...`);

                // Har test case ke liye input bhej kar code run karna
                const result = await compileCode(code, language, tc.input);

                if (result.error || result.hasError) {
                    allPassed = false;
                    testResults.push({
                        input: tc.input,
                        expected: tc.expected,
                        actual: result.output || result.error || "Runtime Error",
                        status: "error"
                    });
                    addLog(`❌ Test Case ${i + 1} Failed: Compilation/Runtime Error.`);
                    break; // Error aane par aage ke tests run mat karo
                }

                const actualOutput = result.output.trim();
                const expectedOutput = tc.expected.trim();

                if (actualOutput === expectedOutput) {
                    passedCount++;
                    testResults.push({
                        input: tc.input, expected: tc.expected, actual: actualOutput, status: "passed"
                    });
                    addLog(`✅ Test Case ${i + 1} Passed`);
                } else {
                    allPassed = false;
                    testResults.push({
                        input: tc.input, expected: tc.expected, actual: actualOutput, status: "failed"
                    });
                    addLog(`❌ Test Case ${i + 1} Failed: Wrong Answer.`);
                }
            }

            if (allPassed) {
                const timeTaken = Math.floor((Date.now() - levelStartTime) / 1000);
                const levelScore = calculateScore(timeTaken, peekCount, currentChallenge.difficulty);

                setScore((prev) => prev + levelScore);

                // NAYA: Extended submission data
                setSubmissionData({
                    status: "accepted",
                    message: "All test cases passed! Outstanding work.",
                    score: levelScore,
                    time: timeTaken,
                    peeks: peekCount,
                    testResults: testResults,
                    passedCount,
                    totalCount: testCases.length
                } as any); // "as any" temporary hai Phase 3 tak

                addLog(`✅ SUBMISSION ACCEPTED: +${levelScore} pts`);

                setTimeout(() => {
                    if (currentLevel >= CHALLENGES.length) {
                        setShowGameComplete(true);
                    } else {
                        setShowLevelComplete(true);
                    }
                }, 1500);
            } else {
                setSubmissionData({
                    status: "rejected",
                    message: `Passed ${passedCount} out of ${testCases.length} test cases.`,
                    testResults: testResults,
                    passedCount,
                    totalCount: testCases.length
                } as any);
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
        const nextChallenge = CHALLENGES[currentLevel];
        setCode(nextChallenge.starterCode[language]);
        setPeekCount(0);
        setIsBlurred(true);
        setLevelStartTime(Date.now());
        setActiveSidebarTab("description");
        setSubmissionData({ status: "idle", message: "" });

        addLog(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        addLog(`🎮 Level ${currentLevel + 1}: ${nextChallenge.title}`);
        addLog(`⏱️ Time limit: ${nextChallenge.timeLimit} seconds`);
    };

    const handleVision = () => {
        if (visionTimeLeft > 0) return;
        setPeekCount((prev) => prev + 1);
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
            {!isRegistered && <Registration onRegister={handleRegister} />}

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
            {isRegistered && (
                <div style={{ width: sidebarWidth }} className="shrink-0 flex flex-col relative h-full">
                    <ProblemSidebar
                        challenge={currentChallenge}
                        activeTab={activeSidebarTab}
                        onTabChange={setActiveSidebarTab}
                        submission={submissionData}
                        level={currentLevel}
                    />
                </div>
            )}

            {/* Horizontal Resizer for Sidebar */}
            {isRegistered && (
                <div
                    className="w-2 bg-[#252526] hover:bg-[#007acc] cursor-col-resize flex flex-col items-center justify-center shrink-0 transition-colors group z-50 border-r border-[#3c3c3c]"
                    onMouseDown={() => setIsDraggingSidebar(true)}
                >
                    <div className="h-20 w-1 bg-[#555] rounded group-hover:bg-white/50 transition-colors" />
                </div>
            )}

            {/* Right Column: Editor and Terminal */}
            <div className="flex-1 flex flex-col min-w-0 h-full">
                {/* Top Info Bar */}
                <div className="flex items-center justify-between px-8 py-4 bg-[#252526] border-b border-[#3c3c3c] shrink-0">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3">
                            <Zap className="text-yellow-400" size={28} />
                            <span className="text-white font-bold text-xl tracking-wider" style={{ fontFamily: 'var(--font-orbitron)' }}>BLACK FLASH</span>
                        </div>
                        <div className="h-8 w-px bg-[#3c3c3c]" />
                        <div className="flex items-center gap-3">
                            <span className="text-[#858585] text-base">Player:</span>
                            <span className="text-white font-semibold text-base">{playerName || "—"}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3 px-5 py-3 bg-[#1e1e1e] rounded-xl">
                            <Target size={18} className="text-cyan-400" />
                            <span className="text-cyan-400 font-bold text-base">{currentLevel}/{CHALLENGES.length}</span>
                        </div>
                        <div className="flex items-center gap-3 px-5 py-3 bg-[#1e1e1e] rounded-xl">
                            <Trophy size={18} className="text-yellow-400" />
                            <span className="text-yellow-400 font-bold text-base">{score}</span>
                        </div>
                        <div className="flex items-center gap-3 px-5 py-3 bg-[#1e1e1e] rounded-xl">
                            <Clock size={18} className="text-white" />
                            <span className="text-white font-mono font-bold text-base">{formatTime(timer)}</span>
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
                            playerName={playerName}
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