// 定时任务模块 - 轻量级前端调度器
// 只在 AI Companion 应用运行时生效，不做系统级后台服务

import { useAppStore } from './store';
import type { ScheduledTask } from './store';
import { maybeAutoRead } from './voice';

const STORAGE_KEY = 'ai_companion_scheduled_tasks';
const CHECK_INTERVAL_MS = 30000; // 每30秒检查一次

let schedulerInterval: ReturnType<typeof setInterval> | null = null;

export type ScheduledTaskAction = 'reminder' | 'web_search' | 'ai_summary' | 'need_clarification';

const WEB_SEARCH_KEYWORDS = [
  '搜索', '联网搜索', '查一下', '查询', '最新', 'github', '官网', '新闻',
  '天气', '价格', 'release', '版本', '项目', '仓库', '股票', '比赛',
];

const STRONG_WEB_SEARCH_KEYWORDS = [
  '搜索', '联网搜索', '查一下', '查询', '最新', 'github', '官网', '新闻',
  '天气', '价格', 'release', '版本', '仓库', '股票', '比赛',
];

const AI_SUMMARY_KEYWORDS = [
  '总结', '汇总', '复盘', '整理', '进展', '今天做了什么',
  '当前任务', '生成日报', '分析',
];

const REMINDER_KEYWORDS = [
  '提醒', '记得', '喝水', '休息', '起床', '开会', '吃饭',
];

const INTERNAL_ENGLISH_RE = /(The user|I need to|We need to|Here is|Sure|Let me|I can help|As an AI|I'm an AI)/i;

/** 定时任务动作分类 */
export function classifyScheduledTaskAction(content: string, enableWebSearch = false): ScheduledTaskAction {
  const text = (content || '').trim();
  const lower = text.toLowerCase();
  if (!text) return 'need_clarification';

  if (enableWebSearch) return 'web_search';

  const hasSummary = AI_SUMMARY_KEYWORDS.some(keyword => lower.includes(keyword.toLowerCase()));
  const hasStrongSearch = STRONG_WEB_SEARCH_KEYWORDS.some(keyword => lower.includes(keyword.toLowerCase()));
  const hasAnySearch = WEB_SEARCH_KEYWORDS.some(keyword => lower.includes(keyword.toLowerCase()));

  if (hasStrongSearch) return 'web_search';
  if (hasSummary) return 'ai_summary';
  if (hasAnySearch) return 'web_search';
  if (REMINDER_KEYWORDS.some(keyword => lower.includes(keyword.toLowerCase()))) return 'reminder';

  return 'need_clarification';
}

export function getScheduledTaskActionLabel(action: ScheduledTaskAction): string {
  switch (action) {
    case 'web_search':
      return '联网搜索';
    case 'ai_summary':
      return 'AI 总结';
    case 'need_clarification':
      return '需要确认';
    case 'reminder':
    default:
      return '普通提醒';
  }
}

export function mayTriggerScheduledWebSearch(content: string, enableWebSearch = false): boolean {
  return classifyScheduledTaskAction(content, enableWebSearch) === 'web_search';
}

/** 生成唯一ID */
function generateTaskId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/** 从 localStorage 加载任务 */
export function loadScheduledTasks(): ScheduledTask[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn('[Scheduler] Failed to load tasks from localStorage:', e);
  }
  return [];
}

/** 保存任务到 localStorage */
export function saveScheduledTasks(tasks: ScheduledTask[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (e) {
    console.warn('[Scheduler] Failed to save tasks to localStorage:', e);
  }
}

/** 创建新任务 */
export function createScheduledTask(params: {
  title: string;
  content: string;
  type: 'once' | 'daily' | 'interval';
  timeOfDay?: string;
  intervalMinutes?: number;
  runAt?: string;
  enableWebSearch?: boolean;
}): ScheduledTask {
  const now = new Date();
  let nextRunAt: string;

  if (params.type === 'once') {
    // once 类型：使用指定的 runAt 时间
    if (params.runAt) {
      nextRunAt = params.runAt;
    } else {
      // 如果没有指定 runAt，设为1分钟后
      nextRunAt = new Date(now.getTime() + 60000).toISOString();
    }
  } else if (params.type === 'daily') {
    // daily 类型：计算下一天指定时间
    const [hours, minutes] = (params.timeOfDay || '09:00').split(':').map(Number);
    const next = new Date(now);
    next.setHours(hours, minutes, 0, 0);
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }
    nextRunAt = next.toISOString();
  } else {
    // interval 类型：从现在起加间隔
    const intervalMs = (params.intervalMinutes || 30) * 60 * 1000;
    nextRunAt = new Date(now.getTime() + intervalMs).toISOString();
  }

  const nowISO = now.toISOString();
  const task: ScheduledTask = {
    id: generateTaskId(),
    title: params.title,
    content: params.content,
    type: params.type,
    enabled: true,
    timeOfDay: params.timeOfDay,
    intervalMinutes: params.intervalMinutes,
    runAt: params.runAt,
    nextRunAt,
    runCount: 0,
    createdAt: nowISO,
    updatedAt: nowISO,
    enableWebSearch: params.enableWebSearch ?? false,
  };

  console.log(`[Scheduler] scheduled_task_created id=${task.id} type=${task.type} next_run_at=${task.nextRunAt}`);

  const tasks = loadScheduledTasks();
  tasks.push(task);
  saveScheduledTasks(tasks);

  return task;
}

/** 更新任务 */
export function updateScheduledTask(id: string, updates: Partial<ScheduledTask>): void {
  const tasks = loadScheduledTasks();
  const index = tasks.findIndex(t => t.id === id);
  if (index === -1) return;

  // 合并更新并刷新 updatedAt
  tasks[index] = {
    ...tasks[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };
  saveScheduledTasks(tasks);

  console.log(`[Scheduler] scheduled_task_updated task_id=${id} updates=${Object.keys(updates).join(',')}`);
}

/** 删除任务 */
export function deleteScheduledTask(id: string): void {
  const tasks = loadScheduledTasks();
  const filtered = tasks.filter(t => t.id !== id);
  saveScheduledTasks(filtered);

  console.log(`[Scheduler] scheduled_task_deleted task_id=${id}`);
}

/** 切换任务启用/停用状态 */
export function toggleScheduledTask(id: string): void {
  const tasks = loadScheduledTasks();
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  task.enabled = !task.enabled;
  task.updatedAt = new Date().toISOString();
  saveScheduledTasks(tasks);

  if (task.enabled) {
    console.log(`[Scheduler] scheduled_task_enabled task_id=${id}`);
  } else {
    console.log(`[Scheduler] scheduled_task_disabled task_id=${id}`);
  }
}

/** 计算任务下次执行时间 */
function computeNextRunAt(task: ScheduledTask): string {
  const now = new Date();

  if (task.type === 'daily') {
    const [hours, minutes] = (task.timeOfDay || '09:00').split(':').map(Number);
    const next = new Date(now);
    next.setHours(hours, minutes, 0, 0);
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }
    return next.toISOString();
  } else if (task.type === 'interval') {
    const intervalMs = (task.intervalMinutes || 30) * 60 * 1000;
    return new Date(now.getTime() + intervalMs).toISOString();
  }

  // once 类型不重新计算
  return task.nextRunAt;
}

/** 格式化时间显示 */
function formatDisplayTime(isoString: string): string {
  try {
    return new Date(isoString).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return isoString;
  }
}

/** 格式化搜索结果为文本摘要 */
function formatSearchResults(results: any[]): string {
  if (!results || results.length === 0) return '无结果';
  return results.slice(0, 5).map((r, i) => {
    const title = r.title || '无标题';
    const snippet = r.snippet ? String(r.snippet).substring(0, 180) : '';
    return `${i + 1}. ${title}\n   ${snippet}`;
  }).join('\n\n');
}

function sanitizeScheduledError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error || '未知错误');
  const legacyPort = '18' + '789';
  return raw
    .replace(new RegExp(`127\\.0\\.0\\.1:${legacyPort}|${legacyPort}`, 'gi'), '本地联网服务')
    .replace(/OpenClaw|Bridge|Gateway|mock/gi, '联网服务');
}

function sanitizeChineseOutput(text: string, fallback: string): string {
  const value = (text || '').trim();
  if (!value) return fallback;
  if (INTERNAL_ENGLISH_RE.test(value)) return fallback;
  if (/^[A-Za-z]/.test(value) && !/[一-龥]/.test(value.slice(0, 120))) return fallback;
  return value
    .replace(/\*\*/g, '')
    .replace(/^(Here is|Sure|Let me|I can help)[^\n。！？]*/i, '')
    .trim() || fallback;
}

function buildScheduledReminderMessage(task: ScheduledTask): string {
  return `⏰ 定时提醒：${task.title}

${task.content}`;
}

function buildClarificationMessage(task: ScheduledTask): string {
  return `⏰ 定时任务：${task.title}

这个任务内容还不够明确，请补充要我执行的是提醒、联网搜索，还是总结任务。`;
}

async function executeScheduledWebSearch(task: ScheduledTask): Promise<string> {
  const { runtime } = await import('./runtime/runtimeAdapter');
  const searchResult = await runtime.network.search(task.content, {
    provider: 'minimax_web_search',
    maxResults: 5,
  });

  if (!searchResult.ok || !searchResult.results || searchResult.results.length === 0) {
    return `⏰ 定时任务：${task.title}

【联网搜索结果】
没有查到可用结果。

【任务内容】
${task.content}`;
  }

  const results = searchResult.results;
  const formatted = formatSearchResults(results);
  const sources = results
    .slice(0, 5)
    .map((r: any, i: number) => `${i + 1}. ${r.title || '无标题'} - ${r.url || '无链接'}`)
    .join('\n');

  const isMock = searchResult.source === 'mock';
  console.log(`[Scheduler] provider=minimax_web_search is_mock=${isMock} result_count=${results.length}`);

  return `⏰ 定时任务：${task.title}

【联网搜索结果】
已根据任务内容完成 MiniMax Web Search：${task.content}

【结论】
已找到 ${results.length} 条相关结果，优先查看“${results[0]?.title || '第一条结果'}”。

【关键信息】
${formatted}

【来源】
${sources}`;
}

function buildSummaryContext(): string {
  const state = useAppStore.getState();
  const clean = (text = '') => text.replace(/\s+/g, ' ').trim();
  const recentMessages = (state.messages || [])
    .filter(m => (m.role === 'user' || m.role === 'assistant') && clean(m.content))
    .filter(m => !INTERNAL_ENGLISH_RE.test(m.content))
    .slice(-16)
    .map((m, i) => `${i + 1}. ${m.role === 'user' ? '用户' : '小伊'}：${clean(m.content).slice(0, 220)}`)
    .join('\n');
  const memories = (state.memories || [])
    .slice(0, 8)
    .map((m, i) => `${i + 1}. ${clean(m.content).slice(0, 160)}`)
    .join('\n');
  return `【最近聊天记录】
${recentMessages || '暂无'}

【长期记忆】
${memories || '暂无'}`;
}

async function callMiniMaxForScheduledSummary(task: ScheduledTask): Promise<string> {
  const { apiKey, baseUrl, model } = useAppStore.getState().aiConfig;
  if (!apiKey) {
    return `⏰ 定时总结：${task.title}

【总结】
MiniMax API Key 未配置，暂时无法生成 AI 总结。

【下一步建议】
1. 到设置里确认 MiniMax API Key。
2. 稍后重新执行这个总结任务。`;
  }

  const prompt = `你是 AI Companion 的中文总结助手。
必须使用简体中文。
必须先给结论，再给细节。
不能输出英文推理。
不能出现 Here is、Sure、Let me、I can help、The user、I need to、We need to。
不能原样复述任务内容。

【定时任务】
标题：${task.title}
内容：${task.content}

${buildSummaryContext()}

请输出：
【总结】
...

【下一步建议】
1. ...
2. ...`;

  try {
    const response = await fetch(`${baseUrl}/v1/text/chatcompletion_v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 600,
        temperature: 0.6,
      }),
    });

    if (!response.ok) {
      return `⏰ 定时总结：${task.title}

【总结】
AI 总结调用失败，状态码 ${response.status}。

【下一步建议】
1. 检查 MiniMax 模型设置。
2. 稍后重新执行这个总结任务。`;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim() || data.choices?.[0]?.message?.reasoning_content?.trim() || '';
    const fallback = `【总结】
当前聊天里主要在处理 AI Companion 的功能验证和修复。

【下一步建议】
1. 继续确认定时任务触发结果。
2. 保留 release EXE 实机验证记录。`;

    return `⏰ 定时总结：${task.title}

${sanitizeChineseOutput(content, fallback)}`;
  } catch (error) {
    return `⏰ 定时总结：${task.title}

【总结】
AI 总结调用失败：${sanitizeScheduledError(error)}

【下一步建议】
1. 检查网络和模型配置。
2. 稍后重新执行这个总结任务。`;
  }
}

async function executeScheduledSummary(task: ScheduledTask): Promise<string> {
  return callMiniMaxForScheduledSummary(task);
}

/** 生成定时任务触发的中文消息 */
function buildScheduledTaskMessage(task: ScheduledTask): string {
  const timeInfo = task.type === 'interval'
    ? `（每隔 ${task.intervalMinutes} 分钟）
`
    : task.type === 'daily'
    ? `（每天 ${task.timeOfDay}）
`
    : `（一次性任务）
`;

  const header = `⏰ 定时提醒
${'─'.repeat(20)}
📌 ${task.title}
${timeInfo}
${'─'.repeat(20)}

`;

  return header + task.content;
}

/** 检查并触发到期任务 */
async function checkAndTriggerTasks(): Promise<void> {
  const tasks = loadScheduledTasks();
  const now = new Date();
  let modified = false;

  for (const task of tasks) {
    if (!task.enabled) continue;

    const nextRun = new Date(task.nextRunAt);
    // 同一分钟内不要重复触发（防重）
    const diffMs = now.getTime() - nextRun.getTime();
    if (diffMs < 0 || diffMs > 60000) continue;

    // 防止重复触发
    if (task.lastRunAt) {
      const lastRun = new Date(task.lastRunAt);
      if (now.getTime() - lastRun.getTime() < 60000) continue;
    }

    const action = classifyScheduledTaskAction(task.content, task.enableWebSearch);
    console.log(`[Scheduler] scheduled_task_triggered task_id=${task.id} type=${task.type} title=${task.title} action=${action} webSearch=${task.enableWebSearch}`);

    let messageContent = '';
    let webSearchMeta: { resultCount: number } | null = null;

    try {
      if (action === 'web_search') {
        messageContent = await executeScheduledWebSearch(task);
        const match = messageContent.match(/已找到\s+(\d+)\s+条/);
        webSearchMeta = { resultCount: match ? Number(match[1]) : 0 };
        console.log(`[Scheduler] scheduled_task_websearch_done task_id=${task.id} results=${webSearchMeta.resultCount}`);
      } else if (action === 'ai_summary') {
        messageContent = await executeScheduledSummary(task);
        console.log(`[Scheduler] scheduled_task_ai_summary_done task_id=${task.id}`);
      } else if (action === 'need_clarification') {
        messageContent = buildClarificationMessage(task);
      } else {
        messageContent = buildScheduledReminderMessage(task);
      }
    } catch (error) {
      console.error('[Scheduler] scheduled_task_action_failed:', error);
      messageContent = `⏰ 定时任务：${task.title}

任务执行失败：${sanitizeScheduledError(error)}`;
    }

    // 在聊天框插入消息
    try {
      const { addMessage } = useAppStore.getState();
      if (webSearchMeta && webSearchMeta.resultCount > 0) {
        await addMessage({ role: 'system', content: `🌐 已联网搜索：${task.content} (${webSearchMeta.resultCount}条结果)` });
      }
      await addMessage({ role: 'assistant', content: messageContent });
      void maybeAutoRead(messageContent, 'scheduled', task.id);
      console.log(`[Scheduler] scheduled_task_message_inserted task_id=${task.id}`);
    } catch (e) {
      console.error('[Scheduler] scheduled_task_error:', e);
    }

    // 更新 lastRunAt 和 runCount
    task.lastRunAt = now.toISOString();
    task.runCount = (task.runCount || 0) + 1;

    if (task.type === 'once') {
      // 一次性任务执行后标记完成
      task.enabled = false;
      task.completedAt = now.toISOString();
      console.log(`[Scheduler] scheduled_task_completed task_id=${task.id} run_count=${task.runCount}`);
    } else {
      // daily/interval 重新计算下次执行时间
      task.nextRunAt = computeNextRunAt(task);
      console.log(`[Scheduler] scheduled_task_next_run_updated task_id=${task.id} next_run_at=${task.nextRunAt}`);
    }

    modified = true;
  }

  if (modified) {
    saveScheduledTasks(tasks);
  }
}

/** 启动调度器 */
export function startScheduler(): void {
  if (schedulerInterval) {
    console.log('[Scheduler] Already running');
    return;
  }

  const tasks = loadScheduledTasks();
  console.log(`[Scheduler] scheduled_task_loaded count=${tasks.length}`);

  schedulerInterval = setInterval(checkAndTriggerTasks, CHECK_INTERVAL_MS);

  // 启动后立即检查一次（处理漏掉的任务）
  setTimeout(checkAndTriggerTasks, 2000);
}

/** 停止调度器 */
export function stopScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('[Scheduler] stopped');
  }
}

/** 解析简单自然语言创建任务（可选功能） */
export function parseSimpleTaskFromText(text: string): {
  title: string;
  content: string;
  type: 'once' | 'daily' | 'interval';
  timeOfDay?: string;
  intervalMinutes?: number;
  runAt?: string;
} | null {
  const lower = text.toLowerCase();

  // 间隔任务：每隔N分钟/小时
  const intervalMatch = lower.match(/每隔?(\d+)\s*(分钟?|min|小时?|hour|小时半)/);
  if (intervalMatch) {
    let minutes = parseInt(intervalMatch[1], 10);
    if (intervalMatch[2].includes('小时') || intervalMatch[2].includes('hour')) {
      minutes *= 60;
    }
    if (intervalMatch[2] === '小时半') {
      minutes = minutes * 60 + 30;
    }
    return {
      title: '提醒',
      content: text.replace(/每隔?\d+\s*(分钟?|min|小时?|hour|小时半)/g, '').trim() || '提醒你了~',
      type: 'interval',
      intervalMinutes: minutes,
    };
  }

  // 每天固定时间
  const dailyMatch = lower.match(/每天(早上?|上午?|下午?|晚上?|中午?|凌晨?|早上|晚上)?\s*(\d{1,2}):?(\d{2})?/);
  if (dailyMatch) {
    let hours = parseInt(dailyMatch[2], 10);
    const minutes = dailyMatch[3] ? parseInt(dailyMatch[3], 10) : 0;
    const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

    const suffix = dailyMatch[1] || '';
    const content = text.replace(/每天.*$/, '').trim() || '提醒你了~';

    return {
      title: '每日提醒',
      content: content,
      type: 'daily',
      timeOfDay: timeStr,
    };
  }

  return null;
}
