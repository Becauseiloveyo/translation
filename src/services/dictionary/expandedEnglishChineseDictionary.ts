import { Definition, DictionaryEntry } from "../../types/models";
import { createId, nowIso } from "../../utils/id";
import { normalizeHeadword } from "../../utils/text";

type ExpandedWord = {
  word: string;
  phonetic?: string;
  translation: string;
  definition?: string;
  pos?: string;
};

const SOURCE_NAME = "扩展中英词库";

const EXPANDED_WORDS: ExpandedWord[] = [
  { word: "time", phonetic: "taɪm", pos: "n./v.", translation: "n. 时间；次数；时代\nv. 安排时间；计时" },
  { word: "year", phonetic: "jɪə", pos: "n.", translation: "n. 年；年度；年龄" },
  { word: "day", phonetic: "deɪ", pos: "n.", translation: "n. 一天；白天；日子" },
  { word: "week", phonetic: "wiːk", pos: "n.", translation: "n. 星期；周" },
  { word: "month", phonetic: "mʌnθ", pos: "n.", translation: "n. 月；月份" },
  { word: "people", phonetic: "ˈpiːpl", pos: "n.", translation: "n. 人们；人民；民族" },
  { word: "person", phonetic: "ˈpɜːsn", pos: "n.", translation: "n. 人；个人" },
  { word: "child", phonetic: "tʃaɪld", pos: "n.", translation: "n. 儿童；孩子" },
  { word: "student", phonetic: "ˈstjuːdnt", pos: "n.", translation: "n. 学生" },
  { word: "teacher", phonetic: "ˈtiːtʃə", pos: "n.", translation: "n. 教师；老师" },
  { word: "school", phonetic: "skuːl", pos: "n./v.", translation: "n. 学校；学院\nv. 教育；训练" },
  { word: "class", phonetic: "klɑːs", pos: "n./v.", translation: "n. 班级；课程；类别\nv. 分类" },
  { word: "book", phonetic: "bʊk", pos: "n./v.", translation: "n. 书；本子；账簿\nv. 预订；登记" },
  { word: "page", phonetic: "peɪdʒ", pos: "n./v.", translation: "n. 页；页面\nv. 翻页；给……编号" },
  { word: "paper", phonetic: "ˈpeɪpə", pos: "n.", translation: "n. 纸；论文；报纸；试卷" },
  { word: "pen", phonetic: "pen", pos: "n.", translation: "n. 钢笔；笔" },
  { word: "exam", phonetic: "ɪɡˈzæm", pos: "n.", translation: "n. 考试；测验" },
  { word: "test", phonetic: "test", pos: "n./v.", translation: "n. 测试；考试；检验\nv. 测试；检验" },
  { word: "question", phonetic: "ˈkwestʃən", pos: "n./v.", translation: "n. 问题；疑问\nv. 询问；怀疑" },
  { word: "answer", phonetic: "ˈɑːnsə", pos: "n./v.", translation: "n. 答案；回答\nv. 回答；答复" },
  { word: "problem", phonetic: "ˈprɒbləm", pos: "n.", translation: "n. 问题；难题" },
  { word: "solution", phonetic: "səˈluːʃn", pos: "n.", translation: "n. 解决办法；答案；溶液" },
  { word: "idea", phonetic: "aɪˈdɪə", pos: "n.", translation: "n. 想法；主意；概念" },
  { word: "plan", phonetic: "plæn", pos: "n./v.", translation: "n. 计划；方案\nv. 计划；打算" },
  { word: "project", phonetic: "ˈprɒdʒekt", pos: "n./v.", translation: "n. 项目；工程；计划\nv. 投射；预计" },
  { word: "work", phonetic: "wɜːk", pos: "n./v.", translation: "n. 工作；作品\nv. 工作；运转" },
  { word: "job", phonetic: "dʒɒb", pos: "n.", translation: "n. 工作；职位；任务" },
  { word: "task", phonetic: "tɑːsk", pos: "n./v.", translation: "n. 任务；工作\nv. 派给任务" },
  { word: "home", phonetic: "həʊm", pos: "n./adv./adj.", translation: "n. 家；住处\nadv. 在家；回家\nadj. 家庭的" },
  { word: "house", phonetic: "haʊs", pos: "n./v.", translation: "n. 房子；住宅\nv. 容纳；安置" },
  { word: "room", phonetic: "ruːm", pos: "n.", translation: "n. 房间；空间" },
  { word: "city", phonetic: "ˈsɪti", pos: "n.", translation: "n. 城市；都市" },
  { word: "country", phonetic: "ˈkʌntri", pos: "n.", translation: "n. 国家；乡村；地区" },
  { word: "place", phonetic: "pleɪs", pos: "n./v.", translation: "n. 地方；位置\nv. 放置；安排" },
  { word: "water", phonetic: "ˈwɔːtə", pos: "n./v.", translation: "n. 水\nv. 浇水；供水" },
  { word: "food", phonetic: "fuːd", pos: "n.", translation: "n. 食物；食品" },
  { word: "coffee", phonetic: "ˈkɒfi", pos: "n.", translation: "n. 咖啡" },
  { word: "tea", phonetic: "tiː", pos: "n.", translation: "n. 茶" },
  { word: "money", phonetic: "ˈmʌni", pos: "n.", translation: "n. 钱；货币；财富" },
  { word: "price", phonetic: "praɪs", pos: "n./v.", translation: "n. 价格；代价\nv. 给……定价" },
  { word: "cost", phonetic: "kɒst", pos: "n./v.", translation: "n. 费用；成本；代价\nv. 花费；使付出" },
  { word: "pay", phonetic: "peɪ", pos: "v./n.", translation: "v. 支付；付款\nn. 工资；薪水" },
  { word: "buy", phonetic: "baɪ", pos: "v.", translation: "v. 买；购买" },
  { word: "sell", phonetic: "sel", pos: "v.", translation: "v. 卖；销售" },
  { word: "open", phonetic: "ˈəʊpən", pos: "adj./v.", translation: "adj. 开着的；开放的\nv. 打开；开放" },
  { word: "close", phonetic: "kləʊz", pos: "v./adj.", translation: "v. 关闭；结束\nadj. 近的；亲密的" },
  { word: "start", phonetic: "stɑːt", pos: "v./n.", translation: "v. 开始；启动\nn. 开始；开端" },
  { word: "end", phonetic: "end", pos: "n./v.", translation: "n. 结束；末端\nv. 结束；终止" },
  { word: "finish", phonetic: "ˈfɪnɪʃ", pos: "v./n.", translation: "v. 完成；结束\nn. 结尾；完成" },
  { word: "continue", phonetic: "kənˈtɪnjuː", pos: "v.", translation: "v. 继续；延续" },
  { word: "change", phonetic: "tʃeɪndʒ", pos: "n./v.", translation: "n. 改变；零钱\nv. 改变；更换" },
  { word: "move", phonetic: "muːv", pos: "v./n.", translation: "v. 移动；搬家；行动\nn. 移动；行动" },
  { word: "turn", phonetic: "tɜːn", pos: "v./n.", translation: "v. 转动；转向；变成\nn. 轮次；转动" },
  { word: "wait", phonetic: "weɪt", pos: "v./n.", translation: "v. 等待\nn. 等待；等待时间" },
  { word: "help", phonetic: "help", pos: "n./v.", translation: "n. 帮助\nv. 帮助；协助" },
  { word: "need", phonetic: "niːd", pos: "v./n.", translation: "v. 需要\nn. 需要；需求" },
  { word: "want", phonetic: "wɒnt", pos: "v./n.", translation: "v. 想要；需要\nn. 需要；缺乏" },
  { word: "like", phonetic: "laɪk", pos: "v./prep.", translation: "v. 喜欢\nprep. 像；如同" },
  { word: "love", phonetic: "lʌv", pos: "n./v.", translation: "n. 爱；喜爱\nv. 爱；喜欢" },
  { word: "think", phonetic: "θɪŋk", pos: "v.", translation: "v. 思考；认为；想" },
  { word: "know", phonetic: "nəʊ", pos: "v.", translation: "v. 知道；认识；了解" },
  { word: "understand", phonetic: "ˌʌndəˈstænd", pos: "v.", translation: "v. 理解；明白；懂得" },
  { word: "explain", phonetic: "ɪkˈspleɪn", pos: "v.", translation: "v. 解释；说明" },
  { word: "read", phonetic: "riːd", pos: "v.", translation: "v. 阅读；读懂；朗读" },
  { word: "write", phonetic: "raɪt", pos: "v.", translation: "v. 写；书写；编写" },
  { word: "listen", phonetic: "ˈlɪsn", pos: "v.", translation: "v. 听；倾听" },
  { word: "speak", phonetic: "spiːk", pos: "v.", translation: "v. 说话；讲话；发言" },
  { word: "say", phonetic: "seɪ", pos: "v.", translation: "v. 说；表示；认为" },
  { word: "tell", phonetic: "tel", pos: "v.", translation: "v. 告诉；讲述；辨别" },
  { word: "ask", phonetic: "ɑːsk", pos: "v.", translation: "v. 问；请求；要求" },
  { word: "show", phonetic: "ʃəʊ", pos: "v./n.", translation: "v. 显示；展示；说明\nn. 展示；节目" },
  { word: "see", phonetic: "siː", pos: "v.", translation: "v. 看见；理解；会见" },
  { word: "look", phonetic: "lʊk", pos: "v./n.", translation: "v. 看；寻找；显得\nn. 看；外观" },
  { word: "find", phonetic: "faɪnd", pos: "v./n.", translation: "v. 找到；发现\nn. 发现" },
  { word: "give", phonetic: "ɡɪv", pos: "v.", translation: "v. 给；提供；给予" },
  { word: "take", phonetic: "teɪk", pos: "v.", translation: "v. 拿；带走；需要；接受" },
  { word: "make", phonetic: "meɪk", pos: "v./n.", translation: "v. 制作；使得；造成\nn. 品牌；型号" },
  { word: "create", phonetic: "kriˈeɪt", pos: "v.", translation: "v. 创建；创造" },
  { word: "delete", phonetic: "dɪˈliːt", pos: "v.", translation: "v. 删除；删去" },
  { word: "remove", phonetic: "rɪˈmuːv", pos: "v.", translation: "v. 移除；去掉；搬走" },
  { word: "add", phonetic: "æd", pos: "v.", translation: "v. 添加；增加；补充" },
  { word: "edit", phonetic: "ˈedɪt", pos: "v./n.", translation: "v. 编辑；修改\nn. 编辑；修改内容" },
  { word: "fix", phonetic: "fɪks", pos: "v./n.", translation: "v. 修复；固定；解决\nn. 修复；解决办法" },
  { word: "check", phonetic: "tʃek", pos: "v./n.", translation: "v. 检查；核对\nn. 检查；支票" },
  { word: "choose", phonetic: "tʃuːz", pos: "v.", translation: "v. 选择；挑选" },
  { word: "select", phonetic: "sɪˈlekt", pos: "v./adj.", translation: "v. 选择；挑选\nadj. 精选的" },
  { word: "connect", phonetic: "kəˈnekt", pos: "v.", translation: "v. 连接；联系" },
  { word: "disconnect", phonetic: "ˌdɪskəˈnekt", pos: "v.", translation: "v. 断开；切断联系" },
  { word: "send", phonetic: "send", pos: "v.", translation: "v. 发送；寄送；派遣" },
  { word: "receive", phonetic: "rɪˈsiːv", pos: "v.", translation: "v. 收到；接收；接待" },
  { word: "share", phonetic: "ʃeə", pos: "v./n.", translation: "v. 分享；共用\nn. 份额；股份" },
  { word: "download", phonetic: "ˌdaʊnˈləʊd", pos: "v./n.", translation: "v. 下载\nn. 下载；下载文件" },
  { word: "upload", phonetic: "ˌʌpˈləʊd", pos: "v./n.", translation: "v. 上传\nn. 上传" },
  { word: "browser", phonetic: "ˈbraʊzə", pos: "n.", translation: "n. 浏览器" },
  { word: "website", phonetic: "ˈwebsaɪt", pos: "n.", translation: "n. 网站" },
  { word: "server", phonetic: "ˈsɜːvə", pos: "n.", translation: "n. 服务器；服务端" },
  { word: "client", phonetic: "ˈklaɪənt", pos: "n.", translation: "n. 客户端；客户" },
  { word: "request", phonetic: "rɪˈkwest", pos: "n./v.", translation: "n. 请求；要求\nv. 请求；要求" },
  { word: "response", phonetic: "rɪˈspɒns", pos: "n.", translation: "n. 响应；回答；反应" },
  { word: "token", phonetic: "ˈtəʊkən", pos: "n.", translation: "n. 令牌；标记；象征" },
  { word: "key", phonetic: "kiː", pos: "n./adj.", translation: "n. 钥匙；键；密钥；关键\nadj. 关键的" },
  { word: "password", phonetic: "ˈpɑːswɜːd", pos: "n.", translation: "n. 密码；口令" },
  { word: "account", phonetic: "əˈkaʊnt", pos: "n./v.", translation: "n. 账户；说明；理由\nv. 解释；认为" },
  { word: "login", phonetic: "ˈlɒɡɪn", pos: "n./v.", translation: "n. 登录；登录名\nv. 登录" },
  { word: "logout", phonetic: "ˈlɒɡaʊt", pos: "n./v.", translation: "n. 退出登录\nv. 退出登录" },
  { word: "security", phonetic: "sɪˈkjʊərəti", pos: "n.", translation: "n. 安全；保护；证券" },
  { word: "permission", phonetic: "pəˈmɪʃn", pos: "n.", translation: "n. 权限；许可" },
  { word: "access", phonetic: "ˈækses", pos: "n./v.", translation: "n. 访问；入口；权限\nv. 访问；获取" },
  { word: "device", phonetic: "dɪˈvaɪs", pos: "n.", translation: "n. 设备；装置" },
  { word: "screen", phonetic: "skriːn", pos: "n./v.", translation: "n. 屏幕；筛选\nv. 筛选；遮蔽" },
  { word: "button", phonetic: "ˈbʌtn", pos: "n.", translation: "n. 按钮；纽扣" },
  { word: "menu", phonetic: "ˈmenjuː", pos: "n.", translation: "n. 菜单" },
  { word: "option", phonetic: "ˈɒpʃn", pos: "n.", translation: "n. 选项；选择" },
  { word: "mode", phonetic: "məʊd", pos: "n.", translation: "n. 模式；方式" },
  { word: "theme", phonetic: "θiːm", pos: "n.", translation: "n. 主题；主题样式" },
  { word: "layout", phonetic: "ˈleɪaʊt", pos: "n.", translation: "n. 布局；版式" },
  { word: "card", phonetic: "kɑːd", pos: "n.", translation: "n. 卡片；卡；名片" },
  { word: "list", phonetic: "lɪst", pos: "n./v.", translation: "n. 列表；清单\nv. 列出；列入" },
  { word: "item", phonetic: "ˈaɪtəm", pos: "n.", translation: "n. 项目；条目；物品" },
  { word: "detail", phonetic: "ˈdiːteɪl", pos: "n./v.", translation: "n. 细节；详情\nv. 详述" },
  { word: "summary", phonetic: "ˈsʌməri", pos: "n.", translation: "n. 摘要；总结" },
  { word: "message", phonetic: "ˈmesɪdʒ", pos: "n./v.", translation: "n. 消息；信息\nv. 发送消息" },
  { word: "notification", phonetic: "ˌnəʊtɪfɪˈkeɪʃn", pos: "n.", translation: "n. 通知；提醒" },
  { word: "warning", phonetic: "ˈwɔːnɪŋ", pos: "n.", translation: "n. 警告；提醒" },
  { word: "confirm", phonetic: "kənˈfɜːm", pos: "v.", translation: "v. 确认；证实" },
  { word: "cancel", phonetic: "ˈkænsl", pos: "v.", translation: "v. 取消；撤销" },
  { word: "retry", phonetic: "ˌriːˈtraɪ", pos: "v./n.", translation: "v. 重试\nn. 重试" },
  { word: "refresh", phonetic: "rɪˈfreʃ", pos: "v./n.", translation: "v. 刷新；恢复精神\nn. 刷新" },
  { word: "load", phonetic: "ləʊd", pos: "v./n.", translation: "v. 加载；装载\nn. 负载；载荷" },
  { word: "loading", phonetic: "ˈləʊdɪŋ", pos: "n.", translation: "n. 加载；装载；负载" },
  { word: "empty", phonetic: "ˈempti", pos: "adj./v.", translation: "adj. 空的；空白的\nv. 清空" },
  { word: "full", phonetic: "fʊl", pos: "adj.", translation: "adj. 满的；完整的；充分的" },
  { word: "large", phonetic: "lɑːdʒ", pos: "adj.", translation: "adj. 大的；大量的" },
  { word: "small", phonetic: "smɔːl", pos: "adj.", translation: "adj. 小的；少量的" },
  { word: "high", phonetic: "haɪ", pos: "adj./adv.", translation: "adj. 高的；高级的\nadv. 高地" },
  { word: "low", phonetic: "ləʊ", pos: "adj./adv.", translation: "adj. 低的；低级的\nadv. 低地" },
  { word: "new", phonetic: "njuː", pos: "adj.", translation: "adj. 新的；新近的" },
  { word: "old", phonetic: "əʊld", pos: "adj.", translation: "adj. 老的；旧的；以前的" },
  { word: "same", phonetic: "seɪm", pos: "adj./pron.", translation: "adj. 相同的\npron. 同样的事物" },
  { word: "different", phonetic: "ˈdɪfrənt", pos: "adj.", translation: "adj. 不同的；有差异的" },
  { word: "correct", phonetic: "kəˈrekt", pos: "adj./v.", translation: "adj. 正确的；恰当的\nv. 改正；纠正" },
  { word: "wrong", phonetic: "rɒŋ", pos: "adj./adv./n.", translation: "adj. 错误的；不对的\nadv. 错误地\nn. 错误；坏事" },
  { word: "possible", phonetic: "ˈpɒsəbl", pos: "adj.", translation: "adj. 可能的；可行的" },
  { word: "safe", phonetic: "seɪf", pos: "adj./n.", translation: "adj. 安全的；可靠的\nn. 保险箱" },
  { word: "risk", phonetic: "rɪsk", pos: "n./v.", translation: "n. 风险；危险\nv. 冒险" },
  { word: "final", phonetic: "ˈfaɪnl", pos: "adj./n.", translation: "adj. 最终的；最后的\nn. 决赛；期末考试" },
  { word: "official", phonetic: "əˈfɪʃl", pos: "adj./n.", translation: "adj. 官方的；正式的\nn. 官员" },
  { word: "public", phonetic: "ˈpʌblɪk", pos: "adj./n.", translation: "adj. 公共的；公开的\nn. 公众" },
  { word: "private", phonetic: "ˈpraɪvət", pos: "adj.", translation: "adj. 私人的；私密的" },
  { word: "automatic", phonetic: "ˌɔːtəˈmætɪk", pos: "adj.", translation: "adj. 自动的；无意识的" },
  { word: "manual", phonetic: "ˈmænjuəl", pos: "adj./n.", translation: "adj. 手动的；体力的\nn. 手册" },
  { word: "normal", phonetic: "ˈnɔːml", pos: "adj./n.", translation: "adj. 正常的；普通的\nn. 常态" },
  { word: "special", phonetic: "ˈspeʃl", pos: "adj./n.", translation: "adj. 特殊的；专门的\nn. 特色菜；特价品" },
];

const EXPANDED_INDEX = new Map(EXPANDED_WORDS.map((entry) => [normalizeHeadword(entry.word), entry]));

export function lookupExpandedEnglishChineseDictionary(text: string): DictionaryEntry | null {
  const normalized = normalizeHeadword(text);
  const entry = EXPANDED_INDEX.get(normalized);
  if (!entry) {
    return null;
  }

  const now = nowIso();
  return {
    id: `expanded_ec_${normalizeHeadword(entry.word)}`,
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

function buildDefinitions(entry: ExpandedWord): Definition[] {
  const lines = entry.translation.split("\n").map((line) => line.trim()).filter(Boolean);
  const definitions = lines.map((line) => {
    const match = line.match(/^([a-z]+(?:\.\/[a-z]+\.)?|[a-z]+\/[a-z]+\.|[a-z]+\.)\s+(.+)$/i);
    return {
      id: createId("def"),
      partOfSpeech: match?.[1] ?? entry.pos,
      definitionZh: match?.[2] ?? line,
      definitionEn: entry.definition,
      source: SOURCE_NAME
    };
  });

  return definitions.length
    ? definitions
    : [{ id: createId("def"), partOfSpeech: entry.pos, definitionZh: entry.translation, definitionEn: entry.definition, source: SOURCE_NAME }];
}

function withSlashes(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) {
    return trimmed;
  }
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}/`;
}
