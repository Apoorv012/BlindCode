import { useState, useEffect, useRef } from "react";
import { Zap, ArrowRight, Loader2, AlertCircle, Users, Clock, BookOpen } from "lucide-react";
import { apiGetContestByCode, apiJoinContest, apiGetContestStatus } from "../services/desktopApi";
import "./UserDashboard.css";

interface ContestInfo {
  _id: string;
  contestCode: string;
  name: string;
  duration: number;
  status: "draft" | "active" | "paused" | "ended";
  problemIds: { _id: string; title: string; difficulty: string }[];
}

interface UserDashboardProps {
  onContestJoined: (contestId: string, playerName: string, enrollment: string, contestInfo: ContestInfo) => void;
}

type Screen = "enter-code" | "enter-name" | "waiting";

export default function UserDashboard({ onContestJoined }: UserDashboardProps) {
  const [screen, setScreen] = useState<Screen>("enter-code");
  const [codeInput, setCodeInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [enrollmentInput, setEnrollmentInput] = useState("");
  const [contest, setContest] = useState<ContestInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dots, setDots] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Animate waiting dots
  useEffect(() => {
    const t = setInterval(() => setDots(d => (d + 1) % 4), 500);
    return () => clearInterval(t);
  }, []);

  // Poll contest status while waiting
  useEffect(() => {
    if (screen !== "waiting" || !contest) return;

    const poll = async () => {
      try {
        const data = await apiGetContestStatus(contest.contestCode);
        if (data.status === "active") {
          if (pollRef.current) clearInterval(pollRef.current);
          onContestJoined(contest._id, nameInput, enrollmentInput, contest);
        }
      } catch {}
    };

    poll();
    pollRef.current = setInterval(poll, 2000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [screen, contest]);

  const handleCodeSubmit = async () => {
    const code = codeInput.trim().toUpperCase();
    if (!code) return;
    setLoading(true);
    setError("");
    try {
      const data = await apiGetContestByCode(code);
      if (data.status === "ended") {
        setError("This contest has already ended.");
        return;
      }
      setContest(data);
      setScreen("enter-name");
    } catch (err: any) {
      setError(err.message || "Invalid contest code.");
    } finally {
      setLoading(false);
    }
  };

  const handleNameSubmit = async () => {
    const name = nameInput.trim();
    const enrollment = enrollmentInput.trim();
    if (!name || !enrollment || !contest) return;
    setLoading(true);
    setError("");
    try {
      await apiJoinContest(contest.contestCode, name, enrollment);
      if (contest.status === "active") {
        onContestJoined(contest._id, name, enrollment, contest);
      } else {
        setScreen("waiting"); // draft or paused — wait for admin to start
      }
    } catch (err: any) {
      setError(err.message || "Failed to join contest.");
    } finally {
      setLoading(false);
    }
  };

  const diffColor = (d: string) => {
    if (d === "Easy") return "diff-easy";
    if (d === "Medium") return "diff-medium";
    return "diff-hard";
  };

  return (
    <div className="ud-root">
      {/* Background grid */}
      <div className="ud-grid-bg" />

      {/* Glow orb */}
      <div className="ud-glow" />

      <div className="ud-center">
        {/* Logo */}
        <div className="ud-logo">
          <Zap size={22} className="ud-logo-icon" />
          <span className="ud-logo-text">BLINDCODE</span>
        </div>

        {/* ── Screen 1: Enter Code ── */}
        {screen === "enter-code" && (
          <div className="ud-card ud-card-enter">
            <div className="ud-card-eyebrow">PARTICIPANT ACCESS</div>
            <h1 className="ud-card-title">Enter Contest</h1>
            <p className="ud-card-sub">Type the code given by your instructor</p>

            <div className="ud-input-wrap">
              <input
                className={`ud-code-input ${error ? "ud-input-error" : ""}`}
                value={codeInput}
                onChange={e => { setCodeInput(e.target.value.toUpperCase()); setError(""); }}
                onKeyDown={e => e.key === "Enter" && handleCodeSubmit()}
                placeholder="e.g. BC8953"
                maxLength={10}
                autoFocus
                spellCheck={false}
              />
              {error && (
                <div className="ud-error">
                  <AlertCircle size={14} />
                  <span>{error}</span>
                </div>
              )}
            </div>

            <button
              className={`ud-btn ${loading || !codeInput.trim() ? "ud-btn-disabled" : ""}`}
              onClick={handleCodeSubmit}
              disabled={loading || !codeInput.trim()}
            >
              {loading
                ? <><Loader2 size={16} className="ud-spin" /> Checking...</>
                : <> Verify Code <ArrowRight size={16} /></>
              }
            </button>
          </div>
        )}

        {/* ── Screen 2: Enter Name ── */}
        {screen === "enter-name" && contest && (
          <div className="ud-card ud-card-name">
            <div className="ud-contest-badge">
              <span className="ud-contest-code-tag">{contest.contestCode}</span>
              <span className="ud-contest-name-tag">{contest.name}</span>
            </div>

            <div className="ud-contest-meta">
              <span className="ud-meta-chip">
                <Clock size={12} />
                {contest.duration} min
              </span>
              <span className="ud-meta-chip">
                <BookOpen size={12} />
                {contest.problemIds.length} problem{contest.problemIds.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="ud-problems-preview">
              {contest.problemIds.map((p, i) => (
                <div key={p._id} className="ud-problem-row">
                  <span className="ud-problem-num">{i + 1}</span>
                  <span className="ud-problem-title">{p.title}</span>
                  <span className={`ud-diff ${diffColor(p.difficulty)}`}>{p.difficulty}</span>
                </div>
              ))}
            </div>

            <div className="ud-divider" />

            <div className="ud-card-eyebrow">YOUR DETAILS</div>
            <div className="ud-input-wrap">
              <input
                className={`ud-name-input ${error ? "ud-input-error" : ""}`}
                value={nameInput}
                onChange={e => { setNameInput(e.target.value); setError(""); }}
                onKeyDown={e => e.key === "Enter" && enrollmentInput.trim() && handleNameSubmit()}
                placeholder="Enter your name..."
                autoFocus
              />
              <input
                className={`ud-name-input ${error ? "ud-input-error" : ""}`}
                value={enrollmentInput}
                onChange={e => { setEnrollmentInput(e.target.value); setError(""); }}
                onKeyDown={e => e.key === "Enter" && nameInput.trim() && handleNameSubmit()}
                placeholder="Enrollment number..."
                style={{ marginTop: 8 }}
              />
              {error && (
                <div className="ud-error">
                  <AlertCircle size={14} />
                  <span>{error}</span>
                </div>
              )}
            </div>

            <div className="ud-btn-row">
              <button className="ud-btn-ghost" onClick={() => { setScreen("enter-code"); setError(""); }}>
                ← Back
              </button>
              <button
                className={`ud-btn ${loading || !nameInput.trim() || !enrollmentInput.trim() ? "ud-btn-disabled" : ""}`}
                onClick={handleNameSubmit}
                disabled={loading || !nameInput.trim() || !enrollmentInput.trim()}
              >
                {loading
                  ? <><Loader2 size={16} className="ud-spin" /> Joining...</>
                  : <>Join Contest <ArrowRight size={16} /></>
                }
              </button>
            </div>
          </div>
        )}

        {/* ── Screen 3: Waiting Room ── */}
        {screen === "waiting" && contest && (
          <div className="ud-card ud-card-waiting">
            <div className="ud-waiting-icon">
              <Users size={32} className="ud-waiting-users" />
            </div>

            <h2 className="ud-waiting-title">You're In!</h2>
            <p className="ud-waiting-name">{nameInput}</p>

            <div className="ud-waiting-contest">
              <span className="ud-contest-code-tag">{contest.contestCode}</span>
              <span className="ud-waiting-cname">{contest.name}</span>
            </div>

            <div className="ud-waiting-status">
              <span className="ud-waiting-dot" />
              <span className="ud-waiting-label">
                Waiting for admin to start{".".repeat(dots)}
              </span>
            </div>

            <p className="ud-waiting-hint">
              The contest will begin automatically when your instructor starts it.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}