# Blind Code — Current Status & Roadmap

## ✅ What Works Right Now

| Feature | Status |
|---|---|
| **Registration Screen** | Name + Roll Number entry, starts the game |
| **Blind Editor** | Code is blurred behind frosted glass, only caret visible |
| **Dynamic Blur** | Blur intensity scales with level (2px → 15px) |
| **Vision Protocol** | Reveals code for 5s, costs +30s penalty |
| **Partial Vision** | Right-click selected text to reveal it (+10s penalty) |
| **Sabotage System** | Random syntax char injected after Vision expires |
| **Tab-Switch Detection** | +30s penalty on `visibilitychange` |
| **Copy/Paste Prevention** | Both disabled in editor |
| **Fullscreen Mode** | Forced on game start, toggle button available |
| **Language Selector** | C++, Python, JavaScript |
| **5 Levels** | Hello World → Sum → Countdown → Factorial → FizzBuzz |
| **Scoring** | Base score per difficulty + time bonus − peek penalty |
| **Level Progression** | Auto-advance on correct output |
| **Terminal Output** | Color-coded logs with auto-scroll |
| **VS Code-Style Sidebar** | Decorative icon sidebar |
| **Code Execution** | Currently hitting **Piston API** (free, remote) |
| **Tauri Desktop Build** | `pnpm tauri dev` runs clean ✅ |

---

## 🔧 Changes Still Needed

### High Priority
- [ ] **Compiler Strategy** — Replace Piston API with a proper solution (see below)

- [ ] **Timer Enforcement** — Currently the timer only tracks time; no auto-fail on time limit exceeded

### Medium Priority
- [ ] **More Challenges** — Only 5 levels exist, need a bigger question bank
- [ ] **Leaderboards** — Score tracking across sessions (needs backend/local storage)
- [ ] **Sound Effects** — Audio feedback for sabotage, level complete, etc.
- [ ] **Better Blur Effects** — Water droplet CSS classes (`water-droplet-*`) exist in JSX but have no CSS definitions yet

### Low Priority / Polish
- [ ] **Sidebar Functionality** — Currently decorative only
- [ ] **Settings Panel** — Allow customizing blur intensity, penalty values, etc.
- [ ] **Keyboard Shortcuts** — `Ctrl+Enter` to run, etc.
- [ ] **Dark/Light Theme** — Currently dark only

---

## 🔑 Compiler Strategy (Final Decision Needed)

This is the big remaining decision. Currently code runs via the **Piston API** (free remote service). Two paths forward:

### Option A: Online Compiler API
- **Current**: Piston API (`emkc.org`) — free, no auth, supports C++/Python/JS
- **Alternatives**: Judge0, Codex API, Sphere Engine
- **Pros**: No local setup needed, works everywhere
- **Cons**: Requires internet, rate limits, latency, service could go down

### Option B: System Pre-installed Compiler
- Use Tauri's Rust backend to spawn local compiler processes (`g++`, `python`, `node`)
- **Pros**: Offline, fast, no rate limits, more languages possible
- **Cons**: Requires compilers to be pre-installed on user's machine, security concerns with arbitrary code execution

### Recommended Hybrid Approach
1. Try local compiler first (if available on system)
2. Fall back to Piston API if local compiler not found
3. All compiler logic lives in `src/services/api.ts` — **only this one file needs to change**

---

> **Bottom line**: The frontend is fully functional. The only real blocker is deciding and implementing the compiler strategy.
