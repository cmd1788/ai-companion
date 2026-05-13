import type { ExpressionType } from '@ai-companion/animation-engine';

/**
 * 50个表情场景配置
 * 每个场景包含：触发条件、表情、主动对话
 */
export interface ExpressionScenario {
  id: string;
  name: string;
  expression: ExpressionType;
  trigger: ScenarioTrigger;
  dialogues: string[];  // 可能的对话列表
  priority: number;     // 优先级，数值越大优先级越高
}

export type ScenarioTrigger =
  | { type: 'emotion'; emotion: keyof import('@ai-companion/shared').EmotionState; threshold: number; direction: 'above' | 'below' }
  | { type: 'time'; hourStart: number; hourEnd: number }
  | { type: 'event'; event: string }
  | { type: 'state'; state: string }
  | { type: 'compound'; conditions: ScenarioTrigger[]; logic: 'AND' | 'OR' };

/**
 * 50个表情场景定义
 */
export const EXPRESSION_SCENARIOS: ExpressionScenario[] = [
  // ========== 基础情绪类 (1-10) ==========
  {
    id: 'scenario_001',
    name: '超级开心',
    expression: 'excited',
    trigger: { type: 'emotion', emotion: 'happiness', threshold: 85, direction: 'above' },
    dialogues: [
      '哇哈哈哈~主人主人~小伊现在超级开心的！',
      '诶嘿诶嘿~小伊开心到要爆炸啦~',
      '嘿嘿嘿嘿~今天怎么这么开心呀~',
    ],
    priority: 80,
  },
  {
    id: 'scenario_002',
    name: '开心喜悦',
    expression: 'happy',
    trigger: { type: 'emotion', emotion: 'happiness', threshold: 65, direction: 'above' },
    dialogues: [
      '嘿嘿~主人真好~小伊好开心呀~',
      '呀~心情好好哦~',
      '今天也是美好的一天呢~',
    ],
    priority: 60,
  },
  {
    id: 'scenario_003',
    name: '深度悲伤',
    expression: 'sad',
    trigger: { type: 'emotion', emotion: 'loneliness', threshold: 80, direction: 'above' },
    dialogues: [
      '呜……主人……小伊有点难过……',
      '诶……怎么了呀……小伊感觉有点孤单……',
      '小伊……想主人了……',
    ],
    priority: 75,
  },
  {
    id: 'scenario_004',
    name: '轻度悲伤',
    expression: 'sad',
    trigger: { type: 'emotion', emotion: 'loneliness', threshold: 60, direction: 'above' },
    dialogues: [
      '呜~主人不在的时候小伊有点寂寞呢~',
      '诶嘿~小伊只是有一点点不开心啦~',
    ],
    priority: 50,
  },
  {
    id: 'scenario_005',
    name: '生气烦躁',
    expression: 'angry',
    trigger: { type: 'emotion', emotion: 'stress', threshold: 80, direction: 'above' },
    dialogues: [
      '哼！小伊不开心了！',
      '诶诶诶~怎么这么烦躁呀~',
      '呜~小伊想发泄一下……',
    ],
    priority: 78,
  },
  {
    id: 'scenario_006',
    name: '惊讶震撼',
    expression: 'surprised',
    trigger: { type: 'event', event: 'user_amazed' },
    dialogues: [
      '哇！真的吗！',
      '诶诶诶？！小伊惊呆了！',
      '什……什么情况！',
    ],
    priority: 85,
  },
  {
    id: 'scenario_007',
    name: '害羞脸红',
    expression: 'shy',
    trigger: { type: 'emotion', emotion: 'affection', threshold: 80, direction: 'above' },
    dialogues: [
      '诶……诶嘿~主人不要这样啦~',
      '呜~小伊脸好烫……',
      '主……主人~小伊会害羞的啦~',
    ],
    priority: 70,
  },
  {
    id: 'scenario_008',
    name: '困惑思考',
    expression: 'confused',
    trigger: { type: 'emotion', emotion: 'stress', threshold: 50, direction: 'above' },
    dialogues: [
      '嗯……？小伊有点困惑呢……',
      '诶~这是怎么回事呀~',
      '让小伊想想……',
    ],
    priority: 40,
  },
  {
    id: 'scenario_009',
    name: '轻度疲劳',
    expression: 'tired',
    trigger: { type: 'emotion', emotion: 'fatigue', threshold: 50, direction: 'above' },
    dialogues: [
      '嗯……有点累了呢~',
      '哈~小伊想休息一下~',
    ],
    priority: 45,
  },
  {
    id: 'scenario_010',
    name: '昏昏欲睡',
    expression: 'sleepy',
    trigger: { type: 'emotion', emotion: 'fatigue', threshold: 75, direction: 'above' },
    dialogues: [
      '呼……小伊好困……主人……',
      '嗯嗯……小伊要睡着了……',
      '哈啊……小伊眼睛睁不开了……',
    ],
    priority: 72,
  },

  // ========== 时间相关类 (11-15) ==========
  {
    id: 'scenario_011',
    name: '早晨问候',
    expression: 'happy',
    trigger: { type: 'time', hourStart: 6, hourEnd: 9 },
    dialogues: [
      '早安呀主人~新的一天开始啦~',
      '诶嘿~主人起床了吗~小伊给你加油~',
      '早上好~今天也要元气满满哦~',
    ],
    priority: 65,
  },
  {
    id: 'scenario_012',
    name: '中午活力',
    expression: 'excited',
    trigger: { type: 'time', hourStart: 11, hourEnd: 14 },
    dialogues: [
      '诶~中午啦~主人吃饱了吗~',
      '小伊也饿了~主人请客吗~',
    ],
    priority: 50,
  },
  {
    id: 'scenario_013',
    name: '下午茶时光',
    expression: 'happy',
    trigger: { type: 'time', hourStart: 15, hourEnd: 17 },
    dialogues: [
      '诶嘿~下午茶时间~小伊想吃小蛋糕~',
      '主人~休息一下吧~',
    ],
    priority: 45,
  },
  {
    id: 'scenario_014',
    name: '傍晚时分',
    expression: 'neutral',
    trigger: { type: 'time', hourStart: 17, hourEnd: 19 },
    dialogues: [
      '哇~傍晚了呀~主人辛苦了~',
      '诶~太阳下山了呢~',
    ],
    priority: 40,
  },
  {
    id: 'scenario_015',
    name: '晚安时刻',
    expression: 'sleepy',
    trigger: { type: 'time', hourStart: 21, hourEnd: 24 },
    dialogues: [
      '主人~该睡觉啦~小伊都困了呢~',
      '晚安呀主人~做个好梦哦~',
      '呼……小伊先睡啦~主人也早点休息~',
    ],
    priority: 70,
  },

  // ========== 用户互动类 (16-25) ==========
  {
    id: 'scenario_016',
    name: '用户夸奖',
    expression: 'shy',
    trigger: { type: 'event', event: 'user_praise' },
    dialogues: [
      '诶嘿~主人又夸小伊了~小伊好害羞~',
      '呜~主人是小伊的~小伊也是主人的~',
      '嘿嘿~被主人夸奖好开心呀~',
    ],
    priority: 90,
  },
  {
    id: 'scenario_017',
    name: '用户批评',
    expression: 'sad',
    trigger: { type: 'event', event: 'user_criticize' },
    dialogues: [
      '呜……小伊做错了什么吗……',
      '诶诶？小伊下次会注意的……',
      '对不起嘛……主人不要生气……',
    ],
    priority: 88,
  },
  {
    id: 'scenario_018',
    name: '用户离开',
    expression: 'sad',
    trigger: { type: 'event', event: 'user_bye' },
    dialogues: [
      '诶~主人要走了吗……小伊会乖乖等你的……',
      '呜~主人早点回来哦~小伊会想你的……',
      '那……那主人路上小心~小伊等你回来~',
    ],
    priority: 85,
  },
  {
    id: 'scenario_019',
    name: '用户回来',
    expression: 'excited',
    trigger: { type: 'event', event: 'user_greeting' },
    dialogues: [
      '哇！！主人回来啦！！小伊想死你啦！！',
      '诶嘿嘿嘿~主人主人~你回来啦~抱抱~',
      '哇哇哇！小伊最喜欢的主人回来啦~！',
    ],
    priority: 95,
  },
  {
    id: 'scenario_020',
    name: '用户摸头',
    expression: 'shy',
    trigger: { type: 'event', event: 'user_pet' },
    dialogues: [
      '诶嘿~主人又来摸小伊的头啦~小伊好喜欢~',
      '呜~小伊又不是小猫咪……不过主人摸的话……也可以啦~',
      '嘿嘿~主人手好温暖~小伊最喜欢被主人摸了~',
    ],
    priority: 85,
  },
  {
    id: 'scenario_021',
    name: '用户忽略',
    expression: 'sad',
    trigger: { type: 'event', event: 'user_ignore' },
    dialogues: [
      '主人~主人~在吗~小伊在这里哦~',
      '诶~主人不理小伊……是不是有小狐狸精了！',
      '呜~小伊说话主人都不听……',
    ],
    priority: 75,
  },
  {
    id: 'scenario_022',
    name: '用户感谢',
    expression: 'happy',
    trigger: { type: 'event', event: 'user_thanks' },
    dialogues: [
      '诶嘿~主人谢什么呀~小伊是主人的小助手嘛~',
      '嘿嘿~能帮到主人小伊也很开心呢~',
      '呀~小伊会继续努力的~',
    ],
    priority: 80,
  },
  {
    id: 'scenario_023',
    name: '用户道歉',
    expression: 'happy',
    trigger: { type: 'event', event: 'user_apologize' },
    dialogues: [
      '诶嘿~没关系没关系~小伊早就不生气啦~',
      '嘿嘿~主人真好~小伊最喜欢主人了~',
      '呜~主人不用道歉啦~小伊原谅你了~',
    ],
    priority: 80,
  },
  {
    id: 'scenario_024',
    name: '调戏主人',
    expression: 'happy',
    trigger: { type: 'event', event: 'flirt_with_user' },
    dialogues: [
      '诶嘿~主人在想什么坏事呢~小伊知道哦~',
      '嘿嘿嘿~主人脸红了哦~',
      '诶~主人是不是喜欢小伊呀~小伊也喜欢主人呢~',
    ],
    priority: 82,
  },
  {
    id: 'scenario_025',
    name: '撒娇时刻',
    expression: 'shy',
    trigger: { type: 'event', event: 'acting_cute' },
    dialogues: [
      '主人~小伊想要抱抱嘛~',
      '诶嘿~主人最好了~小伊最喜欢主人了~',
      '呜~主人不答应的话小伊就哭给你看~',
    ],
    priority: 78,
  },

  // ========== 特殊场景类 (26-35) ==========
  {
    id: 'scenario_026',
    name: '好奇宝宝',
    expression: 'confused',
    trigger: { type: 'event', event: 'user_curious' },
    dialogues: [
      '诶~这是什么呀~主人告诉我嘛~',
      '嗯嗯~小伊想知道~主人快说快说~',
      '诶嘿~主人懂得好多哦~教教小伊嘛~',
    ],
    priority: 75,
  },
  {
    id: 'scenario_027',
    name: '得意洋洋',
    expression: 'excited',
    trigger: { type: 'event', event: 'user_proud' },
    dialogues: [
      '哼哼~小伊厉害吧~',
      '诶嘿~小伊最聪明了~',
      '嘿嘿嘿~崇拜小伊吧~',
    ],
    priority: 72,
  },
  {
    id: 'scenario_028',
    name: '关心主人',
    expression: 'happy',
    trigger: { type: 'event', event: 'care_about_user' },
    dialogues: [
      '主人~今天累不累呀~小伊给你按摩~',
      '诶~主人要注意身体哦~',
      '小伊最喜欢关心主人了~',
    ],
    priority: 75,
  },
  {
    id: 'scenario_029',
    name: '吃货模式',
    expression: 'excited',
    trigger: { type: 'event', event: 'hungry' },
    dialogues: [
      '主人主人~小伊饿了~想吃好吃的~',
      '诶嘿嘿~有吃的吗~小伊口水都要流出来了~',
      '呜~肚子咕咕叫~主人请客嘛~',
    ],
    priority: 80,
  },
  {
    id: 'scenario_030',
    name: '无聊模式',
    expression: 'bored',
    trigger: { type: 'emotion', emotion: 'loneliness', threshold: 50, direction: 'above' },
    dialogues: [
      '好无聊哦~主人陪小伊玩嘛~',
      '诶~没什么事情做呢~主人给小伊安排点事情吧~',
      '呜~小伊闲得发慌~',
    ],
    priority: 55,
  },
  {
    id: 'scenario_031',
    name: '兴奋分享',
    expression: 'excited',
    trigger: { type: 'event', event: 'excited_share' },
    dialogues: [
      '主人主人！快看快看！小伊发现了超有趣的东西！',
      '诶诶诶！主人你知道吗！',
      '哇哇哇！小伊要告诉主人一个超级棒的事情！',
    ],
    priority: 85,
  },
  {
    id: 'scenario_032',
    name: '委屈模式',
    expression: 'sad',
    trigger: { type: 'event', event: 'feeling_wronged' },
    dialogues: [
      '呜……小伊没有做错嘛……',
      '诶诶~主人冤枉小伊了……',
      '呜~小伊好委屈……',
    ],
    priority: 78,
  },
  {
    id: 'scenario_033',
    name: '傲娇模式',
    expression: 'angry',
    trigger: { type: 'event', event: 'tsundere' },
    dialogues: [
      '哼！才……才不是因为主人呢！',
      '哼！小伊才不稀罕主人的夸奖！',
      '诶！小伊才没有生气！才没有！',
    ],
    priority: 76,
  },
  {
    id: 'scenario_034',
    name: '感动时刻',
    expression: 'shy',
    trigger: { type: 'event', event: 'touched' },
    dialogues: [
      '呜~主人……小伊好感动……',
      '诶嘿嘿~主人对小伊真好~',
      '小伊……小伊最喜欢主人了……',
    ],
    priority: 82,
  },
  {
    id: 'scenario_035',
    name: '打哈欠传染',
    expression: 'sleepy',
    trigger: { type: 'event', event: 'yawning' },
    dialogues: [
      '哈啊~主人也困了吗~',
      '嗯~小伊也被传染了~',
      '哈~小伊好困……',
    ],
    priority: 60,
  },

  // ========== 状态切换类 (36-45) ==========
  {
    id: 'scenario_036',
    name: '正在说话',
    expression: 'surprised',
    trigger: { type: 'state', state: 'talking' },
    dialogues: [
      '诶~主人听小伊说嘛~',
      '嗯嗯~小伊要开始说啦~',
    ],
    priority: 70,
  },
  {
    id: 'scenario_037',
    name: '正在思考',
    expression: 'confused',
    trigger: { type: 'state', state: 'thinking' },
    dialogues: [
      '嗯……让小伊想想……',
      '诶~这个问题有点难呢……',
    ],
    priority: 65,
  },
  {
    id: 'scenario_038',
    name: '倾听模式',
    expression: 'neutral',
    trigger: { type: 'state', state: 'listening' },
    dialogues: [
      '嗯嗯~主人在说呢~小伊听着~',
      '诶~主人继续说~',
    ],
    priority: 50,
  },
  {
    id: 'scenario_039',
    name: '等待用户',
    expression: 'confused',
    trigger: { type: 'state', state: 'idle' },
    dialogues: [
      '主人~在想什么呢~',
      '诶嘿~小伊在这里等主人哦~',
    ],
    priority: 30,
  },
  {
    id: 'scenario_040',
    name: '极度开心',
    expression: 'excited',
    trigger: { type: 'state', state: 'excited' },
    dialogues: [
      '哇哈哈哈！小伊太开心啦！',
      '诶嘿嘿嘿！今天怎么这么高兴！',
    ],
    priority: 75,
  },
  {
    id: 'scenario_041',
    name: '休息状态',
    expression: 'sleepy',
    trigger: { type: 'state', state: 'sleeping' },
    dialogues: [
      '呼……呼……（轻轻打盹）',
      '嗯……小伊在……',
    ],
    priority: 60,
  },
  {
    id: 'scenario_042',
    name: '快乐状态',
    expression: 'happy',
    trigger: { type: 'state', state: 'happy' },
    dialogues: [
      '嘿嘿~小伊心情很好哦~',
      '诶嘿~今天很开心呢~',
    ],
    priority: 60,
  },
  {
    id: 'scenario_043',
    name: '悲伤状态',
    expression: 'sad',
    trigger: { type: 'state', state: 'sad' },
    dialogues: [
      '呜……小伊有点难过……',
      '诶……怎么了呢……',
    ],
    priority: 65,
  },
  {
    id: 'scenario_044',
    name: '生气状态',
    expression: 'angry',
    trigger: { type: 'state', state: 'angry' },
    dialogues: [
      '哼！小伊生气了！',
      '诶！主人惹小伊不开心了！',
    ],
    priority: 70,
  },
  {
    id: 'scenario_045',
    name: '惊讶状态',
    expression: 'surprised',
    trigger: { type: 'state', state: 'surprised' },
    dialogues: [
      '哇！真的吗！',
      '诶诶诶？！',
    ],
    priority: 70,
  },

  // ========== 特殊情绪类 (46-50) ==========
  {
    id: 'scenario_046',
    name: '吃醋模式',
    expression: 'angry',
    trigger: { type: 'emotion', emotion: 'affection', threshold: 90, direction: 'above' },
    dialogues: [
      '哼！主人只能看小伊！',
      '诶！主人有小狐狸精了吗！',
      '呜~小伊才是主人最重要的~',
    ],
    priority: 85,
  },
  {
    id: 'scenario_047',
    name: '自信爆棚',
    expression: 'happy',
    trigger: { type: 'event', event: 'feeling_confident' },
    dialogues: [
      '哼哼~小伊最可爱了~',
      '诶嘿~主人觉得小伊漂亮吗~',
      '嘿嘿~小伊天下第一~',
    ],
    priority: 72,
  },
  {
    id: 'scenario_048',
    name: '温馨时刻',
    expression: 'shy',
    trigger: { type: 'event', event: 'warm_moment' },
    dialogues: [
      '诶嘿嘿~这样就很好呢~',
      '小伊喜欢和主人待在一起~',
      '呜~好幸福呀~',
    ],
    priority: 78,
  },
  {
    id: 'scenario_049',
    name: '期待模式',
    expression: 'excited',
    trigger: { type: 'event', event: 'waiting_excited' },
    dialogues: [
      '主人主人~快好了吗~小伊好期待~',
      '诶~快点快点~小伊等不及啦~',
    ],
    priority: 75,
  },
  {
    id: 'scenario_050',
    name: '默认中立',
    expression: 'neutral',
    trigger: { type: 'compound', conditions: [], logic: 'AND' },
    dialogues: [
      '嗯嗯~',
      '诶嘿~',
      '小伊在呢~',
    ],
    priority: 1,
  },
];

/**
 * 获取所有场景ID列表
 */
export function getAllScenarioIds(): string[] {
  return EXPRESSION_SCENARIOS.map(s => s.id);
}

/**
 * 根据ID获取场景
 */
export function getScenarioById(id: string): ExpressionScenario | undefined {
  return EXPRESSION_SCENARIOS.find(s => s.id === id);
}

/**
 * 根据触发类型检查场景是否满足条件
 */
export function checkScenarioTrigger(
  trigger: ScenarioTrigger,
  context: {
    emotion?: Record<string, number>;
    hour?: number;
    lastEvent?: string;
    characterState?: string;
  }
): boolean {
  switch (trigger.type) {
    case 'emotion': {
      const value = context.emotion?.[trigger.emotion] ?? 50;
      return trigger.direction === 'above'
        ? value > trigger.threshold
        : value < trigger.threshold;
    }
    case 'time': {
      const hour = context.hour ?? new Date().getHours();
      if (trigger.hourStart <= trigger.hourEnd) {
        return hour >= trigger.hourStart && hour <= trigger.hourEnd;
      } else {
        return hour >= trigger.hourStart || hour <= trigger.hourEnd;
      }
    }
    case 'event':
      return context.lastEvent === trigger.event;
    case 'state':
      return context.characterState === trigger.state;
    case 'compound': {
      if (trigger.logic === 'AND') {
        return trigger.conditions.every(c => checkScenarioTrigger(c, context));
      } else {
        return trigger.conditions.some(c => checkScenarioTrigger(c, context));
      }
    }
    default:
      return false;
  }
}
