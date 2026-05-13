// AI Companion 4小时长时间压力测试
// 每30秒测试一次，约480次

const API_KEY = 'sk-cp-eZ_KsU3aRH1rcNGPfFlBdIyFqLt4wfIZm9LgQ8dyHJEjUFXBwfqGjbK9Ne7sBIVGpoiR6okgH-SDRbSelgVtsNTaT3wUkTY5ox8TS-EWyRaDFc9a_uj1TKY';
const API_BASE = 'https://api.minimax.chat';
const MODEL = 'MiniMax-M2.7-highspeed';

const TEST_INTERVAL = 30000; // 30秒
const TOTAL_HOURS = 4;
const TOTAL_TESTS = Math.floor((TOTAL_HOURS * 60 * 60 * 1000) / TEST_INTERVAL);

const testMessages = [
  // 基础对话
  '你好',
  '你叫什么名字',
  '今天天气怎么样',
  '你在干嘛',
  '陪我聊天',
  // 记忆测试
  '我叫测试用户',
  '我是一名软件工程师',
  '我喜欢看电影',
  '我在深圳工作',
  '我养了一只狗',
  // 验证记忆
  '还记得我叫什么吗',
  '我是什么职业',
  '我喜欢什么',
  '我在哪个城市',
  '我的宠物是什么',
  // 情感测试
  '我喜欢你',
  '你真棒',
  '我心情不好',
  '好无聊啊',
  '最近有点累',
  // 日常
  '早上好',
  '晚安',
  '今天吃什么',
  '周末有什么计划',
  '给我讲个笑话',
  // 进阶
  '解释下什么是AI',
  '推荐一首好听的歌',
  '有什么好看的电影',
  '教我写代码',
  '1+1等于多少',
];

let testState = {
  startTime: null,
  totalTests: 0,
  success: 0,
  failed: 0,
  disconnections: 0,
  lastSuccess: true,
  memoryTests: [],
  emotionTests: [],
  latencies: [],
  errors: [],
  memories: [],
  conversationHistory: [],
};

function getTestMessage() {
  const index = testState.totalTests % testMessages.length;
  return testMessages[index];
}

async function sendMessage(message) {
  const startTime = Date.now();

  try {
    const messages = [
      { role: 'system', content: '你是小伊，一个超级可爱、活泼开朗、话痨、粘人、爱撒娇的AI少女。你用~呀啦哦呢嘿等语气词结尾。不要太长，保持活泼俏皮的风格。' },
      ...testState.conversationHistory,
      { role: 'user', content: message }
    ];

    const response = await fetch(`${API_BASE}/v1/text/chatcompletion_v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages: messages,
        max_tokens: 200,
        temperature: 0.8,
      }),
    });

    const latency = Date.now() - startTime;

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || '无回复';

    // 添加到对话历史
    testState.conversationHistory.push({ role: 'user', content: message });
    testState.conversationHistory.push({ role: 'assistant', content: reply });

    // 限制历史长度
    if (testState.conversationHistory.length > 20) {
      testState.conversationHistory.splice(0, 2);
    }

    // 提取记忆
    extractMemory(message, reply);

    return { success: true, reply, latency };

  } catch (error) {
    const latency = Date.now() - startTime;
    return { success: false, error: error.message, latency };
  }
}

function extractMemory(userMsg, assistantReply) {
  const triggers = ['我叫', '名字', '职业', '喜欢', '工作', '住', '养', '城市', '宠物'];
  for (const t of triggers) {
    if (userMsg.includes(t)) {
      // 简化：直接保存用户消息作为记忆
      if (userMsg.length < 100 && userMsg.length > 2) {
        testState.memories.push({
          text: userMsg,
          timestamp: Date.now()
        });
        // 限制记忆数量
        if (testState.memories.length > 50) {
          testState.memories.shift();
        }
        break;
      }
    }
  }
}

function log(message) {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  console.log(`[${timestamp}] ${message}`);
}

function logResult(testNum, result, message) {
  const status = result.success ? '✓' : '✗';
  const latency = result.latency || 0;

  if (result.success) {
    log(`${status} [${testNum}/${TOTAL_TESTS}] ${message.substring(0, 30)}... → ${result.reply.substring(0, 40)}... [${latency}ms]`);
  } else {
    log(`${status} [${testNum}/${TOTAL_TESTS}] ${message.substring(0, 30)}... → 错误: ${result.error} [${latency}ms]`);
  }
}

function printStatistics() {
  const elapsed = Date.now() - testState.startTime;
  const elapsedHours = (elapsed / 3600000).toFixed(1);
  const avgLatency = testState.latencies.length > 0
    ? Math.round(testState.latencies.reduce((a, b) => a + b, 0) / testState.latencies.length)
    : 0;

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    测试统计                                  ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(`║  已运行: ${elapsedHours}小时 / ${TOTAL_HOURS}小时`);
  console.log(`║  测试次数: ${testState.totalTests} / ${TOTAL_TESTS} (${((testState.totalTests/TOTAL_TESTS)*100).toFixed(1)}%)`);
  console.log(`║  成功: ${testState.success}  失败: ${testState.failed}`);
  console.log(`║  掉线次数: ${testState.disconnections}`);
  console.log(`║  当前成功率: ${((testState.success/testState.totalTests)*100).toFixed(2)}%`);
  console.log(`║  平均延迟: ${avgLatency}ms`);
  console.log(`║  记忆数量: ${testState.memories.length}`);
  console.log('╚════════════════════════════════════════════════════════════╝\n');
}

async function runTest() {
  testState.startTime = Date.now();

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     AI Companion 4小时长时间压力测试                        ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(`║  开始时间: ${new Date().toISOString()}`);
  console.log(`║  测试次数: ${TOTAL_TESTS}次 (每${TEST_INTERVAL/1000}秒一次)`);
  console.log(`║  预计结束: ${new Date(Date.now() + TOTAL_HOURS * 60 * 60 * 1000).toISOString()}`);
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  while (testState.totalTests < TOTAL_TESTS) {
    const testNum = testState.totalTests + 1;
    const message = getTestMessage();

    log(`\n▶ 测试 #${testNum}/${TOTAL_TESTS} 开始`);

    const result = await sendMessage(message);

    if (result.success) {
      testState.success++;
      testState.latencies.push(result.latency);

      if (!testState.lastSuccess) {
        testState.disconnections++;
        log('⚠️ 连接恢复');
      }
      testState.lastSuccess = true;
    } else {
      testState.failed++;
      testState.errors.push({
        testNum,
        message,
        error: result.error,
        timestamp: Date.now()
      });
      testState.lastSuccess = false;

      // 失败后等待更长时间再重试
      log(`⚠️ 失败: ${result.error}，${TEST_INTERVAL/1000}秒后重试...`);
    }

    logResult(testNum, result, message);

    // 每10次输出统计
    if (testNum % 10 === 0) {
      printStatistics();
    }

    testState.totalTests++;

    // 检查是否完成
    if (testState.totalTests >= TOTAL_TESTS) {
      break;
    }

    // 等待下一次测试
    await new Promise(resolve => setTimeout(resolve, TEST_INTERVAL));
  }

  // 最终报告
  console.log('\n\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                    测试完成                                  ║');
  console.log('╠════════════════════════════════════════════════════════════╣');

  const totalTime = Date.now() - testState.startTime;
  const totalHours = (totalTime / 3600000).toFixed(1);
  const avgLatency = testState.latencies.length > 0
    ? Math.round(testState.latencies.reduce((a, b) => a + b, 0) / testState.latencies.length)
    : 0;

  console.log(`║  总测试时间: ${totalHours}小时`);
  console.log(`║  总测试次数: ${testState.totalTests}`);
  console.log(`║  成功次数: ${testState.success}`);
  console.log(`║  失败次数: ${testState.failed}`);
  console.log(`║  掉线恢复次数: ${testState.disconnections}`);
  console.log(`║  最终成功率: ${((testState.success/testState.totalTests)*100).toFixed(2)}%`);
  console.log(`║  平均延迟: ${avgLatency}ms`);
  console.log(`║  最小延迟: ${Math.min(...testState.latencies)}ms`);
  console.log(`║  最大延迟: ${Math.max(...testState.latencies)}ms`);
  console.log(`║  记忆条目: ${testState.memories.length}`);

  if (testState.errors.length > 0) {
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log('║  错误详情 (前10条):');
    testState.errors.slice(0, 10).forEach(e => {
      console.log(`║    [#${e.testNum}] ${e.error} - ${e.message.substring(0, 20)}...`);
    });
    if (testState.errors.length > 10) {
      console.log(`║    ... 还有${testState.errors.length - 10}条错误`);
    }
  }

  console.log('╚════════════════════════════════════════════════════════════╝');

  // 保存详细日志
  const logFile = `test_log_${Date.now()}.json`;
  const fs = require('fs');
  fs.writeFileSync(logFile, JSON.stringify({
    testConfig: { totalTests: TOTAL_TESTS, intervalMs: TEST_INTERVAL, totalHours: TOTAL_HOURS },
    results: testState,
    errors: testState.errors,
  }, null, 2));
  console.log(`\n详细日志已保存: ${logFile}`);
}

// 每小时保存一次进度
setInterval(() => {
  if (testState.totalTests > 0) {
    printStatistics();
  }
}, 3600000);

runTest().catch(console.error);
