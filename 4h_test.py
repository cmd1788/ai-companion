#!/usr/bin/env python3
"""AI Companion 4小时长时间测试"""
import urllib.request
import json
import time
import os

API_KEY = 'sk-cp-eZ_KsU3aRH1rcNGPfFlBdIyFqLt4wfIZm9LgQ8dyHJEjUFXBwfqGjbK9Ne7sBIVGpoiR6okgH-SDRbSelgVtsNTaT3wUkTY5ox8TS-EWyRaDFc9a_uj1TKY'
API_BASE = 'https://api.minimax.chat'
MODEL = 'MiniMax-M2.7-highspeed'
LOG_DIR = 'D:/AI文件/hermes_file/log'
LOG_FILE = os.path.join(LOG_DIR, '4h_test.log')
PROGRESS_FILE = os.path.join(LOG_DIR, '4h_progress.json')

MSGS = ['你好', '你叫啥', '今天天气', '心情不错', '哈哈', '讲笑话', '唱歌', '你是谁', '晚安', '早安']
TOTAL = 480
INTERVAL = 30  # seconds

def log(msg):
    timestamp = time.strftime('%Y-%m-%d %H:%M:%S')
    line = f"[{timestamp}] {msg}\n"
    with open(LOG_FILE, 'a', encoding='utf-8') as f:
        f.write(line)
    print(line.strip())

def send_req(msg):
    data = json.dumps({
        'model': MODEL,
        'messages': [
            {'role': 'system', 'content': '你是小伊，活泼可爱的AI少女'},
            {'role': 'user', 'content': msg}
        ],
        'max_tokens': 150,
        'temperature': 0.8
    }).encode('utf-8')
    
    req = urllib.request.Request(
        f'{API_BASE}/v1/text/chatcompletion_v2',
        data=data,
        headers={
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {API_KEY}'
        },
        method='POST'
    )
    
    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            content = resp.read()
            latency = int((time.time() - t0) * 1000)
            result = json.loads(content)
            reply = result.get('choices', [{}])[0].get('message', {}).get('content', '?')
            return {'ok': True, 'reply': reply[:50], 'latency': latency}
    except Exception as e:
        latency = int((time.time() - t0) * 1000)
        return {'ok': False, 'error': str(e), 'latency': latency}

def main():
    os.makedirs(LOG_DIR, exist_ok=True)
    
    state = {
        'start': time.time(),
        'count': 0,
        'ok': 0,
        'fail': 0,
        'latencies': [],
        'errors': []
    }
    
    log('=== 4小时测试开始 ===')
    log(f'开始时间: {time.strftime("%Y-%m-%d %H:%M:%S")}')
    log(f'预计结束: {time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(time.time() + TOTAL * INTERVAL))}')
    
    for i in range(TOTAL):
        msg = MSGS[i % len(MSGS)]
        result = send_req(msg)
        
        if result['ok']:
            state['ok'] += 1
            state['latencies'].append(result['latency'])
            log(f"OK {i+1}/{TOTAL} [{result['latency']}ms] {msg} -> {result['reply']}")
        else:
            state['fail'] += 1
            state['errors'].append({'i': i+1, 'msg': msg, 'err': result['error']})
            log(f"FAIL {i+1}/{TOTAL} [{result.get('latency',0)}ms] {msg} -> {result['error']}")
        
        state['count'] = i + 1
        
        # 每20条输出统计
        if (i + 1) % 20 == 0:
            avg = sum(state['latencies']) / len(state['latencies']) if state['latencies'] else 0
            rate = (state['ok'] / (i + 1)) * 100
            log(f"[统计] 成功{state['ok']} 失败{state['fail']} 成功率{rate:.1f}% 平均{int(avg)}ms")
        
        # 保存进度
        with open(PROGRESS_FILE, 'w') as f:
            json.dump(state, f, default=str)
        
        # 等待下次
        if i < TOTAL - 1:
            time.sleep(INTERVAL)
    
    # 最终报告
    elapsed = time.time() - state['start']
    avg = sum(state['latencies']) / len(state['latencies']) if state['latencies'] else 0
    log('=== 测试完成 ===')
    log(f'总时间: {elapsed/3600:.1f}小时')
    log(f'成功: {state["ok"]} 失败: {state["fail"]}')
    log(f'成功率: {(state["ok"]/TOTAL)*100:.2f}%')
    log(f'平均延迟: {int(avg)}ms')
    log(f'最小延迟: {min(state["latencies"])}ms')
    log(f'最大延迟: {max(state["latencies"])}ms')
    if state['errors']:
        log(f'错误: {state["errors"][:5]}')

if __name__ == '__main__':
    main()
