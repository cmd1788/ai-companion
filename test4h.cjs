#!/usr/bin/env node
// AI Companion 4小时测试
const API_KEY = 'sk-cp-eZ_KsU3aRH1rcNGPfFlBdIyFqLt4wfIZm9LgQ8dyHJEjUFXBwfqGjbK9Ne7sBIVGpoiR6okgH-SDRbSelgVtsNTaT3wUkTY5ox8TS-EWyRaDFc9a_uj1TKY';
const API_BASE = 'https://api.minimax.chat';
const MODEL = 'MiniMax-M2.7-highspeed';
const LOG = 'test4h.log';
const INTERVAL = 30000;
const TOTAL = 480;

const msgs = ['你好','你叫啥','今天天气','心情不错','哈哈笑','讲笑话','唱歌','你是谁','晚安','早安'];

let s = {ok:0, fail:0, lat:[]};

function log(m) {
  const t = new Date().toISOString().replace('T',' ').split('.')[0];
  const line = `[${t}] ${m}\n`;
  require('fs').appendFileSync(LOG, line);
  process.stdout.write(line);
}

async function send(msg) {
  const t0 = Date.now();
  try {
    const r = await fetch(API_BASE+'/v1/text/chatcompletion_v2', {
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+API_KEY},
      body: JSON.stringify({model:MODEL,messages:[
        {role:'system',content:'你是小伊，活泼可爱的AI少女'},
        {role:'user',content:msg}
      ],max_tokens:150,temperature:0.8})
    });
    if (!r.ok) throw new Error('HTTP'+r.status);
    const d = await r.json();
    return {ok:true, reply:d.choices?.[0]?.message?.content||'?', lat:Date.now()-t0};
  } catch(e) { return {ok:false, err:e.message, lat:Date.now()-t0}; }
}

async function main() {
  log('== 4小时测试开始 ==');
  log(`开始: ${new Date().toISOString()}`);
  for (let i=0; i<TOTAL; i++) {
    const msg = msgs[i % msgs.length];
    const r = await send(msg);
    if (r.ok) {
      s.ok++; s.lat.push(r.lat);
      log(`OK ${i+1}/${TOTAL} [${r.lat}ms] ${msg} -> ${r.reply.substring(0,40)}`);
    } else {
      s.fail++;
      log(`FAIL ${i+1}/${TOTAL} [${r.lat}ms] ${msg} -> ${r.err}`);
    }
    if ((i+1)%20===0) {
      const avg=Math.round(s.lat.reduce((a,b)=>a+b,0)/s.lat.length);
      log(`[统计] 成功${s.ok} 失败${s.fail} 成功率${((s.ok/(i+1))*100).toFixed(1)}% 平均${avg}ms`);
    }
    if (i < TOTAL-1) await new Promise(r => setTimeout(r, INTERVAL));
  }
  const avg=Math.round(s.lat.reduce((a,b)=>a+b,0)/s.lat.length);
  log(`== 完成 == 成功${s.ok} 失败${s.fail} 平均${avg}ms`);
}
main().catch(e => { log('ERROR: '+e.message); process.exit(1); });
