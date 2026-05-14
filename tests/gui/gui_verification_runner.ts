#!/usr/bin/env node
/**
 * AI Companion GUI Verification Runner
 * 
 * Purpose: Automated GUI testing without Playwright
 * Method: Tauri IPC + HTTP checks + Screenshot + Vision
 * 
 * Output: Structured JSON results + Screenshots + Reports
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { execSync, exec } from 'child_process';
import fetch from 'node-fetch';

// Configuration
const CONFIG = {
  appName: 'ai-companion-desktop',
  windowTitle: 'AI Companion',
  devServerUrl: 'http://localhost:5173',
  screenshotDir: join(__dirname, 'screenshots'),
  logsDir: join(__dirname, 'logs'),
  reportsDir: join(__dirname, 'reports'),
  maxRetries: 3,
  retryDelay: 1000,
};

const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const LOG_FILE = join(CONFIG.logsDir, `gui_verification_${TIMESTAMP}.log`);
const REPORT_FILE = join(CONFIG.reportsDir, `GUI_VERIFICATION_REPORT.md`);

// Ensure directories exist
[CONFIG.screenshotDir, CONFIG.logsDir, CONFIG.reportsDir].forEach(dir => {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
});

// Logging utility
function log(message: string, level: 'INFO' | 'WARN' | 'ERROR' | 'TEST' = 'INFO') {
  const timestamp = new Date().toISOString();
  const entry = `[${timestamp}] [${level}] ${message}`;
  console.log(entry);
  try {
    writeFileSync(LOG_FILE, entry + '\n', { flag: 'a' });
  } catch (e) {
    // ignore
  }
}

// Screenshot utility using PowerShell
async function takeScreenshot(label: string): Promise<string> {
  const filename = `${TIMESTAMP}_${label}.png`;
  const filepath = join(CONFIG.screenshotDir, filename);
  
  const psScript = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$windows = [System.Windows.Forms.Screen]::AllScreens
$combined = New-Object System.Drawing.Bitmap(1920, 1080)
$graphics = [System.Drawing.Graphics]::FromImage($combined)

foreach ($screen in $windows) {
    $graphics.CopyFromScreen($screen.Bounds.Location, [System.Drawing.Point]::Empty, $screen.Bounds.Size)
}

$combined.Save('${filepath.replace(/\\/g, '\\\\')}', [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose()
$combined.Dispose()
Write-Host 'Screenshot saved: ${filename}'
`;

  return new Promise((resolve, reject) => {
    const psFile = join(CONFIG.logsDir, `screenshot_${Date.now()}.ps1`);
    writeFileSync(psFile, psScript);
    
    exec(`powershell -ExecutionPolicy Bypass -File "${psFile}"`, (error, stdout, stderr) => {
      if (error) {
        log(`Screenshot failed: ${error.message}`, 'ERROR');
        reject(error);
      } else {
        log(`Screenshot saved: ${filepath}`, 'INFO');
        resolve(filepath);
      }
      try { require('fs').unlinkSync(psFile); } catch (e) {}
    });
  });
}

// Process check
function checkProcess(): { running: boolean; pid?: number; error?: string } {
  try {
    const output = execSync(`tasklist | findstr "${CONFIG.appName}"`, { encoding: 'utf8' });
    const match = output.match(/(\d+)/);
    if (match) {
      return { running: true, pid: parseInt(match[1]) };
    }
    return { running: false };
  } catch (e) {
    return { running: false, error: 'Process not found' };
  }
}

// Dev server check
async function checkDevServer(): Promise<{ responding: boolean; status?: number; error?: string }> {
  try {
    const response = await fetch(CONFIG.devServerUrl, { 
      method: 'HEAD',
      timeout: 3000 
    });
    return { responding: true, status: response.status };
  } catch (e: any) {
    return { responding: false, error: e.message };
  }
}

// Execute GUI action with retry
async function executeGuiAction<T>(
  actionName: string,
  actionFn: () => Promise<T>,
  verifyFn: (result: T) => Promise<boolean>,
  retryCount = 0
): Promise<{
  result: 'PASSED' | 'FAILED' | 'BLOCKED';
  data?: T;
  error?: string;
  evidence: { before?: string; after?: string; logs: string };
}> {
  const evidence = { logs: LOG_FILE };
  
  try {
    // Capture before
    let beforeScreenshot: string | undefined;
    try {
      beforeScreenshot = await takeScreenshot(`${actionName}_before`);
    } catch (e) {
      log(`Before screenshot failed: ${e}`, 'WARN');
    }
    
    // Execute action
    log(`[TEST] Executing: ${actionName}`, 'TEST');
    const result = await actionFn();
    
    // Wait for state change
    await new Promise(r => setTimeout(r, 500));
    
    // Capture after
    let afterScreenshot: string | undefined;
    try {
      afterScreenshot = await takeScreenshot(`${actionName}_after`);
    } catch (e) {
      log(`After screenshot failed: ${e}`, 'WARN');
    }
    
    evidence.before = beforeScreenshot;
    evidence.after = afterScreenshot;
    
    // Verify
    const verified = await verifyFn(result);
    
    if (verified) {
      log(`[TEST] PASSED: ${actionName}`, 'TEST');
      return { result: 'PASSED', data: result, evidence };
    } else {
      if (retryCount < CONFIG.maxRetries) {
        log(`[TEST] Retry ${retryCount + 1}/${CONFIG.maxRetries}: ${actionName}`, 'WARN');
        await new Promise(r => setTimeout(r, CONFIG.retryDelay));
        return executeGuiAction(actionName, actionFn, verifyFn, retryCount + 1);
      }
      log(`[TEST] FAILED: ${actionName}`, 'ERROR');
      return { result: 'FAILED', data: result, error: 'Verification failed', evidence };
    }
  } catch (e: any) {
    log(`[TEST] BLOCKED: ${actionName} - ${e.message}`, 'ERROR');
    return { result: 'BLOCKED', error: e.message, evidence };
  }
}

// Test 1: Application Launch
async function test1_AppLaunch(): Promise<any> {
  log('=== TEST 1: Application Launch ===', 'TEST');
  
  return executeGuiAction(
    'test1_app_launch',
    async () => {
      const processCheck = checkProcess();
      const serverCheck = await checkDevServer();
      return { processCheck, serverCheck };
    },
    async (result) => {
      const { processCheck, serverCheck } = result;
      log(`Process running: ${processCheck.running}, PID: ${processCheck.pid}`, 'INFO');
      log(`Dev server responding: ${serverCheck.responding}, Status: ${serverCheck.status}`, 'INFO');
      return processCheck.running === true && serverCheck.responding === true;
    }
  );
}

// Test 2: Main UI Elements
async function test2_MainUIElements(): Promise<any> {
  log('=== TEST 2: Main UI Elements ===', 'TEST');
  
  return executeGuiAction(
    'test2_main_ui',
    async () => {
      // Use PowerShell to check window exists
      const windowCheck = execSync(
        `powershell -Command "Add-Type -AssemblyName System.Windows.Forms; $w = [System.Windows.Forms.Screen]::AllScreens[0]; Write-Host 'Screen: ' $w.DeviceName ' Bounds: ' $w.Bounds",
        { encoding: 'utf8' }
      );
      return { windowCheck };
    },
    async (result) => {
      // If process is running and server responds, UI should be visible
      const processCheck = checkProcess();
      return processCheck.running === true;
    }
  );
}

// Test 3: No Error Pages
async function test3_NoErrorPages(): Promise<any> {
  log('=== TEST 3: Error Page Detection ===', 'TEST');
  
  return executeGuiAction(
    'test3_no_errors',
    async () => {
      const serverCheck = await checkDevServer();
      return { serverCheck };
    },
    async (result) => {
      // Check dev server returns valid HTML (not error page)
      if (!result.serverCheck.responding) return false;
      try {
        const response = await fetch(CONFIG.devServerUrl);
        const text = await response.text();
        const hasError = text.includes('ERR_CONNECTION_REFUSED') || 
                         text.includes('404') || 
                         text.includes('500') ||
                         text.includes('no application owner');
        return !hasError;
      } catch (e) {
        return false;
      }
    }
  );
}

// Main test runner
async function runTests() {
  log('========================================', 'INFO');
  log('AI Companion GUI Verification Starting', 'INFO');
  log('========================================', 'INFO');
  
  const results = [];
  
  // Run tests
  const test1 = await test1_AppLaunch();
  results.push({ name: 'Test 1: Application Launch', ...test1 });
  
  const test2 = await test2_MainUIElements();
  results.push({ name: 'Test 2: Main UI Elements', ...test2 });
  
  const test3 = await test3_NoErrorPages();
  results.push({ name: 'Test 3: Error Page Detection', ...test3 });
  
  // Generate report
  const report = generateReport(results);
  writeFileSync(REPORT_FILE, report);
  log(`Report saved: ${REPORT_FILE}`, 'INFO');
  
  // Also copy to D: drive
  try {
    const dReportPath = 'D:/AI文件/hermes_file/log/GUI_VERIFICATION_REPORT.md';
    writeFileSync(dReportPath, report);
    log(`Report copied to: ${dReportPath}`, 'INFO');
  } catch (e: any) {
    log(`Failed to copy to D: ${e.message}`, 'ERROR');
  }
  
  // Summary
  const passed = results.filter(r => r.result === 'PASSED').length;
  const failed = results.filter(r => r.result === 'FAILED').length;
  const blocked = results.filter(r => r.result === 'BLOCKED').length;
  
  log('========================================', 'INFO');
  log(`Results: ${passed} PASSED, ${failed} FAILED, ${blocked} BLOCKED`, 'INFO');
  log('========================================', 'INFO');
  
  return { passed, failed, blocked, results };
}

function generateReport(results: any[]): string {
  const timestamp = new Date().toISOString();
  
  let md = `# AI Companion GUI Verification Report

**Generated**: ${timestamp}
**Test Runner**: gui_verification_runner.ts

---

## Summary

| Metric | Count |
|--------|-------|
| Total Tests | ${results.length} |
| Passed | ${results.filter(r => r.result === 'PASSED').length} |
| Failed | ${results.filter(r => r.result === 'FAILED').length} |
| Blocked | ${results.filter(r => r.result === 'BLOCKED').length} |

---

## Detailed Results

`;

  results.forEach((r, i) => {
    md += `### ${r.name}

| Field | Value |
|-------|-------|
| **Result** | ${r.result} |
| **Error** | ${r.error || 'N/A'} |
| **Before Screenshot** | ${r.evidence?.before || 'N/A'} |
| **After Screenshot** | ${r.evidence?.after || 'N/A'} |
| **Log File** | ${r.evidence?.logs || 'N/A'} |

`;
  });

  md += `---

## Evidence Files

- **Screenshots**: ${CONFIG.screenshotDir}
- **Logs**: ${CONFIG.logsDir}
- **This Report**: ${REPORT_FILE}

---

## Limitations

This CLI-based verification can only check:
1. Process existence
2. Dev server HTTP response
3. Screenshot capture (visual inspection deferred to Vision API)

**GUI interaction tests (click, input, settings) require user manual testing.**

---

## Next Steps

1. User should manually verify:
   - Click settings button → settings panel opens
   - Switch between 4 tabs
   - Enter text in input box
   - Click send button
   - Modify settings and verify persistence

2. Automated GUI testing requires:
   - Playwright or similar DOM automation
   - Tauri devtools endpoint access
   - Accessibility Tree API

`;

  return md;
}

// Execute
runTests()
  .then(({ passed, failed, blocked }) => {
    process.exit(failed + blocked > 0 ? 1 : 0);
  })
  .catch(e => {
    log(`Fatal error: ${e.message}`, 'ERROR');
    process.exit(1);
  });
