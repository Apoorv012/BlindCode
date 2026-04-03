// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::env;
use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};
use tokio::process::Command;
use tokio::time::{timeout, Duration};
use tokio::io::AsyncWriteExt;

// ✨ Import Windows-specific extension for hiding console windows
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[derive(serde::Serialize)]
pub struct ExecutionResult {
    output: String,
    error: Option<String>,
    #[serde(rename = "hasError")]
    has_error: bool,
}

// Windows constant to prevent console window flashing
const CREATE_NO_WINDOW: u32 = 0x08000000;

#[tauri::command]
async fn execute_code(code: String, language: String, input: String) -> ExecutionResult {
    let timestamp = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis();
    let mut temp_dir = env::temp_dir();
    temp_dir.push(format!("blind_code_{}", timestamp));
    
    if let Err(e) = fs::create_dir_all(&temp_dir) {
        return ExecutionResult {
            output: "".to_string(),
            error: Some(format!("Failed to create temp directory: {}", e)),
            has_error: true,
        };
    }

    let result = match language.as_str() {
        "cpp" => run_cpp(&temp_dir, &code, &input).await,
        "python" => run_python(&temp_dir, &code, &input).await,
        "javascript" => run_javascript(&temp_dir, &code, &input).await,
        _ => ExecutionResult {
            output: "".to_string(),
            error: Some("Unsupported language".to_string()),
            has_error: true,
        }
    };

    let _ = fs::remove_dir_all(&temp_dir);
    result
}

// --- C++ Execution ---
async fn run_cpp(dir: &PathBuf, code: &str, input: &str) -> ExecutionResult {
    let source_path = dir.join("main.cpp");
    let exe_path = dir.join("main.exe"); 

    if let Err(_) = fs::write(&source_path, code) {
        return ExecutionResult { output: "".to_string(), error: Some("Failed to write main.cpp".into()), has_error: true };
    }

    // Compile with NO WINDOW flag
    let mut compile = Command::new("g++");
    compile
        .arg(source_path.to_str().unwrap())
        .arg("-o")
        .arg(exe_path.to_str().unwrap());
    
    #[cfg(target_os = "windows")]
    compile.creation_flags(CREATE_NO_WINDOW);

    let compile_output = timeout(Duration::from_secs(5), compile.output()).await;

    match compile_output {
        Ok(Ok(output)) if !output.status.success() => {
            let stderr = String::from_utf8_lossy(&output.stderr).to_string();
            return ExecutionResult { output: stderr.clone(), error: Some(stderr), has_error: true };
        }
        Ok(Err(_)) => return ExecutionResult { output: "".to_string(), error: Some("Failed to run g++".into()), has_error: true },
        Err(_) => return ExecutionResult { output: "".to_string(), error: Some("Compilation timed out".into()), has_error: true },
        _ => {}
    }

    let mut run_cmd = Command::new(exe_path.to_str().unwrap());
    #[cfg(target_os = "windows")]
    run_cmd.creation_flags(CREATE_NO_WINDOW);

    run_with_limits(run_cmd, 5, 256, input).await
}

// --- Python Execution ---
async fn run_python(dir: &PathBuf, code: &str, input: &str) -> ExecutionResult {
    let source_path = dir.join("main.py");
    if let Err(_) = fs::write(&source_path, code) {
        return ExecutionResult { output: "".to_string(), error: Some("Failed to write main.py".into()), has_error: true };
    }

    let mut cmd = Command::new("python");
    cmd.arg(source_path.to_str().unwrap());
    
    #[cfg(target_os = "windows")]
    cmd.creation_flags(CREATE_NO_WINDOW);

    run_with_limits(cmd, 5, 256, input).await
}

// --- JavaScript Execution ---
async fn run_javascript(dir: &PathBuf, code: &str, input: &str) -> ExecutionResult {
    let source_path = dir.join("main.js");
    if let Err(_) = fs::write(&source_path, code) {
        return ExecutionResult { output: "".to_string(), error: Some("Failed to write main.js".into()), has_error: true };
    }

    let mut cmd = Command::new("node");
    cmd.arg(source_path.to_str().unwrap());

    #[cfg(target_os = "windows")]
    cmd.creation_flags(CREATE_NO_WINDOW);

    run_with_limits(cmd, 5, 256, input).await
}

// --- Execution with limits ---
async fn run_with_limits(mut cmd: Command, timeout_secs: u64, memory_limit_mb: u64, input: &str) -> ExecutionResult {
    cmd.kill_on_drop(true);
    cmd.stdin(std::process::Stdio::piped());
    cmd.stdout(std::process::Stdio::piped());
    cmd.stderr(std::process::Stdio::piped());

    let mut child = match cmd.spawn() {
        Ok(child) => child,
        Err(e) => return ExecutionResult {
            output: "".into(),
            error: Some(format!("Failed to start process: {}", e)),
            has_error: true,
        },
    };

    if let Some(mut stdin) = child.stdin.take() {
        let _ = stdin.write_all(format!("{}\n", input).as_bytes()).await;
    }

    let pid = child.id().unwrap_or(0);
    let memory_limit_bytes = memory_limit_mb * 1024 * 1024;
    let mem_exceeded = std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false));
    let mem_exceeded_clone = mem_exceeded.clone();

    // Background Memory Monitor
    tokio::spawn(async move {
        loop {
            tokio::time::sleep(Duration::from_millis(200)).await;

            let mut wmic = Command::new("wmic");
            wmic.args(&["process", "where", &format!("ProcessId={}", pid), "get", "WorkingSetSize"]);
            
            #[cfg(target_os = "windows")]
            wmic.creation_flags(CREATE_NO_WINDOW);

            let wmic_out = wmic.output().await;

            let usage: u64 = wmic_out.ok()
                .and_then(|o| {
                    let s = String::from_utf8_lossy(&o.stdout).to_string();
                    s.lines().filter_map(|l| l.trim().parse::<u64>().ok()).next()
                })
                .unwrap_or(0);

            if usage > memory_limit_bytes {
                mem_exceeded_clone.store(true, std::sync::atomic::Ordering::Relaxed);
                let mut kill = Command::new("taskkill");
                kill.args(&["/F", "/T", "/PID", &pid.to_string()]);
                
                #[cfg(target_os = "windows")]
                kill.creation_flags(CREATE_NO_WINDOW);
                
                let _ = kill.output().await;
                break;
            }
        }
    });

    match timeout(Duration::from_secs(timeout_secs), child.wait_with_output()).await {
        Ok(Ok(output)) => {
            if mem_exceeded.load(std::sync::atomic::Ordering::Relaxed) {
                return ExecutionResult {
                    output: format!("MEMORY LIMIT EXCEEDED ({}MB)", memory_limit_mb),
                    error: Some("Memory limit exceeded".into()),
                    has_error: true,
                };
            }

            let stdout = String::from_utf8_lossy(&output.stdout).to_string();
            let stderr = String::from_utf8_lossy(&output.stderr).to_string();

            if !output.status.success() || !stderr.is_empty() {
                ExecutionResult { output: stderr.clone(), error: Some(stderr), has_error: true }
            } else {
                ExecutionResult { output: stdout, error: None, has_error: false }
            }
        }
        Ok(Err(e)) => ExecutionResult { output: "".into(), error: Some(format!("Execution failed: {}", e)), has_error: true },
        Err(_) => ExecutionResult {
            output: format!("TIME LIMIT EXCEEDED ({}s)", timeout_secs),
            error: Some("Time limit exceeded".into()),
            has_error: true,
        },
    }
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![execute_code])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}