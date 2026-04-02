import { invoke } from "@tauri-apps/api/tauri";

export interface CompilerResponse {
    output: string;
    hasError: boolean;
    error?: string;
}

/**
 * Compile and execute code locally via Tauri native commands.
 * This runs g++, python, or node directly on the user's system.
 */
// NAYA: 'input' parameter add kiya (default value empty string)
export async function compileCode(code: string, language: string, input: string = ""): Promise<CompilerResponse> {
    if (!code.trim()) {
        return { output: "(No code to execute)", hasError: false };
    }

    if (!language) {
        return { output: "", hasError: true, error: "Language is required" };
    }

    try {
        const result = await invoke<CompilerResponse>("execute_code", {
            code: code,
            language: language,
            input: input, // NAYA: Rust backend ko input pass kar rahe hain
        });

        if (!result.output && !result.hasError) {
            result.output = "(No output)";
        }

        return result;
    } catch (error) {
        console.error("Tauri compilation invocation failed:", error);

        if (!window.__TAURI__) {
            return {
                output: "",
                hasError: true,
                error: "Tauri context not found. Please run the app using 'pnpm tauri dev' and use the app window, not Chrome.",
            };
        }

        return {
            output: "",
            hasError: true,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

export const apiGetLeaderboard = async (contestCode: string) => {
    try {
        const response = await fetch(`${API_URL}/api/contests/${contestCode}/leaderboard`);
        if (!response.ok) {
            throw new Error("Failed to fetch leaderboard");
        }
        const data = await response.json();
        return data; // Returns array of participants sorted by score
    } catch (error) {
        console.error("Leaderboard fetch error:", error);
        return [];
    }
};