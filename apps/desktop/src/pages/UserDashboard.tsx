import { useState, useEffect, useRef } from "react";
import { Zap, ArrowRight, Loader2, AlertCircle, Users } from "lucide-react";
import { apiGetContestByCode, apiJoinContest, apiGetContestStatus } from "../services/desktopApi";
import "./UserDashboard.css";

interface ContestInfo {
  _id: string;
  contestCode: string;
  name: string;
  duration: number;
  status: "draft" | "running" | "paused" | "ended";
  startedAt?: string;
  problemIds: { _id: string; title: string; difficulty: string }[];
}

interface UserDashboardProps {
  onContestJoined: (contestId: string, playerName: string, password: string, contestInfo: ContestInfo, participantId: string) => void;
}

type Screen = "login" | "enter-code" | "waiting";

export default function UserDashboard({ onContestJoined }: UserDashboardProps) {
  const [screen, setScreen] = useState<Screen>("login");
  const [teamName, setTeamName] = useState("");
  const [password, setPassword] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [participantId, setParticipantId] = useState("");
  
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
        if (data.status === "running") {
          if (pollRef.current) clearInterval(pollRef.current);
          onContestJoined(contest._id, teamName, password, contest, participantId);
        }
      } catch {}
    };

    poll();
    pollRef.current = setInterval(poll, 2000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [screen, contest]);

  const handleLoginSubmit = () => {
    if (!teamName.trim() || !password.trim()) return;
    setScreen("enter-code");
    setError("");
  };

  const handleCodeSubmit = async () => {
    const code = codeInput.trim().toUpperCase();
    if (!code || !teamName || !password) return;
    setLoading(true);
    setError("");
    try {
      const data = await apiGetContestByCode(code);
      if (data.status === "ended") {
        setError("This contest has already ended.");
        return;
      }
      setContest(data);
      
      // Attempt to join the contest with team credentials
      const joinData = await apiJoinContest(code, teamName, password);
      const joinedParticipantId = joinData.participantId;
      setParticipantId(joinedParticipantId);
      
      if (data.status === "running") {
        onContestJoined(data._id, teamName, password, data, joinedParticipantId);
      } else {
        setScreen("waiting"); // draft or paused — wait for admin to start
      }
    } catch (err: any) {
      setError(err.message || "Invalid contest code or credentials.");
    } finally {
      setLoading(false);
    }
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

        {/* ── Screen 1: Login ── */}
        {screen === "login" && (
          <div className="ud-card ud-card-name">
            <div className="ud-card-eyebrow">TEAM AUTHENTICATION</div>
            <h1 className="ud-card-title">Login</h1>
            <p className="ud-card-sub">Enter your team credentials to proceed</p>

            <div className="ud-input-wrap">
              <input
                className={`ud-name-input ${error ? "ud-input-error" : ""}`}
                value={teamName}
                onChange={e => { setTeamName(e.target.value); setError(""); }}
                onKeyDown={e => e.key === "Enter" && password.trim() && handleLoginSubmit()}
                placeholder="Team Name"
                autoFocus
              />
              <input
                type="password"
                className={`ud-name-input ${error ? "ud-input-error" : ""}`}
                value={password}
                onChange={e => { setPassword(e.target.value); setError(""); }}
                onKeyDown={e => e.key === "Enter" && teamName.trim() && handleLoginSubmit()}
                placeholder="Password"
                style={{ marginTop: 8 }}
              />
              {error && (
                <div className="ud-error">
                  <AlertCircle size={14} />
                  <span>{error}</span>
                </div>
              )}
            </div>

            <button
              className={`ud-btn ${!teamName.trim() || !password.trim() ? "ud-btn-disabled" : ""}`}
              onClick={handleLoginSubmit}
              disabled={!teamName.trim() || !password.trim()}
            >
              Next <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* ── Screen 2: Enter Code ── */}
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

            <div className="ud-btn-row">
              <button className="ud-btn-ghost" onClick={() => { setScreen("login"); setError(""); }}>
                ← Back
              </button>
              <button
                className={`ud-btn ${loading || !codeInput.trim() ? "ud-btn-disabled" : ""}`}
                onClick={handleCodeSubmit}
                disabled={loading || !codeInput.trim()}
              >
                {loading
                  ? <><Loader2 size={16} className="ud-spin" /> Joining...</>
                  : <> Verify Code <ArrowRight size={16} /></>
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
            <p className="ud-waiting-name">{teamName}</p>

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