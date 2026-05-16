// 定时任务模块 - 轻量级前端调度器
// 只在 AI Companion 应用运行时生效，不做系统级后台服务

import { useAppStore } from './store';
import type { ScheduledTask } from './store';

const STORAGE_KEY = 'ai_companion_scheduled_tasks';
const CHECK_INTERVAL_MS = 30000; // 每30秒检查一次

let schedulerInterval: ReturnType<typeof setInterval> | null = null;

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
  return results.slice(0, 3).map((r, i) => {
    const title = r.title || '无标题';
    const snippet = r.snippet ? r.snippet.substring(0, 150) : '';
    return `${i + 1}. ${title}\n   ${snippet}`;
  }).join('\n\n');
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

    console.log(`[Scheduler] scheduled_task_triggered task_id=${task.id} type=${task.type} title=${task.title} webSearch=${task.enableWebSearch}`);

    let messageContent = '';
    let webSearchMeta = null;

    // 如果启用了联网搜索，先执行联网
    if (task.enableWebSearch) {
      try {
        const { runtime } = await import('./runtime/runtimeAdapter');
        const searchResult = await runtime.network.search(task.content, {
          provider: 'minimax_web_search',
          maxResults: 5,
        });

        if (searchResult.ok && searchResult.results && searchResult.results.length > 0) {
          const results = searchResult.results;
          const formatted = formatSearchResults(results);

          // 构建联网搜索结构化消息
          const sources = results.map((r: any, i: number) => `${i + 1}. ${r.title} - ${r.url}`).join('\n');
          messageContent = `⏰ 定时任务：${task.title}

【联网搜索结果】
🌐 已搜索：${task.content}
找到 ${results.length} 条相关结果：

【关键信息】
${formatted.slice(0, 800)}

【来源】
${sources}`;

          webSearchMeta = {
            provider: 'minimax_web_search',
            isMock: false,
            query: task.content,
            resultCount: results.length,
            source: searchResult.source || 'MiniMax',
            results: results,
          };

          console.log(`[Scheduler] scheduled_task_websearch_done task_id=${task.id} results=${results.length}`);
        } else {
          messageContent = `⏰ 定时任务：${task.title}

【联网搜索结果】
⚠️ 搜索未返回结果，任务内容：${task.content}`;
        }
      } catch (error) {
        console.error('[Scheduler] scheduled_task_websearch_failed:', error);
        messageContent = `⏰ 定时任务：${task.title}

【联网搜索失败】
⚠️ 联网搜索出错：${error instanceof Error ? error.message : String(error)}
任务内容：${task.content}`;
      }
    } else {
      // 普通任务（不联网）
      messageContent = buildScheduledTaskMessage(task);
    }

    // 在聊天框插入消息
    try {
      const { addMessage } = useAppStore.getState();
      if (webSearchMeta) {
        await addMessage({ role: 'system', content: `🌐 已联网搜索：${task.content} (${webSearchMeta.resultCount}条结果)` });
      }
      await addMessage({ role: 'assistant', content: messageContent });
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
