import { Definition, DictionaryEntry } from "../../types/models";
import { createId, nowIso } from "../../utils/id";
import { normalizeHeadword } from "../../utils/text";

type CommonDictionaryWord = {
  word: string;
  phonetic?: string;
  pos?: string;
  translation: string;
};

const SOURCE_NAME = "常用中英词库";

const COMMON_ROWS = [
  "a|ə|art.|art. 一个；某一；任一",
  "about|əˈbaʊt|prep./adv.|prep. 关于；大约\\nadv. 大约；附近",
  "above|əˈbʌv|prep./adv.|prep. 在……上方\\nadv. 在上面",
  "across|əˈkrɒs|prep./adv.|prep. 穿过；横过\\nadv. 横过",
  "act|ækt|n./v.|n. 行为；法案\\nv. 行动；表演",
  "activity|ækˈtɪvəti|n.|n. 活动；活跃",
  "actually|ˈæktʃuəli|adv.|adv. 实际上；事实上",
  "after|ˈɑːftə|prep./conj./adv.|prep. 在……之后\\nconj. 在……以后\\nadv. 之后",
  "again|əˈɡen|adv.|adv. 再次；又一次",
  "against|əˈɡenst|prep.|prep. 反对；倚着；对抗",
  "age|eɪdʒ|n./v.|n. 年龄；时代\\nv. 变老",
  "air|eə|n.|n. 空气；天空；气氛",
  "all|ɔːl|det./pron./adv.|det. 全部的\\npron. 全部\\nadv. 完全",
  "almost|ˈɔːlməʊst|adv.|adv. 几乎；差不多",
  "alone|əˈləʊn|adj./adv.|adj. 单独的\\nadv. 独自地",
  "along|əˈlɒŋ|prep./adv.|prep. 沿着\\nadv. 向前；一起",
  "already|ɔːlˈredi|adv.|adv. 已经",
  "also|ˈɔːlsəʊ|adv.|adv. 也；而且",
  "always|ˈɔːlweɪz|adv.|adv. 总是；一直",
  "another|əˈnʌðə|det./pron.|det. 另一个\\npron. 另一个",
  "any|ˈeni|det./pron.|det. 任何的\\npron. 任何一个",
  "anything|ˈeniθɪŋ|pron.|pron. 任何事物",
  "area|ˈeəriə|n.|n. 区域；面积；领域",
  "around|əˈraʊnd|prep./adv.|prep. 在……周围\\nadv. 周围；大约",
  "arrive|əˈraɪv|v.|v. 到达；抵达",
  "article|ˈɑːtɪkl|n.|n. 文章；物品；冠词",
  "as|æz|prep./conj./adv.|prep. 作为\\nconj. 当……时；因为\\nadv. 同样地",
  "at|ət|prep.|prep. 在；以；向",
  "away|əˈweɪ|adv.|adv. 离开；远离",
  "back|bæk|n./adv./adj./v.|n. 背部；后面\\nadv. 回来；向后\\nadj. 后面的\\nv. 支持",
  "base|beɪs|n./v.|n. 基础；基地\\nv. 以……为基础",
  "because|bɪˈkɒz|conj.|conj. 因为",
  "become|bɪˈkʌm|v.|v. 成为；变得",
  "before|bɪˈfɔː|prep./conj./adv.|prep. 在……之前\\nconj. 在……以前\\nadv. 以前",
  "begin|bɪˈɡɪn|v.|v. 开始",
  "behind|bɪˈhaɪnd|prep./adv.|prep. 在……后面\\nadv. 在后面",
  "believe|bɪˈliːv|v.|v. 相信；认为",
  "between|bɪˈtwiːn|prep.|prep. 在……之间",
  "big|bɪɡ|adj.|adj. 大的；重要的",
  "bit|bɪt|n.|n. 一点；少量；比特",
  "body|ˈbɒdi|n.|n. 身体；主体；正文",
  "both|bəʊθ|det./pron.|det. 两者都\\npron. 两者",
  "break|breɪk|v./n.|v. 打破；中断\\nn. 休息；裂缝",
  "bring|brɪŋ|v.|v. 带来；拿来",
  "business|ˈbɪznəs|n.|n. 商业；业务；事情",
  "call|kɔːl|v./n.|v. 打电话；称呼\\nn. 电话；呼叫",
  "care|keə|n./v.|n. 照顾；关心\\nv. 关心；在意",
  "case|keɪs|n.|n. 情况；案例；盒子",
  "cause|kɔːz|n./v.|n. 原因；事业\\nv. 导致；引起",
  "center|ˈsentə|n./v.|n. 中心；中央\\nv. 使集中",
  "certain|ˈsɜːtn|adj.|adj. 某个；确定的",
  "chance|tʃɑːns|n.|n. 机会；可能性",
  "clearer|ˈklɪərə|adj.|adj. 更清楚的；更明确的",
  "company|ˈkʌmpəni|n.|n. 公司；陪伴",
  "complete|kəmˈpliːt|adj./v.|adj. 完整的；完成的\\nv. 完成",
  "condition|kənˈdɪʃn|n.|n. 条件；状况",
  "control|kənˈtrəʊl|n./v.|n. 控制；管理\\nv. 控制；管理",
  "course|kɔːs|n.|n. 课程；过程；路线",
  "current|ˈkʌrənt|adj./n.|adj. 当前的；流行的\\nn. 水流；电流",
  "date|deɪt|n./v.|n. 日期；约会\\nv. 标日期；约会",
  "deal|diːl|n./v.|n. 交易；协议\\nv. 处理；分配",
  "decide|dɪˈsaɪd|v.|v. 决定；判断",
  "develop|dɪˈveləp|v.|v. 发展；开发；形成",
  "difference|ˈdɪfrəns|n.|n. 差异；不同",
  "direct|dəˈrekt|adj./v.|adj. 直接的\\nv. 指导；指向",
  "done|dʌn|adj.|adj. 完成的；做完的",
  "down|daʊn|adv./prep.|adv. 向下\\nprep. 沿着向下",
  "during|ˈdjʊərɪŋ|prep.|prep. 在……期间",
  "each|iːtʃ|det./pron.|det. 每个\\npron. 每个",
  "early|ˈɜːli|adj./adv.|adj. 早的\\nadv. 早地",
  "easy|ˈiːzi|adj.|adj. 容易的；轻松的",
  "either|ˈaɪðə|det./pron./adv.|det. 任一的\\npron. 任一\\nadv. 也",
  "else|els|adv.|adv. 其他；另外",
  "enough|ɪˈnʌf|det./pron./adv.|det. 足够的\\npron. 足够\\nadv. 足够地",
  "even|ˈiːvn|adv./adj.|adv. 甚至；更加\\nadj. 平坦的；均匀的",
  "ever|ˈevə|adv.|adv. 曾经；永远",
  "every|ˈevri|det.|det. 每一个；所有的",
  "everyone|ˈevriwʌn|pron.|pron. 每个人；人人",
  "everything|ˈevriθɪŋ|pron.|pron. 每件事；一切",
  "exact|ɪɡˈzækt|adj.|adj. 精确的；准确的",
  "family|ˈfæməli|n.|n. 家庭；家人",
  "far|fɑː|adv./adj.|adv. 远；很大程度上\\nadj. 远的",
  "feel|fiːl|v.|v. 感觉；觉得；触摸",
  "few|fjuː|det./pron.|det. 少数的\\npron. 少数",
  "field|fiːld|n.|n. 领域；田地；字段",
  "first|fɜːst|det./adv./n.|det. 第一的\\nadv. 首先\\nn. 第一",
  "follow|ˈfɒləʊ|v.|v. 跟随；遵循；理解",
  "form|fɔːm|n./v.|n. 形式；表格\\nv. 形成",
  "friend|frend|n.|n. 朋友",
  "from|frɒm|prep.|prep. 从；来自",
  "game|ɡeɪm|n.|n. 游戏；比赛",
  "general|ˈdʒenrəl|adj./n.|adj. 一般的；总体的\\nn. 将军",
  "get|ɡet|v.|v. 得到；变得；到达",
  "go|ɡəʊ|v.|v. 去；进行；运转",
  "group|ɡruːp|n./v.|n. 组；群体\\nv. 分组",
  "grow|ɡrəʊ|v.|v. 增长；生长；变得",
  "half|hɑːf|n./det.|n. 一半\\ndet. 半数的",
  "hand|hænd|n./v.|n. 手；指针\\nv. 递交",
  "happen|ˈhæpən|v.|v. 发生；碰巧",
  "hard|hɑːd|adj./adv.|adj. 困难的；硬的\\nadv. 努力地",
  "head|hed|n./v.|n. 头；负责人；标题\\nv. 朝……前进",
  "health|helθ|n.|n. 健康；卫生",
  "hear|hɪə|v.|v. 听见；听说",
  "here|hɪə|adv.|adv. 这里；在这里",
  "hold|həʊld|v./n.|v. 持有；握住；举行\\nn. 抓握",
  "hope|həʊp|n./v.|n. 希望\\nv. 希望",
  "hour|ˈaʊə|n.|n. 小时；钟点",
  "however|haʊˈevə|adv.|adv. 然而；不过",
  "human|ˈhjuːmən|adj./n.|adj. 人的；人类的\\nn. 人",
  "include|ɪnˈkluːd|v.|v. 包括；包含",
  "inside|ˌɪnˈsaɪd|prep./adv./n.|prep. 在……里面\\nadv. 在里面\\nn. 内部",
  "instead|ɪnˈsted|adv.|adv. 代替；反而",
  "interest|ˈɪntrəst|n./v.|n. 兴趣；利益；利息\\nv. 使感兴趣",
  "issue|ˈɪʃuː|n./v.|n. 问题；议题；期号\\nv. 发布；发行",
  "join|dʒɔɪn|v.|v. 加入；连接",
  "just|dʒʌst|adv./adj.|adv. 只是；刚刚\\nadj. 公正的",
  "keep|kiːp|v.|v. 保持；保存；继续",
  "kind|kaɪnd|n./adj.|n. 种类\\nadj. 友善的",
  "land|lænd|n./v.|n. 土地；陆地\\nv. 着陆",
  "last|lɑːst|adj./adv./v.|adj. 最后的\\nadv. 最后\\nv. 持续",
  "later|ˈleɪtə|adv.|adv. 后来；稍后",
  "left|left|adj./adv./n.|adj. 左边的；剩下的\\nadv. 向左\\nn. 左边",
  "less|les|det./adv.|det. 更少的\\nadv. 更少地",
  "level|ˈlevl|n./adj./v.|n. 水平；等级\\nadj. 平的\\nv. 使平整",
  "life|laɪf|n.|n. 生活；生命；人生",
  "line|laɪn|n./v.|n. 线；行；线路\\nv. 排队；排列",
  "little|ˈlɪtl|adj./det.|adj. 小的\\ndet. 少量的",
  "live|lɪv|v.|v. 生活；居住；直播",
  "long|lɒŋ|adj./adv.|adj. 长的；长期的\\nadv. 长久地",
  "main|meɪn|adj./n.|adj. 主要的\\nn. 主管道；主要部分",
  "many|ˈmeni|det./pron.|det. 许多\\npron. 许多人或物",
  "matter|ˈmætə|n./v.|n. 事情；物质；问题\\nv. 要紧；有关系",
  "may|meɪ|modal.|modal. 可能；可以",
  "mean|miːn|v./adj.|v. 意味着；意思是\\nadj. 吝啬的；平均的",
  "meet|miːt|v.|v. 遇见；满足；开会",
  "member|ˈmembə|n.|n. 成员；会员",
  "mind|maɪnd|n./v.|n. 头脑；思想\\nv. 介意；注意",
  "minute|ˈmɪnɪt|n.|n. 分钟；片刻",
  "moment|ˈməʊmənt|n.|n. 时刻；瞬间",
  "more|mɔː|det./adv./pron.|det. 更多的\\nadv. 更加\\npron. 更多",
  "morning|ˈmɔːnɪŋ|n.|n. 早晨；上午",
  "most|məʊst|det./adv./pron.|det. 最多的\\nadv. 最\\npron. 大多数",
  "much|mʌtʃ|det./adv./pron.|det. 许多\\nadv. 很；非常\\npron. 许多",
  "must|mʌst|modal.|modal. 必须；一定",
  "name|neɪm|n./v.|n. 名字；名称\\nv. 命名；说出",
  "near|nɪə|prep./adv./adj.|prep. 靠近\\nadv. 附近\\nadj. 近的",
  "never|ˈnevə|adv.|adv. 从不；绝不",
  "next|nekst|adj./adv.|adj. 下一个的\\nadv. 接着",
  "night|naɪt|n.|n. 夜晚；晚上",
  "nothing|ˈnʌθɪŋ|pron.|pron. 没有什么",
  "number|ˈnʌmbə|n./v.|n. 数字；号码；数量\\nv. 编号",
  "often|ˈɒfn|adv.|adv. 经常；常常",
  "once|wʌns|adv./conj.|adv. 一次；曾经\\nconj. 一旦",
  "only|ˈəʊnli|adv./adj.|adv. 只；仅仅\\nadj. 唯一的",
  "order|ˈɔːdə|n./v.|n. 顺序；订单；命令\\nv. 命令；订购",
  "other|ˈʌðə|adj./pron.|adj. 其他的\\npron. 其他人或物",
  "outside|ˌaʊtˈsaɪd|prep./adv./n.|prep. 在……外面\\nadv. 在外面\\nn. 外部",
  "over|ˈəʊvə|prep./adv.|prep. 在……上方；超过\\nadv. 结束；越过",
  "own|əʊn|adj./v.|adj. 自己的\\nv. 拥有",
  "part|pɑːt|n.|n. 部分；角色；零件",
  "party|ˈpɑːti|n.|n. 聚会；政党；一方",
  "past|pɑːst|n./adj./prep.|n. 过去\\nadj. 过去的\\nprep. 经过；超过",
  "point|pɔɪnt|n./v.|n. 点；观点；分数\\nv. 指向",
  "power|ˈpaʊə|n./v.|n. 力量；电力；权力\\nv. 驱动；供电",
  "present|ˈpreznt|adj./n./v.|adj. 现在的；出席的\\nn. 礼物；现在\\nv. 呈现；赠送",
  "probably|ˈprɒbəbli|adv.|adv. 可能；大概",
  "process|ˈprəʊses|n./v.|n. 过程；流程\\nv. 处理；加工",
  "program|ˈprəʊɡræm|n./v.|n. 程序；节目；计划\\nv. 编程；安排",
  "provide|prəˈvaɪd|v.|v. 提供；供应",
  "purpose|ˈpɜːpəs|n.|n. 目的；用途",
  "put|pʊt|v.|v. 放；放置；表达",
  "real|rɪəl|adj.|adj. 真实的；实际的",
  "reason|ˈriːzn|n./v.|n. 原因；理由\\nv. 推理；思考",
  "right|raɪt|adj./adv./n.|adj. 正确的；右边的\\nadv. 正确地；马上\\nn. 权利；右边",
  "run|rʌn|v./n.|v. 跑；运行；经营\\nn. 跑步；运行",
  "second|ˈsekənd|n./adj.|n. 秒；第二\\nadj. 第二的",
  "section|ˈsekʃn|n.|n. 部分；章节；区段",
  "seem|siːm|v.|v. 似乎；好像",
  "sense|sens|n./v.|n. 感觉；意义；道理\\nv. 感觉到",
  "set|set|n./v./adj.|n. 集合；套；设置\\nv. 设置；放置\\nadj. 固定的",
  "several|ˈsevrəl|det./pron.|det. 几个\\npron. 几个",
  "side|saɪd|n.|n. 边；侧面；一方",
  "since|sɪns|prep./conj./adv.|prep. 自从\\nconj. 因为；自从\\nadv. 此后",
  "size|saɪz|n./v.|n. 大小；尺寸\\nv. 确定大小",
  "social|ˈsəʊʃl|adj.|adj. 社会的；社交的",
  "some|sʌm|det./pron./adv.|det. 一些\\npron. 一些\\nadv. 大约",
  "someone|ˈsʌmwʌn|pron.|pron. 某人；有人",
  "something|ˈsʌmθɪŋ|pron.|pron. 某事；某物",
  "sometimes|ˈsʌmtaɪmz|adv.|adv. 有时",
  "space|speɪs|n.|n. 空间；太空；空格",
  "state|steɪt|n./v.|n. 状态；州；国家\\nv. 陈述；说明",
  "still|stɪl|adv./adj.|adv. 仍然；还\\nadj. 静止的",
  "story|ˈstɔːri|n.|n. 故事；楼层；报道",
  "such|sʌtʃ|det./pron.|det. 这样的\\npron. 这样的人或事",
  "sure|ʃʊə|adj.|adj. 确信的；可靠的",
  "table|ˈteɪbl|n.|n. 表格；桌子",
  "talk|tɔːk|v./n.|v. 谈话；讨论\\nn. 谈话；讲话",
  "than|ðæn|conj./prep.|conj. 比\\nprep. 比",
  "then|ðen|adv.|adv. 然后；当时",
  "there|ðeə|adv.|adv. 那里；存在",
  "thing|θɪŋ|n.|n. 事情；东西",
  "though|ðəʊ|conj./adv.|conj. 虽然；尽管\\nadv. 不过",
  "through|θruː|prep./adv.|prep. 穿过；通过\\nadv. 通过",
  "today|təˈdeɪ|n./adv.|n. 今天\\nadv. 今天",
  "together|təˈɡeðə|adv.|adv. 一起；同时",
  "tomorrow|təˈmɒrəʊ|n./adv.|n. 明天\\nadv. 明天",
  "too|tuː|adv.|adv. 也；太",
  "toward|təˈwɔːd|prep.|prep. 朝向；对于",
  "true|truː|adj.|adj. 真实的；正确的",
  "try|traɪ|v./n.|v. 尝试；试图\\nn. 尝试",
  "type|taɪp|n./v.|n. 类型；种类\\nv. 打字",
  "under|ˈʌndə|prep./adv.|prep. 在……下面\\nadv. 在下面",
  "until|ənˈtɪl|prep./conj.|prep. 直到\\nconj. 直到",
  "up|ʌp|adv./prep.|adv. 向上\\nprep. 沿着向上",
  "usually|ˈjuːʒuəli|adv.|adv. 通常",
  "value|ˈvæljuː|n./v.|n. 价值；数值\\nv. 重视；估价",
  "very|ˈveri|adv.|adv. 非常；很",
  "view|vjuː|n./v.|n. 视图；观点；景色\\nv. 查看；看待",
  "visit|ˈvɪzɪt|v./n.|v. 访问；参观\\nn. 访问；参观",
  "voice|vɔɪs|n.|n. 声音；语态；发言权",
  "walk|wɔːk|v./n.|v. 走路；步行\\nn. 步行；散步",
  "way|weɪ|n.|n. 方法；道路；方面",
  "whether|ˈweðə|conj.|conj. 是否；不管",
  "while|waɪl|conj./n.|conj. 当……时；虽然\\nn. 一会儿",
  "white|waɪt|adj./n.|adj. 白色的\\nn. 白色",
  "whole|həʊl|adj./n.|adj. 整个的；完整的\\nn. 整体",
  "why|waɪ|adv.|adv. 为什么",
  "within|wɪˈðɪn|prep.|prep. 在……之内",
  "without|wɪˈðaʊt|prep.|prep. 没有；不带",
  "woman|ˈwʊmən|n.|n. 女人；女性",
  "young|jʌŋ|adj.|adj. 年轻的；幼小的",
  "zero|ˈzɪərəʊ|n./num.|n. 零\\nnum. 零"
];

const COMMON_WORDS: CommonDictionaryWord[] = COMMON_ROWS.map(parseRow);
const COMMON_INDEX = new Map(COMMON_WORDS.map((entry) => [normalizeHeadword(entry.word), entry]));

export function lookupCommonEnglishChineseDictionary(text: string): DictionaryEntry | null {
  const normalized = normalizeHeadword(text);
  const entry = COMMON_INDEX.get(normalized);
  if (!entry) {
    return null;
  }

  const now = nowIso();
  return {
    id: `common_ec_${normalizeHeadword(entry.word)}`,
    headword: entry.word,
    normalizedHeadword: normalizeHeadword(entry.word),
    language: "en",
    phoneticUS: entry.phonetic ? withSlashes(entry.phonetic) : undefined,
    phoneticUK: entry.phonetic ? withSlashes(entry.phonetic) : undefined,
    definitions: buildDefinitions(entry),
    source: SOURCE_NAME,
    createdAt: now,
    updatedAt: now
  };
}

export function getCommonDictionaryHeadwords(): string[] {
  return COMMON_WORDS.map((entry) => entry.word);
}

function parseRow(row: string): CommonDictionaryWord {
  const [word, phonetic, pos, translation] = row.split("|");
  return {
    word,
    phonetic: phonetic || undefined,
    pos: pos || undefined,
    translation: (translation || "").replace(/\\n/g, "\n")
  };
}

function buildDefinitions(entry: CommonDictionaryWord): Definition[] {
  const lines = entry.translation.split("\n").map((line) => line.trim()).filter(Boolean);
  const definitions = lines.map((line) => {
    const match = line.match(/^([a-z]+(?:\.\/[a-z]+\.)?|[a-z]+\/[a-z]+\.|[a-z]+\.|modal\.)\s+(.+)$/i);
    return {
      id: createId("def"),
      partOfSpeech: match?.[1] ?? entry.pos,
      definitionZh: match?.[2] ?? line,
      source: SOURCE_NAME
    };
  });

  return definitions.length
    ? definitions
    : [{ id: createId("def"), partOfSpeech: entry.pos, definitionZh: entry.translation, source: SOURCE_NAME }];
}

function withSlashes(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) {
    return trimmed;
  }
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}/`;
}
