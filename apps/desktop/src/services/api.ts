
const ENV = import.meta.env.VITE_TAURI_ENV;
const API_URL = ENV === "CLOUD" ? import.meta.env.VITE_TAURI_BACKEND_URL_CLOUD : import.meta.env.VITE_TAURI_BACKEND_URL_LOCAL;

const CODE_EXEC_URL = import.meta.env.VITE_TAURI_CODE_EXEC_URL;

export interface CompilerResponse {
    output: string;
    hasError: boolean;
    error?: string;
}

/**
 * Compile and execute code via external Piston API.
 */
export async function compileCode(code: string, language: string, input: string = ""): Promise<CompilerResponse> {
    if (!code.trim()) {
        return { output: "(No code to execute)", hasError: false };
    }

    if (!language) {
        return { output: "", hasError: true, error: "Language is required" };
    }

    const versionMap: Record<string, string> = {
        "c++": "10.2.0",
        "cpp": "10.2.0",
        "python": "3.12.0",
        "java": "15.0.2"
    };

    const pistonLang = language === "cpp" ? "c++" : language;
    const version = versionMap[pistonLang] || "1.0.0";

    try {
        const response = await fetch(CODE_EXEC_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                language: pistonLang,
                version: version,
                files: [
                    { content: code }
                ],
                stdin: input
            })
        });

        if (!response.ok) {
            throw new Error(`API returned ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();

        if (result.compile && result.compile.code !== 0) {
            return {
                output: result.compile.stderr || result.compile.output || "",
                hasError: true,
                error: result.compile.stderr || result.compile.output
            };
        }

        if (result.run && result.run.code !== 0) {
            return {
                output: result.run.stderr || result.run.output || "",
                hasError: true,
                error: result.run.stderr || result.run.output
            };
        }

        let out = result.run ? result.run.output : "";
        if (!out) {
            out = "(No output)";
        }

        return {
            output: out,
            hasError: false
        };
    } catch (error) {
        console.error(`Compilation failed at ${CODE_EXEC_URL}:`, error);
        return {
            output: "",
            hasError: true,
            error: error instanceof Error ? `${error.message} (${CODE_EXEC_URL})` : `Failed to fetch from ${CODE_EXEC_URL}`,
        };
    }
}

export const apiGetLeaderboard = async (contestCode: string) => {
    const url = `${API_URL}/api/contests/${contestCode}/leaderboard`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch leaderboard from ${url}`);
        }
        const data = await response.json();
        return data; // Returns array of participants sorted by score
    } catch (error) {
        console.error("Leaderboard fetch error:", error);
        throw error; // Let the caller handle and log it to addLog
    }
};