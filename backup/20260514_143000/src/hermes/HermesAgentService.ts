/**
 * Hermes Agent Service
 * 
 * Manages a hidden Python subprocess running Hermes Agent,
 * captures its output, and extracts final responses for the chat window.
 * 
 * Architecture:
 * 1. Spawn hidden Python window running Hermes
 * 2. Send user input via stdin
 * 3. Capture stdout/stderr in real-time
 * 4. Parse output to extract final response
 * 5. Return summarized response for character display
 */

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

export interface HermesMessage {
  type: 'stream' | 'thinking' | 'tool' | 'complete' | 'error';
  content: string;
  timestamp: number;
}

export interface HermesResponse {
  final: string;        // Final response for chat display
  thinking?: string;    // Chain of thought (if captured)
  tools?: string[];     // Tools used
  raw?: string;         // Raw output for debugging
}

export class HermesAgentService extends EventEmitter {
  private process: ChildProcess | null = null;
  private isRunning: boolean = false;
  private outputBuffer: string = '';
  private lineBuffer: string = '';
  
  // Hermes path
  private hermesPath: string;
  
  // Config
  private model: string;
  private baseUrl: string;
  
  constructor() {
    super();
    
    // Default Hermes location
    this.hermesPath = 'C:/Users/asus/AppData/Local/hermes/hermes-agent';
    
    // Default model config (will be loaded from settings)
    this.model = 'MiniMax-M2.7-32K';
    this.baseUrl = 'https://api.minimax.chat/v1';
  }
  
  /**
   * Configure the Hermes service
   */
  configure(options: {
    hermesPath?: string;
    model?: string;
    baseUrl?: string;
  }) {
    if (options.hermesPath) this.hermesPath = options.hermesPath;
    if (options.model) this.model = options.model;
    if (options.baseUrl) this.baseUrl = options.baseUrl;
  }
  
  /**
   * Start the Hermes subprocess (hidden window)
   */
  async start(): Promise<boolean> {
    if (this.isRunning) {
      console.log('[Hermes] Already running');
      return true;
    }
    
    try {
      console.log('[Hermes] Starting subprocess...');
      
      // Spawn Python process with Hermes
      // Using pythonw.exe to run without window
      this.process = spawn('python', [
        '-c',
        `
import sys
import os
sys.path.insert(0, r'${this.hermesPath.replace(/\\/g, '\\\\')}')
os.chdir(r'${this.hermesPath.replace(/\\/g, '\\\\')}')

# Import and run Hermes
from run_agent import AIAgent

agent = AIAgent(
    base_url="${this.baseUrl}",
    model="${this.model}"
)

print("[HERMES_READY]", flush=True)

# Interactive loop
while True:
    try:
        line = sys.stdin.readline()
        if not line:
            break
        user_input = line.strip()
        if user_input == "__QUIT__":
            break
        if user_input:
            print(f"[HERMES_PROCESSING] {user_input[:50]}...", flush=True)
            response = agent.run_conversation(user_input)
            print(f"[HERMES_RESPONSE] {response[:500]}...", flush=True)
            print("[HERMES_DONE]", flush=True)
    except Exception as e:
        print(f"[HERMES_ERROR] {e}", flush=True)
        print("[HERMES_DONE]", flush=True)
`
      ], {
        cwd: this.hermesPath,
        env: {
          ...process.env,
          'PYTHONIOENCODING': 'utf-8',
          'PYTHONUNBUFFERED': '1',
        },
        shell: false,
      });
      
      // Handle stdout
      this.process.stdout?.on('data', (data: Buffer) => {
        const text = data.toString('utf-8');
        this.handleOutput(text);
      });
      
      // Handle stderr
      this.process.stderr?.on('data', (data: Buffer) => {
        const text = data.toString('utf-8');
        this.emit('stream', { type: 'error', content: text, timestamp: Date.now() });
      });
      
      // Handle exit
      this.process.on('close', (code) => {
        console.log(`[Hermes] Process exited with code ${code}`);
        this.isRunning = false;
        this.emit('close', code);
      });
      
      this.process.on('error', (err) => {
        console.error('[Hermes] Process error:', err);
        this.emit('error', err);
      });
      
      // Wait for ready signal
      const ready = await this.waitForReady();
      this.isRunning = ready;
      
      return ready;
    } catch (err) {
      console.error('[Hermes] Failed to start:', err);
      return false;
    }
  }
  
  /**
   * Wait for Hermes to be ready
   */
  private waitForReady(): Promise<boolean> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.log('[Hermes] Ready timeout');
        resolve(false);
      }, 10000);
      
      const checkReady = (data: Buffer) => {
        const text = data.toString('utf-8');
        if (text.includes('[HERMES_READY]')) {
          clearTimeout(timeout);
          this.process?.stdout?.off('data', checkReady);
          console.log('[Hermes] Ready!');
          resolve(true);
        }
      };
      
      this.process?.stdout?.on('data', checkReady);
    });
  }
  
  /**
   * Handle stdout output
   */
  private handleOutput(text: string) {
    this.lineBuffer += text;
    
    // Process complete lines
    const lines = this.lineBuffer.split('\n');
    this.lineBuffer = lines.pop() || '';
    
    for (const line of lines) {
      this.processLine(line);
    }
  }
  
  /**
   * Process a single line of output
   */
  private processLine(line: string) {
    line = line.trim();
    if (!line) return;
    
    // Parse different message types
    if (line.startsWith('[HERMES_READY]')) {
      this.emit('ready');
    } else if (line.startsWith('[HERMES_PROCESSING]')) {
      const content = line.replace('[HERMES_PROCESSING]', '').trim();
      this.emit('stream', { type: 'thinking', content, timestamp: Date.now() });
    } else if (line.startsWith('[HERMES_RESPONSE]')) {
      const content = line.replace('[HERMES_RESPONSE]', '').trim();
      this.emit('stream', { type: 'stream', content, timestamp: Date.now() });
      this.outputBuffer += content + '\n';
    } else if (line.startsWith('[HERMES_ERROR]')) {
      const content = line.replace('[HERMES_ERROR]', '').trim();
      this.emit('stream', { type: 'error', content, timestamp: Date.now() });
      this.outputBuffer += `[ERROR] ${content}\n`;
    } else if (line.startsWith('[HERMES_DONE]')) {
      // Complete response
      const response = this.parseResponse();
      this.emit('complete', response);
      this.outputBuffer = '';
    } else {
      // Raw output (tool execution, etc.)
      this.emit('stream', { type: 'tool', content: line, timestamp: Date.now() });
      this.outputBuffer += line + '\n';
    }
  }
  
  /**
   * Parse the accumulated output to extract final response
   */
  private parseResponse(): HermesResponse {
    const raw = this.outputBuffer;
    
    // Extract the last substantial response
    const responseMatch = raw.match(/\[HERMES_RESPONSE\](.+?)(?:\[HERMES_DONE\]|$)/s);
    let final = responseMatch ? responseMatch[1].trim() : raw.trim();
    
    // Clean up markdown code blocks if present
    final = this.cleanMarkdown(final);
    
    // Extract thinking blocks
    const thinkingMatch = raw.match(/\[THINKING\](.+?)\[\/THINKING\]/s);
    const thinking = thinkingMatch ? thinkingMatch[1].trim() : undefined;
    
    // Extract tools used
    const tools: string[] = [];
    const toolMatches = raw.matchAll(/\[TOOL\](.+?)\[\/TOOL\]/g);
    for (const match of toolMatches) {
      tools.push(match[1].trim());
    }
    
    return { final, thinking, tools, raw };
  }
  
  /**
   * Clean markdown formatting for display
   */
  private cleanMarkdown(text: string): string {
    return text
      .replace(/```[\s\S]*?```/g, '[代码块]')  // Replace code blocks
      .replace(/`([^`]+)`/g, '$1')              // Replace inline code
      .replace(/\*\*([^*]+)\*\*/g, '$1')         // Replace bold
      .replace(/\*([^*]+)\*/g, '$1')            // Replace italic
      .replace(/\n{3,}/g, '\n\n')               // Reduce multiple newlines
      .trim();
  }
  
  /**
   * Send a message to Hermes and get the response
   */
  async sendMessage(message: string): Promise<HermesResponse> {
    if (!this.isRunning || !this.process) {
      const started = await this.start();
      if (!started) {
        throw new Error('Hermes not running');
      }
    }
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.off('complete', onComplete);
        reject(new Error('Hermes response timeout'));
      }, 120000); // 2 minute timeout
      
      const onComplete = (response: HermesResponse) => {
        clearTimeout(timeout);
        resolve(response);
      };
      
      this.once('complete', onComplete);
      
      // Send message to Hermes stdin
      this.process?.stdin?.write(message + '\n');
    });
  }
  
  /**
   * Stop the Hermes subprocess
   */
  stop() {
    if (this.process) {
      this.process.stdin?.write('__QUIT__\n');
      setTimeout(() => {
        if (this.process && !this.process.killed) {
          this.process.kill();
        }
        this.process = null;
        this.isRunning = false;
      }, 1000);
    }
  }
  
  /**
   * Check if Hermes is running
   */
  isActive(): boolean {
    return this.isRunning;
  }
}

// Singleton instance
export const hermesService = new HermesAgentService();
