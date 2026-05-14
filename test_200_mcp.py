"""200条消息压力测试 - 包含记忆、情感、表情系统"""
import urllib.request
import urllib.error
import json
import time
import random

API_KEY = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJtaW5pbWF4IiwicWEiOiIxMDI0NDIyNDY4NzkxMjQyOTM2NiIsImV4cCI6MTc4NTg3MzI1Nn0.gH-h9ZMrC1D1LqJa0o6X1yq7YvR5wQ8zKj9N5pL2mF4xQ6yB3cD8eE9fG1hH2iI3jJ4kK5lL6mM7nN8oO9pP0qQ1rR2sS3tT4uU5vV6wW7xX8yY9zZ"
API_URL = "https://api.minimax.chat/v1/text/chatcompletion_v2"

# 记忆测试消息
MEMORY_TESTS = [
    "我叫小明，是一名程序员",
    "我住在上海",
    "我喜欢打篮球",
    "我养了一只猫叫豆豆",
    "我生日是6月1日",
]

# 情感测试消息
EMOTION_TESTS = [
    "我好开心啊！今天天气真好~",
    "好无聊啊，没人陪我聊天...",
    "呜呜呜，我失恋了...",
    "谢谢你的陪伴，你真好！",
    "我好累啊，工作压力好大...",
]

# 普通对话
NORMAL_TESTS = [
    "你好呀，小伊~",
    "今天吃什么好呢？",
    "给我讲个笑话吧~",
    "你喜欢看什么动漫？",
    "周末有什么计划吗？",
]

def send_message(text, messages):
    """发送消息到API"""
    data = {
        "model": "MiniMax-M2.7-highspeed",
        "messages": messages + [{"role": "user", "content": text}],
        "max_tokens": 200,
        "temperature": 0.8
    }
    
    req = urllib.request.Request(
        API_URL,
        data=json.dumps(data).encode('utf-8'),
        headers={
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {API_KEY}'
        },
        method='POST'
    )
    
    start = time.time()
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            result = json.loads(resp.read().decode('utf-8'))
            latency = int((time.time() - start) * 1000)
            reply = result.get('choices', [{}])[0].get('message', {}).get('content', '')
            return True, reply, latency
    except Exception as e:
        latency = int((time.time() - start) * 1000)
        return False, str(e), latency

def run_test():
    print(f"[{'='*50}]")
    print(f"[测试开始] 200条消息压力测试")
    print(f"[包含内容] 记忆系统、情感系统、表情系统")
    print(f"[{'='*50}]\n")
    
    messages = [
        {"role": "system", "content": "你是小伊，一个超级可爱的AI少女。你用~呀啦哦呢嘿等语气词结尾。"}
    ]
    
    success = 0
    failed = 0
    latencies = []
    current_latency = 0
    
    # 混合测试
    test_messages = []
    for i in range(40):
        test_messages.append(random.choice(MEMORY_TESTS))
    for i in range(30):
        test_messages.append(random.choice(EMOTION_TESTS))
    for i in range(130):
        test_messages.append(random.choice(NORMAL_TESTS))
    
    # 打乱顺序
    random.shuffle(test_messages)
    
    for i, text in enumerate(test_messages, 1):
        ok, result, latency = send_message(text, messages)
        
        if ok:
            success += 1
            latencies.append(latency)
            messages.append({"role": "user", "content": text})
            messages.append({"role": "assistant", "content": result})
            current_latency = sum(latencies[-10:]) // min(len(latencies[-10:]), 10)
            rate = (success / (success + failed)) * 100
            print(f"[{i:3d}/200] OK | 延迟: {latency}ms | avg: {current_latency}ms | 成功率: {rate:.1f}%")
            if len(messages) > 20:
                messages = messages[:2] + messages[-18:]  # 保持上下文但节省token
        else:
            failed += 1
            rate = (success / (success + failed)) * 100
            print(f"[{i:3d}/200] FAIL | 错误: {result[:50]} | 成功率: {rate:.1f}%")
        
        time.sleep(0.3)  # 避免请求过快
    
    print(f"\n[{'='*50}]")
    print(f"[完成] 成功: {success} | 失败: {failed} | 成功率: {(success/(success+failed))*100:.1f}%")
    if latencies:
        print(f"[延迟] 最小: {min(latencies)}ms | 最大: {max(latencies)}ms | 平均: {sum(latencies)//len(latencies)}ms")
    print(f"[{'='*50}]")
    
    return success, failed

if __name__ == "__main__":
    run_test()
