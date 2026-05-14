/**
 * AI Companion GUI Verification Runner
 * 
 * Purpose: Automated GUI testing for AI Companion
 * Method: CLI-based verification (Process, HTTP, FileSystem, Screenshot)
 * 
 * Output: Structured results + Screenshots + Reports
 */

const { existsSync, mkdirSync, writeFileSync, readFileSync, statSync } = require('fs');
const { join, dirname } = require('path');
const { execSync, exec } = require('child_process');
const http = require('http');

const CONFIG = {
  appName: 'ai-companion-desktop',
  devServerUrl: 'http://localhost:5173',
  projectRoot: 'C:/Users/asus/ai-companion',
  screenshotDir: '',
  logsDir: '',
  reportsDir: '',
  maxRetries: 3,
  retryDelay: 1000,
};

CONFIG.screenshotDir = join(__dirname, 'screenshots');
CONFIG.logsDir = join(__dirname, 'logs');
CONFIG.reportsDir = join(__dirname, 'reports');

const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const LOG_FILE = join(CONFIG.logsDir, 'gui_verification_' + TIMESTAMP + '.log');
const REPORT_FILE = join(CONFIG.reportsDir, 'GUI_VERIFICATION_REPORT.md');
const EVIDENCE_DIR = join(CONFIG.logsDir, 'evidence_' + TIMESTAMP);
mkdirSync(EVIDENCE_DIR, { recursive: true });

// Logging
function log(msg, level) {
  if (!level) level = 'INFO';
  const entry = '[' + new Date().toISOString() + '] [' + level + '] ' + msg;
  console.log(entry);
  try { writeFileSync(LOG_FILE, entry + '\n', { flag: 'a' }); } catch (e) {}
}

// Screenshot
async function takeScreenshot(label) {
  const filename = TIMESTAMP + '_' + label + '.png';
  const filepath = join(EVIDENCE_DIR, filename);
  const psScript = [
    'Add-Type -AssemblyName System.Windows.Forms',
    'Add-Type -AssemblyName System.Drawing',
    '$w = [System.Windows.Forms.Screen]::AllScreens[0].Bounds.Width',
    '$h = [System.Windows.Forms.Screen]::AllScreens[0].Bounds.Height',
    '$bmp = New-Object System.Drawing.Bitmap($w, $h)',
    '$g = [System.Drawing.Graphics]::FromImage($bmp)',
    '$g.CopyFromScreen([System.Windows.Forms.Screen]::AllScreens[0].Bounds.Location, [System.Drawing.Point]::Empty, [System.Drawing.Size]::new($w, $h))',
    '$bmp.Save(\'' + filepath.replace(/\\/g, '\\\\') + '\', [System.Drawing.Imaging.ImageFormat]::Png)',
    '$g.Dispose(); $bmp.Dispose()'
  ].join('; ');
  
  return new Promise((resolve, reject) => {
    const psFile = join(CONFIG.logsDir, 'ss_' + Date.now() + '.ps1');
    writeFileSync(psFile, psScript);
    exec('powershell -ExecutionPolicy Bypass -File "' + psFile + '"', (err) => {
      try { require('fs').unlinkSync(psFile); } catch (e) {}
      if (err) reject(err);
      else resolve(filepath);
    });
  });
}

// Process check
function checkProcess() {
  try {
    const output = execSync(
      'powershell -Command "Get-Process -Name \'*ai-companion*\' -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Id"',
      { encoding: 'utf8', timeout: 10000 }
    );
    const pid = parseInt(output.trim());
    return pid > 0 ? { running: true, pid: pid } : { running: false };
  } catch (e) {
    return { running: false, error: e.message };
  }
}

// HTTP check
function httpCheck(url, timeout) {
  timeout = timeout || 3000;
  return new Promise((resolve) => {
    const req = http.get(url, { timeout }, (res) => {
      resolve({ responding: true, status: res.statusCode });
    });
    req.on('error', (e) => resolve({ responding: false, error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ responding: false, error: 'timeout' }); });
  });
}

// File exists check
function checkFileExists(filepath) {
  try {
    const stat = statSync(filepath);
    return { exists: true, size: stat.size, mtime: stat.mtime };
  } catch (e) {
    return { exists: false, error: e.message };
  }
}

// Execute test with evidence
async function executeTest(name, testFn) {
  const evidence = { log: LOG_FILE, screenshot: null, files: [] };
  let screenshotBefore = null, screenshotAfter = null;
  
  try {
    screenshotBefore = await takeScreenshot(name + '_before');
    evidence.screenshot = screenshotBefore;
  } catch (e) {
    log('Screenshot before failed: ' + e.message, 'WARN');
  }
  
  log('[TEST] Running: ' + name, 'TEST');
  const result = await testFn();
  
  try {
    screenshotAfter = await takeScreenshot(name + '_after');
    evidence.screenshot = screenshotAfter;
  } catch (e) {
    log('Screenshot after failed: ' + e.message, 'WARN');
  }
  
  evidence.beforeScreenshot = screenshotBefore;
  evidence.afterScreenshot = screenshotAfter;
  
  return { ...result, evidence };
}

// TESTS

// Test 1: Application Process
async function test1_Process() {
  const proc = checkProcess();
  return {
    name: 'Test 1: Application Process Running',
    action: 'Check process existence via PowerShell',
    expected: 'Process ai-companion-desktop.exe running with valid PID',
    actual: proc.running ? 'Running, PID ' + proc.pid : 'Not found',
    assertion: proc.running === true,
    result: proc.running ? 'PASSED' : 'FAILED',
    data: proc
  };
}

// Test 2: Dev Server HTTP
async function test2_ServerHTTP() {
  const srv = await httpCheck(CONFIG.devServerUrl);
  return {
    name: 'Test 2: Dev Server HTTP Response',
    action: 'GET http://localhost:5173',
    expected: 'HTTP 200 OK',
    actual: srv.responding ? 'HTTP ' + srv.status : srv.error,
    assertion: srv.responding && srv.status === 200,
    result: (srv.responding && srv.status === 200) ? 'PASSED' : 'FAILED',
    data: srv
  };
}

// Test 3: Combined Launch
async function test3_Launch() {
  const proc = checkProcess();
  const srv = await httpCheck(CONFIG.devServerUrl);
  const combined = proc.running && srv.responding;
  return {
    name: 'Test 3: Application Launch (Process + Server)',
    action: 'Verify both process and server operational',
    expected: 'Process running AND Server responding',
    actual: (proc.running ? 'Process OK' : 'Process FAIL') + ' + ' + (srv.responding ? 'Server OK' : 'Server FAIL'),
    assertion: combined,
    result: combined ? 'PASSED' : 'FAILED',
    data: { process: proc, server: srv }
  };
}

// Test 4: Key Files Exist
async function test4_KeyFiles() {
  const files = [
    'apps/desktop/src/ChatPanel.tsx',
    'apps/desktop/src/SettingsPanel.tsx',
    'apps/desktop/src/store.ts',
    'apps/desktop/src/mcpService.ts',
    'apps/desktop/src/memory/db.ts',
    'apps/desktop/src-tauri/src/lib.rs',
    'apps/desktop/src-tauri/tauri.conf.json'
  ];
  
  const results = {};
  let allExist = true;
  
  for (const f of files) {
    const fullPath = join(CONFIG.projectRoot, f);
    const check = checkFileExists(fullPath);
    results[f] = check;
    if (!check.exists) allExist = false;
  }
  
  return {
    name: 'Test 4: Key Source Files Exist',
    action: 'Check existence of 7 key source files',
    expected: 'All 7 files exist',
    actual: Object.values(results).filter(r => r.exists).length + '/7 files exist',
    assertion: allExist,
    result: allExist ? 'PASSED' : 'FAILED',
    data: results
  };
}

// Test 5: Build Output
async function test5_BuildOutput() {
  const buildFiles = [
    'apps/desktop/src-tauri/target/release/ai-companion-desktop.exe',
    'apps/desktop/dist/index.html'
  ];
  
  const results = {};
  let allExist = true;
  
  for (const f of buildFiles) {
    const fullPath = join(CONFIG.projectRoot, f);
    const check = checkFileExists(fullPath);
    results[f] = check;
    if (!check.exists) allExist = false;
  }
  
  return {
    name: 'Test 5: Build Output Exist',
    action: 'Check existence of built artifacts',
    expected: 'EXE and dist/index.html exist',
    actual: Object.values(results).filter(r => r.exists).length + '/2 exist',
    assertion: allExist,
    result: allExist ? 'PASSED' : 'FAILED',
    data: results
  };
}

// Test 6: Database
async function test6_Database() {
  const dbPath = 'C:/Users/asus/AppData/Roaming/ai-companion-desktop/ai_companion.db';
  const check = checkFileExists(dbPath);
  
  return {
    name: 'Test 6: SQLite Database',
    action: 'Check if database file exists',
    expected: 'ai_companion.db exists',
    actual: check.exists ? 'Exists (' + Math.round(check.size / 1024) + ' KB)' : 'Not found',
    assertion: check.exists,
    result: check.exists ? 'PASSED' : 'FAILED',
    data: check
  };
}

// Test 7: Window Title
async function test7_WindowTitle() {
  try {
    const output = execSync(
      'powershell -Command "Get-Process | Where-Object {$_.MainWindowTitle -like \'*AI Companion*\'} | Select-Object -First 1 -ExpandProperty MainWindowTitle"',
      { encoding: 'utf8', timeout: 5000 }
    );
    const title = output.trim();
    return {
      name: 'Test 7: Window Title',
      action: 'Check MainWindowTitle of AI Companion process',
      expected: 'Title contains "AI Companion"',
      actual: title || 'No window title found',
      assertion: title.includes('AI Companion'),
      result: title.includes('AI Companion') ? 'PASSED' : 'FAILED',
      data: { title }
    };
  } catch (e) {
    return {
      name: 'Test 7: Window Title',
      action: 'Check MainWindowTitle via PowerShell',
      expected: 'Title contains "AI Companion"',
      actual: 'Error: ' + e.message,
      assertion: false,
      result: 'FAILED',
      data: { error: e.message }
    };
  }
}

// Main runner
async function runTests() {
  log('========================================', 'INFO');
  log('AI Companion GUI Verification Starting', 'INFO');
  log('========================================', 'INFO');
  log('Project: ' + CONFIG.projectRoot, 'INFO');
  log('Evidence: ' + EVIDENCE_DIR, 'INFO');
  
  const results = [];
  
  // Execute all tests with evidence
  const tests = [
    test1_Process,
    test2_ServerHTTP,
    test3_Launch,
    test4_KeyFiles,
    test5_BuildOutput,
    test6_Database,
    test7_WindowTitle
  ];
  
  for (const testFn of tests) {
    try {
      const result = await executeTest(testFn.name, testFn);
      results.push(result);
    } catch (e) {
      results.push({
        name: testFn.name || 'Unknown Test',
        result: 'BLOCKED',
        error: e.message
      });
    }
  }
  
  // Generate report
  const passed = results.filter(r => r.result === 'PASSED').length;
  const failed = results.filter(r => r.result === 'FAILED').length;
  const blocked = results.filter(r => r.result === 'BLOCKED').length;
  const unverified = results.filter(r => r.result === 'UNVERIFIED').length;
  
  let md = '# AI Companion GUI Verification Report\n\n';
  md += '**Generated**: ' + new Date().toISOString() + '\n';
  md += '**Test Runner**: gui_verification_runner.js\n';
  md += '**Evidence Dir**: ' + EVIDENCE_DIR + '\n\n';
  md += '---\n\n## Summary\n\n';
  md += '| Metric | Count |\n';
  md += '|--------|-------|\n';
  md += '| Total Tests | ' + results.length + ' |\n';
  md += '| **Passed** | ' + passed + ' |\n';
  md += '| **Failed** | ' + failed + ' |\n';
  md += '| **Blocked** | ' + blocked + ' |\n';
  md += '| **Unverified** | ' + unverified + ' |\n\n';
  md += '---\n\n## Detailed Results\n\n';
  
  results.forEach((r, i) => {
    md += '### ' + (i + 1) + '. ' + r.name + '\n\n';
    md += '| Field | Value |\n';
    md += '|-------|-------|\n';
    md += '| **Result** | **' + r.result + '** |\n';
    md += '| Action | ' + (r.action || 'N/A') + ' |\n';
    md += '| Expected | ' + (r.expected || 'N/A') + ' |\n';
    md += '| Actual | ' + (r.actual || 'N/A') + ' |\n';
    md += '| Before Screenshot | ' + (r.evidence?.beforeScreenshot || 'N/A') + ' |\n';
    md += '| After Screenshot | ' + (r.evidence?.afterScreenshot || 'N/A') + ' |\n';
    if (r.error) md += '| Error | ' + r.error + ' |\n';
    md += '\n';
  });
  
  md += '---\n\n## Evidence Files\n\n';
  md += '- **Evidence Directory**: `' + EVIDENCE_DIR + '`\n';
  md += '- **Log File**: `' + LOG_FILE + '`\n';
  md += '- **Report File**: `' + REPORT_FILE + '`\n\n';
  
  md += '---\n\n## Test Definitions\n\n';
  md += '| # | Test | Method | Assertion |\n';
  md += '|---|------|--------|----------|\n';
  md += '| 1 | Application Process | PowerShell Get-Process | Process running with valid PID |\n';
  md += '| 2 | Dev Server HTTP | http.get localhost:5173 | HTTP 200 response |\n';
  md += '| 3 | Application Launch | Combined check | Process + Server both OK |\n';
  md += '| 4 | Key Source Files | File system check | 7 key files exist |\n';
  md += '| 5 | Build Output | File system check | EXE and dist/ exist |\n';
  md += '| 6 | SQLite Database | File system check | DB file exists |\n';
  md += '| 7 | Window Title | PowerShell MainWindowTitle | Title contains "AI Companion" |\n\n';
  
  md += '---\n\n## Limitations\n\n';
  md += 'This CLI-based verification cannot test:\n';
  md += '- GUI interactions (click, input, typing)\n';
  md += '- Settings panel tab switching\n';
  md += '- Chat message sending/receiving\n';
  md += '- Emotion/expression changes\n';
  md += '- Memory persistence across sessions\n\n';
  md += '**These require user manual testing or Playwright automation.**\n\n';
  
  md += '---\n\n## Manual Testing Required\n\n';
  md += 'User must manually verify:\n';
  md += '1. Click settings button → settings panel opens\n';
  md += '2. Switch between 4 tabs → content changes\n';
  md += '3. Type message → text appears in input\n';
  md += '4. Click send → message in chat, AI response\n';
  md += '5. Change setting → close panel → reopen → persistence\n\n';
  
  // Write reports
  writeFileSync(REPORT_FILE, md);
  log('Report saved: ' + REPORT_FILE);
  
  try {
    const dPath = 'D:/AI文件/hermes_file/log/GUI_VERIFICATION_REPORT.md';
    writeFileSync(dPath, md);
    log('Report copied to: ' + dPath);
  } catch (e) {
    log('D: copy failed: ' + e.message, 'ERROR');
  }
  
  log('========================================', 'INFO');
  log('Results: ' + passed + ' PASSED, ' + failed + ' FAILED, ' + blocked + ' BLOCKED', 'INFO');
  log('========================================', 'INFO');
  
  return { passed, failed, blocked, unverified, results };
}

// Execute
runTests()
  .then(data => process.exit(data.failed + data.blocked > 0 ? 1 : 0))
  .catch(e => { log('Fatal: ' + e.message, 'ERROR'); process.exit(1); });
