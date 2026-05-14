/**
 * Response Parser for Hermes Agent
 * 
 * Parses Hermes raw output and converts it into:
 * 1. Character-friendly responses (for chat display)
 * 2. Thinking traces (for debug/logging)
 * 3. Tool usage (for metrics)
 */

import { HermesResponse } from './HermesAgentService';

export interface ParsedCharacterResponse {
  // The main response text, cleaned and formatted for character display
  displayText: string;
  
  // Emotional tone detected from response
  emotion: CharacterEmotion;
  
  // Whether response indicates tool usage
  usedTools: boolean;
  
  // Raw tools list for logging
  toolsUsed: string[];
  
  // Thinking/context for debug
  thinking?: string;
}

export type CharacterEmotion = 
  | 'happy'      // Positive, helpful
  | 'thinking'   // Processing, analyzing
  | 'executing'  // Running tools
  | 'neutral'    // Default
  | 'error'      // Something went wrong
  | 'excited';   // Enthusiastic response

/**
 * Parse Hermes response and create character-friendly output
 */
export function parseForCharacter(
  response: HermesResponse,
  characterPersonality: CharacterConfig
): ParsedCharacterResponse {
  const { final, thinking, tools } = response;
  
  // Detect emotion from response content
  const emotion = detectEmotion(final, tools);
  
  // Clean and format the response
  let displayText = cleanForDisplay(final);
  
  // Apply character personality transformation
  displayText = applyPersonality(displayText, characterPersonality, emotion);
  
  return {
    displayText,
    emotion,
    usedTools: tools.length > 0,
    toolsUsed: tools,
    thinking,
  };
}

/**
 * Detect emotional tone from response
 */
function detectEmotion(response: string, tools: string[]): CharacterEmotion {
  const lower = response.toLowerCase();
  
  // Tool execution in progress
  if (tools.length > 0) {
    return 'executing';
  }
  
  // Error indicators
  if (lower.includes('error') || 
      lower.includes('failed') || 
      lower.includes('sorry') ||
      lower.includes('cannot')) {
    return 'error';
  }
  
  // Thinking/processing
  if (lower.includes('analyzing') ||
      lower.includes('searching') ||
      lower.includes('looking') ||
      lower.includes('checking')) {
    return 'thinking';
  }
  
  // Enthusiastic
  if (lower.includes('great') ||
      lower.includes('excellent') ||
      lower.includes('wonderful') ||
      lower.includes('perfect')) {
    return 'excited';
  }
  
  // Happy/helpful
  if (lower.includes('here') ||
      lower.includes('here\'s') ||
      lower.includes('i can') ||
      lower.includes('i\'ll') ||
      lower.includes('let me')) {
    return 'happy';
  }
  
  return 'neutral';
}

/**
 * Clean response text for display
 */
function cleanForDisplay(text: string): string {
  return text
    // Remove code blocks but keep content
    .replace(/```[\w]*\n([\s\S]*?)```/g, '$1')
    // Remove inline code markers
    .replace(/`([^`]+)`/g, '$1')
    // Remove markdown bold
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    // Remove markdown italic
    .replace(/\*([^*]+)\*/g, '$1')
    // Remove markdown headers
    .replace(/^#{1,6}\s+/gm, '')
    // Remove links but keep text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Clean up excessive whitespace
    .replace(/\n{3,}/g, '\n\n')
    .replace(/ {2,}/g, ' ')
    .trim();
}

/**
 * Apply character personality to response
 */
function applyPersonality(
  text: string,
  config: CharacterConfig,
  emotion: CharacterEmotion
): string {
  // Add personality prefix based on emotion
  let prefix = '';
  let suffix = '';
  
  switch (emotion) {
    case 'thinking':
      prefix = config.thinkingPrefix || '让我想想... ';
      break;
    case 'executing':
      prefix = config.executingPrefix || '正在执行... ';
      break;
    case 'error':
      prefix = config.errorPrefix || '嗯...遇到了点问题。 ';
      break;
    case 'excited':
      prefix = config.excitedPrefix || '太棒了！ ';
      break;
    case 'happy':
      prefix = config.happyPrefix || '';
      break;
  }
  
  // Add suffix for certain emotions
  if (emotion === 'thinking') {
    suffix = config.thinkingSuffix || '';
  }
  
  // Respect personality settings
  if (!config.usePersonalityPrefix) {
    prefix = '';
  }
  
  return prefix + text + suffix;
}

/**
 * Configuration for character personality
 */
export interface CharacterConfig {
  thinkingPrefix?: string;
  executingPrefix?: string;
  errorPrefix?: string;
  excitedPrefix?: string;
  happyPrefix?: string;
  thinkingSuffix?: string;
  usePersonalityPrefix: boolean;
}

// Default configuration
export const DEFAULT_CHARACTER_CONFIG: CharacterConfig = {
  thinkingPrefix: '嗯...让我想想... ',
  executingPrefix: '正在处理... ',
  errorPrefix: '嗯...好像有点问题。 ',
  excitedPrefix: '太好了！ ',
  happyPrefix: '',
  thinkingSuffix: '',
  usePersonalityPrefix: true,
};

/**
 * Extract thinking block from Hermes output
 */
export function extractThinking(raw: string): string | undefined {
  const match = raw.match(/<thinking>([\s\S]*?)<\/thinking>/i);
  return match ? match[1].trim() : undefined;
}

/**
 * Check if response indicates a tool call
 */
export function hasToolCalls(raw: string): boolean {
  return raw.includes('[TOOL]') || 
         raw.includes('tool_call') ||
         raw.includes('function_call');
}
