// AI Companion 4小时长时间测试 - 简化版
const API_KEY = 'sk-cp-eZ_KsU3aRH1rcNGPfFlBdIyFqLt4wfIZm9LgQ8dyHJEjUFXBwfqGjbK9Ne7sBIVGpoiR6okgH-SDRbSelgVtsNTaT3wUkTY5ox8TS-EWyRaDFc9a_uj1TKY';
const API_BASE = 'https://api.minimax.chat';
const MODEL = 'MiniMax-M2.7-highspeed';
const fs = require('fs');

const LOG_FILE = 'test_4h.log';
const INTERVAL = 30000; // 30秒
const TOTAL = 480; // 4小时

const msgs = ['你好', '你叫什么', '今天怎样', '心情好', '哈哈', '给我讲笑话', '唱歌', '你是谁', '晚安', '早上好'];

let s = { ok:0, fail:0, latencies:[], errors:[], start: Date.now() };

function log(m) {
  const t = new Date().toISOString().split('T')[1].split('.')[0];
  const line = `[${t}] ${m}\n`;
  fs.appendFileSync(LOG_FILE, line);
  console.log(line.trim());
}

async function send(msg) {
  const t0 = Date.now();
  try {
    const r = await fetch(API_BASE + '/v1/text/chatcompletion_v2', {
      method: 'POST',
      headers: {'Content-Type':'application/json','Authorization':'Bearer '+API_KEY},
      body: JSON.stringify({
        model: MODEL,
        messages: [{role:'system',content:'你是小伊，活泼可爱的AI少女，用~结尾'}, {role:'user',content:msg}],
        max_tokens: 150, temperature: 0.8
      })
    });
    if (!r.ok) throw new Error('HTTP '+r.status);
    const d = await r.json();
    return { ok:true, reply:d.choices?.[0]?.message?.content || '?', lat: Date.now()-t0 };
  } catch(e) {
    return { ok:false, error:e.message, lat: Date.now()-t0 };
  }
}

async function run() {
  log('=== 4小时测试开始 ===');
  log(`开始: ${new Date().toISOString()}`);

  for (let i = 0; i < TOTAL; i++) {
    const msg = msgs[i % msgs.length];
    const r = await send(msg);
    if (r.ok) {
      s.ok++;
      s.latencies.push(r.lat);
      log(`✓ ${i+1}/${TOTAL} [${r.lat}ms] ${msg} → ${r.reply.substring(0,50)}`);
    } else {
      s.fail++;
      s.errors.push({i:i+1, msg, err:r.error});
      log(`✗ ${i+1}/${TOTAL} [${r.lat}ms] ${msg} → ${r.error}`);
    }
    if ((i+1) % 20 === 0) {
      const avg = Math.round(s.latencies.reduce((a,b)=>a+b,0)/s.latencies.length);
      const rate = ((s.ok/(i+1))*100).toFixed(1);
      log(`--- 统计: 成功${s.ok} 失败${s.fail} 成功率${rate}% 平均${avg}ms ---`);
    }
    if (i < TOTAL-1) await new Promise(r => setTimeout(r, INTERVAL));
  }

  const total = Date.now() - s.start;
  const avg = Math.round(s.latencies.reduce((a,b)=>a+b,0)/s.latencies.length);
  const min = Math.min(...s.latencies);
  const max = Math.max(...s.latencies);
  log(`=== 测试完成 ===`);
  log(`总时间: ${(total/3600000).toFixed(1)}小时`);
  log(`成功: ${s.ok} 失败: ${s.fail}`);
  log(`成功率: ${((s.ok/TOTAL)*100).toFixed(2)}%`);
  log(`延迟: 平均${avg}ms 最小${min}ms 最大${max}ms`);
  if (s.errors.length) {
    log(`错误: ${s.errors.slice(0,5).map(e=>`[#${e.i}]${e.err}`).join(', ')}${s.errors.length>5?'...':''}`);
  }
}

run().catch(e => { log('ERROR: '+e.message); process.exit(1); });
