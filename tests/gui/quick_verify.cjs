const { existsSync, mkdirSync, writeFileSync } = require('fs');
const { join } = require('path');
const { execSync } = require('child_process');

const CONFIG = {
  appName: 'ai-companion-desktop',
  devServerUrl: 'http://localhost:5173',
  screenshotDir: join(__dirname, 'screenshots'),
  logsDir: join(__dirname, 'logs'),
  reportsDir: join(__dirname, 'reports'),
};

const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const LOG_FILE = join(CONFIG.logsDir, 'gui_verification_' + TIMESTAMP + '.log');
const REPORT_FILE = join(CONFIG.reportsDir, 'GUI_VERIFICATION_REPORT.md');

[CONFIG.screenshotDir, CONFIG.logsDir, CONFIG.reportsDir].forEach(dir => {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
});

function log(msg, level) {
  if (!level) level = 'INFO';
  const entry = '[' + new Date().toISOString() + '] [' + level + '] ' + msg;
  console.log(entry);
  writeFileSync(LOG_FILE, entry + '\n', { flag: 'a' });
}

// Process check using PowerShell
function checkProcess() {
  try {
    const output = execSync(
      'powershell -Command "Get-Process -Name \'*ai-companion*\' -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Id"',
      { encoding: 'utf8', timeout: 10000 }
    );
    const pid = parseInt(output.trim());
    if (pid > 0) return { running: true, pid: pid };
    return { running: false };
  } catch (e) {
    return { running: false, error: e.message };
  }
}

function httpCheck(url, timeout) {
  timeout = timeout || 3000;
  const http = require('http');
  return new Promise(function(resolve) {
    const req = http.get(url, { timeout: timeout }, function(res) {
      resolve({ responding: true, status: res.statusCode });
    });
    req.on('error', function(e) { resolve({ responding: false, error: e.message }); });
    req.on('timeout', function() { req.destroy(); resolve({ responding: false, error: 'timeout' }); });
  });
}

async function runTests() {
  log('=== AI Companion GUI Verification ===');
  
  const results = [];
  
  // Test 1: Process check
  const proc = checkProcess();
  const test1 = {
    name: 'Test 1: Application Process Running',
    result: proc.running ? 'PASSED' : 'FAILED',
    process: proc
  };
  results.push(test1);
  log('Process check: ' + JSON.stringify(proc), 'TEST');
  
  // Test 2: Dev server HTTP
  const srv = await httpCheck(CONFIG.devServerUrl);
  const test2 = {
    name: 'Test 2: Dev Server HTTP 200',
    result: (srv.responding && srv.status === 200) ? 'PASSED' : 'FAILED',
    server: srv
  };
  results.push(test2);
  log('Server check: ' + JSON.stringify(srv), 'TEST');
  
  // Test 3: Combined - app running + server responding
  const test3 = {
    name: 'Test 3: Application Launch (Process + Server)',
    result: (proc.running && srv.responding) ? 'PASSED' : 'FAILED',
    details: { process: proc.running, server: srv.responding }
  };
  results.push(test3);
  
  // Generate report
  var md = '# AI Companion GUI Verification Report\n\n';
  md += '**Generated**: ' + new Date().toISOString() + '\n';
  md += '**Test Runner**: quick_verify.cjs\n\n';
  md += '---\n\n## Summary\n\n';
  md += '| Metric | Value |\n';
  md += '|--------|-------|\n';
  const passed = results.filter(function(r) { return r.result === 'PASSED'; }).length;
  const failed = results.filter(function(r) { return r.result === 'FAILED'; }).length;
  md += '| Total Tests | ' + results.length + ' |\n';
  md += '| Passed | ' + passed + ' |\n';
  md += '| Failed | ' + failed + ' |\n\n';
  md += '---\n\n## Detailed Results\n\n';
  md += '| Test | Result | Details |\n';
  md += '|------|--------|---------|\n';
  results.forEach(function(r) {
    const details = r.process ? JSON.stringify(r.process) : (r.server ? JSON.stringify(r.server) : JSON.stringify(r.details));
    md += '| ' + r.name + ' | **' + r.result + '** | `' + details + '` |\n';
  });
  md += '\n---\n\n## Evidence Files\n\n';
  md += '- **Log**: `' + LOG_FILE + '`\n';
  md += '- **Report**: `' + REPORT_FILE + '`\n\n';
  md += '---\n\n## Test Definitions\n\n';
  md += '### Test 1: Application Process Running\n';
  md += '- **Purpose**: Verify `ai-companion-desktop.exe` process is active\n';
  md += '- **Method**: PowerShell `Get-Process -Name \'*ai-companion*\'`\n';
  md += '- **Assertion**: Process found with valid PID\n\n';
  md += '### Test 2: Dev Server HTTP 200\n';
  md += '- **Purpose**: Verify frontend dev server responds with HTTP 200\n';
  md += '- **Method**: `http.get(localhost:5173)`\n';
  md += '- **Assertion**: Response status === 200\n\n';
  md += '### Test 3: Application Launch (Combined)\n';
  md += '- **Purpose**: Verify both process AND server are operational\n';
  md += '- **Assertion**: process.running === true AND server.responding === true\n\n';
  md += '---\n\n## Limitations\n\n';
  md += 'This CLI-based verification can check:\n';
  md += '1. Process existence (via PowerShell Get-Process)\n';
  md += '2. Dev server HTTP response (via http.get)\n';
  md += '3. Screenshot capture (via PowerShell)\n\n';
  md += '**GUI interaction tests (click, input, settings) require user manual testing.**\n\n';
  md += '---\n\n## Manual Testing Required\n\n';
  md += 'The following tests MUST be performed manually:\n\n';
  md += '1. **Settings Button** - Click gear icon, verify settings panel opens\n';
  md += '2. **Tab Switching** - Click through 4 tabs (人物设定/系统设定/模型设置/风格页面)\n';
  md += '3. **Input Text** - Type in input box\n';
  md += '4. **Send Message** - Click send button, verify AI response\n';
  md += '5. **Settings Persistence** - Modify setting, close, reopen, verify persistence\n\n';
  md += '---\n\n## Next Steps\n\n';
  md += '1. User manually verify GUI interactions listed above\n';
  md += '2. Report failures with screenshots\n';
  md += '3. For automated DOM testing, consider adding Playwright\n';

  writeFileSync(REPORT_FILE, md);
  log('Report saved: ' + REPORT_FILE);
  
  // Copy to D:
  try {
    const dPath = 'D:/AI文件/hermes_file/log/GUI_VERIFICATION_REPORT.md';
    writeFileSync(dPath, md);
    log('Report copied to: ' + dPath);
  } catch (e) {
    log('D: copy failed: ' + e.message, 'ERROR');
  }
  
  log('=== Results: ' + passed + ' PASSED, ' + failed + ' FAILED ===');
  return { passed: passed, failed: failed, results: results };
}

runTests().then(function(data) {
  process.exit(data.failed > 0 ? 1 : 0);
}).catch(function(e) {
  log('Error: ' + e.message, 'ERROR');
  process.exit(1);
});
