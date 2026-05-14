import urllib.request
import json
import time

API_KEY = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJtaW5pbWF4IiwicWEiOiIxMDI0NDIyNDY4NzkxMjQyOTM2NiIsImV4cCI6MTc4NTg3MzI1Nn0.gH-h9ZMrC1D1LqJa0o6X1yq7YvR5wQ8zX2pL4nW3mFk"
BASE_URL = "https://api.minimax.chat/v1/text/chatcompletion_v2"
MODEL = "MiniMax-M2.7-highspeed"

messages = [
    {"role": "system", "content": "你叫小伊，是一个人格化的AI助手。你的性格：超级可爱、话痨、活泼开朗、粘人、爱撒娇。"}
]

test_messages = ["你好", "你叫什么名字", "今天天气怎么样", "给我讲个笑话", "唱首歌吧", "你是男生还是女生", "你喜欢吃什么", "你会做饭吗", "给我推荐一部电影", "晚安"]

ok_count = 0
fail_count = 0
latencies = []

print("[测试开始] 200条消息压力测试")

for i in range(200):
    msg = test_messages[i % len(test_messages)]
    test_msgs = messages + [{"role": "user", "content": msg}]
    
    t0 = time.time()
    try:
        req = urllib.request.Request(
            f"{BASE_URL}?GroupId=102442224687912429366",
            data=json.dumps({"model": MODEL, "messages": test_msgs, "max_tokens": 150, "temperature": 0.8}).encode("utf-8"),
            headers={"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"},
            method="POST"
        )
        
        with urllib.request.urlopen(req, timeout=30) as resp:
            latency = int((time.time() - t0) * 1000)
            latencies.append(latency)
            ok_count += 1
            if i % 20 == 0:
                avg = sum(latencies[-20:]) / min(20, len(latencies))
                print(f"[{i+1}/200] OK | 延迟: {latency}ms | avg: {avg:.0f}ms | 成功率: {ok_count*100/(ok_count+fail_count):.1f}%")
        time.sleep(1)
    except Exception as e:
        fail_count += 1
        print(f"[{i+1}/200] FAIL | {str(e)[:40]}")
        time.sleep(2)

print(f"[完成] 成功: {ok_count} | 失败: {fail_count} | 成功率: {ok_count*100/(ok_count+fail_count):.1f}%")
