// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::env;
use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};
use tokio::process::Command;
use tokio::time::{timeout, Duration};
use tokio::io::AsyncWriteExt; // NAYA: Stdin mein write karne ke liye zaroori hai

#[derive(serde::Serialize)]
pub struct ExecutionResult {
    output: String,
    error: Option<String>,
    #[serde(rename = "hasError")]
    has_error: bool,
}

#[tauri::command]
// NAYA: 'input: String' parameter add kiya gaya hai
async fn execute_code(code: String, language: String, input: String) -> ExecutionResult {
    let timestamp = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis();
    let mut temp_dir = env::temp_dir();
    temp_dir.push(format!("black_flash_{}", timestamp));
    
    if let Err(e) = fs::create_dir_all(&temp_dir) {
        return ExecutionResult {
            output: "".to_string(),
            error: Some(format!("Failed to create temp directory: {}", e)),
            has_error: true,
        };
    }

    // NAYA: 'input' ko aage pass kar rahe hain
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

    let compile_output = Command::new("g++")
        .arg(source_path.to_str().unwrap())
        .arg("-o")
        .arg(exe_path.to_str().unwrap())
        .output()
        .await;

    match compile_output {
        Ok(output) if !output.status.success() => {
            let stderr = String::from_utf8_lossy(&output.stderr).to_string();
            return ExecutionResult { output: stderr.clone(), error: Some(stderr), has_error: true };
        }
        Err(_) => return ExecutionResult { output: "".to_string(), error: Some("Failed to run g++. Is it in your PATH?".into()), has_error: true },
        _ => {} 
    }

    run_with_timeout(Command::new(exe_path.to_str().unwrap()), 30, input).await
}

// --- Python Execution ---
async fn run_python(dir: &PathBuf, code: &str, input: &str) -> ExecutionResult {
    let source_path = dir.join("main.py");
    if let Err(_) = fs::write(&source_path, code) {
        return ExecutionResult { output: "".to_string(), error: Some("Failed to write main.py".into()), has_error: true };
    }

    let mut cmd = Command::new("python");
    cmd.arg(source_path.to_str().unwrap());
    run_with_timeout(cmd, 30, input).await
}

// --- JavaScript Execution ---
async fn run_javascript(dir: &PathBuf, code: &str, input: &str) -> ExecutionResult {
    let source_path = dir.join("main.js");
    if let Err(_) = fs::write(&source_path, code) {
        return ExecutionResult { output: "".to_string(), error: Some("Failed to write main.js".into()), has_error: true };
    }

    let mut cmd = Command::new("node");
    cmd.arg(source_path.to_str().unwrap());
    run_with_timeout(cmd, 30, input).await
}

// --- The 30 Second Timeout Magic Logic ---
async fn run_with_timeout(mut cmd: Command, timeout_secs: u64, input: &str) -> ExecutionResult {
    cmd.kill_on_drop(true);

    // NAYA: Stdin ko piped setup karna taaki hum usme write kar sakein
    cmd.stdin(std::process::Stdio::piped());
    cmd.stdout(std::process::Stdio::piped());
    cmd.stderr(std::process::Stdio::piped());

    let mut child = match cmd.spawn() {
        Ok(child) => child,
        Err(e) => return ExecutionResult { output: "".into(), error: Some(format!("Failed to start process: {}", e)), has_error: true },
    };

    // NAYA: Child process ke stdin mein input write karna aur handle drop karna
    if let Some(mut stdin) = child.stdin.take() {
        let _ = stdin.write_all(input.as_bytes()).await;
        // stdin variable yahan scope ke bahar jayega aur drop ho jayega, 
        // jisse child process ko EOF (End of File) mil jayega.
    }

    match timeout(Duration::from_secs(timeout_secs), child.wait_with_output()).await {
        Ok(Ok(output)) => {
            let stdout = String::from_utf8_lossy(&output.stdout).to_string();
            let stderr = String::from_utf8_lossy(&output.stderr).to_string();
            
            if !output.status.success() || !stderr.is_empty() {
                ExecutionResult { output: stderr.clone(), error: Some(stderr), has_error: true }
            } else {
                ExecutionResult { output: stdout, error: None, has_error: false }
            }
        }
        Ok(Err(e)) => {
            ExecutionResult { output: "".into(), error: Some(format!("Execution failed: {}", e)), has_error: true }
        }
        Err(_) => {
            ExecutionResult { 
                output: "TIME LIMIT EXCEEDED (30s)".into(), 
                error: Some("Execution took longer than 30 seconds and was terminated.".into()), 
                has_error: true 
            }
        }
    }
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![execute_code]) 
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}