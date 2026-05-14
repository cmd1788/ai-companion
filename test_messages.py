"""AI Companion 200条消息压力测试"""
import asyncio
import httpx
import time
import json
from datetime import datetime

API_KEY = 'sk-cp-eZ_KsU3aRH1rcNGPfFlBdIyFqLt4wfIZm9LgQ8dyHJEjUFXBwfqGjbK9Ne7sBIVGpoiR6okgH-SDRbSelgVtsNTaT3wUkTY5ox8TS-EWyRaDFc9a_uj1TKY'
BASE_URL = 'https://api.minimax.chat/v1/text/chatcompletion_v2'
MODEL = 'MiniMax-M2.7-highspeed'

# 测试消息池
test_messages = [
    "你好呀小伊",
    "今天天气怎么样？",
    "给我讲个故事吧",
    "你喜欢吃什么？",
    "你多大了？",
    "你会唱歌吗？",
    "教我一个小知识",
    "给我讲个笑话",
    "你在干什么？",
    "你好可爱呀",
    "抱抱",
    "摸摸头",
    "乖",
    "么么哒",
    "爱你哟",
    "心情不好",
    "有点累",
    "无聊",
    "开心",
    "压力大",
    "工作好累",
    "学习好难",
    "肚子饿了",
    "晚安",
    "早上好",
    "中午好",
    "下午好",
    "晚上好",
    "今天做了什么？",
    "有什么有趣的事吗？",
    "你会什么技能？",
    "能不能帮我",
    "给我推荐首歌",
    "推荐部电影",
    "推荐本书",
    "旅游去哪里好",
    "养宠物好吗",
    "养猫还是养狗",
    "做饭简单吗",
    "怎么学编程",
    "学英语的方法",
    "健身计划",
    "早起的方法",
    "睡眠不好怎么办",
    "减肥方法",
    "皮肤保养",
    "化妆技巧",
    "穿搭建议",
    "理财知识",
    "投资建议",
    "买房还是租房",
    "创业经历",
    "职场建议",
    "人际关系",
    "朋友吵架了",
    "和好方法",
    "约会建议",
    "表白技巧",
    "恋爱问题",
    "婚姻建议",
    "单身好吗",
    "养孩子辛苦吗",
    "教育问题",
    "学区房",
    "疫苗接种",
    "体检重要吗",
    "医疗保险",
    "看病经验",
    "中医还是西医",
    "保健品有用吗",
    "维生素补充",
    "喝水重要性",
    "运动好处",
    "跑步技巧",
    "游泳好处",
    "瑜伽入门",
    "冥想方法",
    "读书笔记",
    "学习方法",
    "记忆力提升",
    "专注力训练",
    "时间管理",
    "效率提升",
    "拖延症克服",
    "目标设定",
    "计划制定",
    "习惯养成",
    "自律方法",
    "情绪管理",
    "压力释放",
    "焦虑缓解",
    "自信心建立",
    "表达能力",
    "沟通技巧",
    "演讲方法",
    "写作技巧",
    "阅读速度",
    "单词记忆",
    "语法学习",
    "听力训练",
    "口语练习",
    "写作模板",
    "论文写作",
    "考试技巧",
    "考研经验",
    "留学申请",
    "奖学金申请",
    "实习经历",
    "秋招春招",
    "简历优化",
    "面试技巧",
    "职场晋升",
    "工资谈判",
    "离职注意",
    "社保知识",
    "个税计算",
    "发票报销",
    "合同注意",
    "法律常识",
    "维权方法",
    "投诉渠道",
    "网购经验",
    "快递丢失",
    "退货流程",
    "真假辨别",
    "品牌推荐",
    "平价替代",
    "购物节攻略",
    "省钱技巧",
    "信用卡使用",
    "积分兑换",
    "会员权益",
    "手机选购",
    "电脑配置",
    "网络知识",
    "WiFi设置",
    "路由器推荐",
    "智能家居",
    "智能音箱",
    "耳机推荐",
    "键盘鼠标",
    "移动硬盘",
    "数据备份",
    "文件同步",
    "密码管理",
    "账号安全",
    "防诈骗",
    "隐私保护",
    "杀毒软件",
    "系统重装",
    "office技巧",
    "Excel公式",
    "PPT制作",
    "Word技巧",
    "PDF编辑",
    "图片处理",
    "视频剪辑",
    "音频编辑",
    "编程语言",
    "Python入门",
    "JavaScript",
    "前端后端",
    "数据库",
    "服务器",
    "云计算",
    "AI人工智能",
    "区块链",
    "元宇宙",
    "5G时代",
    "物联网",
    "大数据",
    "网络安全",
    "黑客攻击",
    "加密货币",
    "NFT是什么",
    "虚拟现实",
    "增强现实",
    "3D打印",
    "无人机",
    "自动驾驶",
    "机器人",
    "新能源",
    "电动汽车",
    "太阳能",
    "核能",
    "风能",
    "水力发电",
    "碳中和",
    "环保生活",
    "垃圾分类",
    "塑料污染",
    "水资源",
    "森林保护",
    "动物福利",
    "濒危物种",
    "气候变化",
    "自然灾害",
    "地震逃生",
    "火灾逃生",
    "洪水自救",
    "台风避险",
    "雷电安全",
]

# 记忆测试消息
memory_test_messages = [
    "我叫张三，是一名程序员",
    "我今年28岁",
    "我住在上海",
    "我喜欢打篮球",
    "我养了一只猫叫咪咪",
    "我最喜欢的颜色是蓝色",
    "我擅长Python编程",
    "我不吃香菜",
    "我对海鲜过敏",
    "我的生日是6月15日",
    "我血型是O型",
    "我喜欢喝咖啡",
    "我不抽烟",
    "我每周健身三次",
    "我喜欢看科幻电影",
    "我讨厌下雨天",
    "我会弹吉他",
    "我说英语和中文",
    "我去过日本旅游",
    "我最爱的食物是火锅",
]

async def send_message(msg: str, history: list) -> str:
    """发送消息并获取回复"""
    messages = [{"role": "system", "content": "你是小伊，一个可爱活泼的AI助手。"}] + history + [{"role": "user", "content": msg}]
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            response = await client.post(
                BASE_URL,
                headers={
                    'Content-Type': 'application/json',
                    'Authorization': f'Bearer {API_KEY}',
                },
                json={
                    'model': MODEL,
                    'messages': messages,
                    'max_tokens': 200,
                    'temperature': 0.8,
                }
            )
            if response.status_code == 200:
                data = response.json()
                return data['choices'][0]['message']['content']
            else:
                return f"Error: {response.status_code}"
        except Exception as e:
            return f"Exception: {e}"

async def main():
    print(f"开始测试: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 50)
    
    history = []
    success_count = 0
    error_count = 0
    total_messages = 200
    
    # 消息池循环使用
    msg_pool = test_messages + memory_test_messages
    
    for i in range(total_messages):
        msg = msg_pool[i % len(msg_pool)]
        
        # 添加记忆测试消息
        if i < len(memory_test_messages):
            history.append({"role": "user", "content": memory_test_messages[i]})
        
        print(f"[{i+1}/200] 发送: {msg[:30]}...")
        
        reply = await send_message(msg, history)
        history.append({"role": "assistant", "content": reply})
        
        if reply.startswith("Error") or reply.startswith("Exception"):
            error_count += 1
            print(f"  ❌ 失败: {reply[:50]}...")
        else:
            success_count += 1
            print(f"  ✅ 回复: {reply[:50]}...")
        
        # 每20条输出一次进度
        if (i + 1) % 20 == 0:
            print(f"\n进度: {i+1}/200 | 成功: {success_count} | 失败: {error_count}")
            print("-" * 50)
        
        # 添加延迟避免限流
        if (i + 1) % 50 == 0:
            await asyncio.sleep(5)
        else:
            await asyncio.sleep(1)
    
    print("\n" + "=" * 50)
    print(f"测试完成: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"总计: {total_messages} | 成功: {success_count} | 失败: {error_count}")
    print(f"成功率: {success_count/total_messages*100:.1f}%")
    
    # 保存测试日志
    log_file = f"D:/AI文件/hermes_file/log/test_log_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
    try:
        with open(log_file, 'w', encoding='utf-8') as f:
            f.write(f"AI Companion 200条消息测试\n")
            f.write(f"时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"成功: {success_count} | 失败: {error_count}\n")
            f.write(f"成功率: {success_count/total_messages*100:.1f}%\n")
            f.write("=" * 50 + "\n")
            for j, (user_msg, assistant_reply) in enumerate(zip(msg_pool[:len(history)//2], [h['content'] for h in history if h['role']=='assistant'])):
                f.write(f"\n[{j+1}] 用户: {user_msg}\n")
                f.write(f"    AI: {assistant_reply[:100]}...\n")
        print(f"日志已保存: {log_file}")
    except Exception as e:
        print(f"日志保存失败: {e}")

if __name__ == "__main__":
    asyncio.run(main())
