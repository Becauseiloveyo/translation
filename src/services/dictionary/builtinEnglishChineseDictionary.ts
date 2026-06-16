import { Definition, DictionaryEntry } from "../../types/models";
import { createId, nowIso } from "../../utils/id";
import { normalizeHeadword } from "../../utils/text";

type BuiltinWord = {
  word: string;
  phonetic?: string;
  translation: string;
  definition?: string;
  pos?: string;
  tag?: string;
};

const SOURCE_NAME = "内置中英词典";

const BUILTIN_WORDS: BuiltinWord[] = [
  { word: "hello", phonetic: "həˈləʊ", pos: "int.", translation: "int. 你好；喂；哈喽\nn. 招呼；问候", definition: "used as a greeting" },
  { word: "world", phonetic: "wɜːld", pos: "n.", translation: "n. 世界；地球；领域；世间" },
  { word: "word", phonetic: "wɜːd", pos: "n./v.", translation: "n. 单词；话语；消息；诺言\nv. 用词语表达" },
  { word: "dictionary", phonetic: "ˈdɪkʃənəri", pos: "n.", translation: "n. 词典；字典；辞书" },
  { word: "translation", phonetic: "trænsˈleɪʃn", pos: "n.", translation: "n. 翻译；译文；转化" },
  { word: "translate", phonetic: "trænsˈleɪt", pos: "v.", translation: "v. 翻译；转化；解释；转变" },
  { word: "language", phonetic: "ˈlæŋɡwɪdʒ", pos: "n.", translation: "n. 语言；措辞；表达方式" },
  { word: "meaning", phonetic: "ˈmiːnɪŋ", pos: "n./adj.", translation: "n. 意思；含义；意义\nadj. 意味深长的" },
  { word: "phonetic", phonetic: "fəˈnetɪk", pos: "adj./n.", translation: "adj. 语音的；音标的；表示发音的\nn. 音标；语音符号" },
  { word: "pronunciation", phonetic: "prəˌnʌnsiˈeɪʃn", pos: "n.", translation: "n. 发音；读音；发音方式" },
  { word: "example", phonetic: "ɪɡˈzɑːmpl", pos: "n.", translation: "n. 例子；实例；榜样" },
  { word: "definition", phonetic: "ˌdefɪˈnɪʃn", pos: "n.", translation: "n. 定义；释义；清晰度" },
  { word: "synonym", phonetic: "ˈsɪnənɪm", pos: "n.", translation: "n. 同义词" },
  { word: "antonym", phonetic: "ˈæntənɪm", pos: "n.", translation: "n. 反义词" },
  { word: "vocabulary", phonetic: "vəˈkæbjələri", pos: "n.", translation: "n. 词汇；词汇量；词汇表" },
  { word: "study", phonetic: "ˈstʌdi", pos: "n./v.", translation: "n. 学习；研究；书房\nv. 学习；研究；仔细考虑" },
  { word: "learn", phonetic: "lɜːn", pos: "v.", translation: "v. 学习；得知；认识到" },
  { word: "review", phonetic: "rɪˈvjuː", pos: "n./v.", translation: "n. 复习；评论；回顾\nv. 复习；检查；评论" },
  { word: "remember", phonetic: "rɪˈmembə", pos: "v.", translation: "v. 记得；想起；记住" },
  { word: "forget", phonetic: "fəˈɡet", pos: "v.", translation: "v. 忘记；忽略；不再想" },
  { word: "search", phonetic: "sɜːtʃ", pos: "n./v.", translation: "n. 搜索；查找\nv. 搜索；查找；搜查" },
  { word: "lookup", phonetic: "ˈlʊkʌp", pos: "n.", translation: "n. 查找；查询" },
  { word: "history", phonetic: "ˈhɪstri", pos: "n.", translation: "n. 历史；记录；经历" },
  { word: "setting", phonetic: "ˈsetɪŋ", pos: "n.", translation: "n. 设置；环境；背景；安装" },
  { word: "backup", phonetic: "ˈbækʌp", pos: "n./adj.", translation: "n. 备份；备用；后援\nadj. 备用的；后备的" },
  { word: "restore", phonetic: "rɪˈstɔː", pos: "v.", translation: "v. 恢复；修复；归还" },
  { word: "export", phonetic: "ˈekspɔːt", pos: "n./v.", translation: "n. 出口；导出内容\nv. 导出；出口" },
  { word: "import", phonetic: "ˈɪmpɔːt", pos: "n./v.", translation: "n. 进口；导入内容；意义\nv. 导入；进口" },
  { word: "local", phonetic: "ˈləʊkl", pos: "adj./n.", translation: "adj. 本地的；当地的；局部的\nn. 当地人；本地人" },
  { word: "local-first", phonetic: "ˈləʊkl fɜːst", pos: "adj.", translation: "adj. 本地优先的；优先在本地保存和处理数据的" },
  { word: "offline", phonetic: "ˌɒfˈlaɪn", pos: "adj./adv.", translation: "adj. 离线的；未联网的\nadv. 离线地" },
  { word: "online", phonetic: "ˌɒnˈlaɪn", pos: "adj./adv.", translation: "adj. 在线的；联网的\nadv. 在线地" },
  { word: "network", phonetic: "ˈnetwɜːk", pos: "n./v.", translation: "n. 网络；人脉；网状系统\nv. 建立关系网；联网" },
  { word: "provider", phonetic: "prəˈvaɪdə", pos: "n.", translation: "n. 提供者；服务商；供应方" },
  { word: "service", phonetic: "ˈsɜːvɪs", pos: "n./v.", translation: "n. 服务；业务；维修\nv. 维护；保养" },
  { word: "source", phonetic: "sɔːs", pos: "n.", translation: "n. 来源；源头；资料来源；源代码" },
  { word: "target", phonetic: "ˈtɑːɡɪt", pos: "n./v.", translation: "n. 目标；对象；靶子\nv. 把……作为目标" },
  { word: "result", phonetic: "rɪˈzʌlt", pos: "n./v.", translation: "n. 结果；成果；成绩\nv. 导致；产生结果" },
  { word: "input", phonetic: "ˈɪnpʊt", pos: "n./v.", translation: "n. 输入；投入；意见\nv. 输入" },
  { word: "output", phonetic: "ˈaʊtpʊt", pos: "n./v.", translation: "n. 输出；产量；结果\nv. 输出" },
  { word: "copy", phonetic: "ˈkɒpi", pos: "n./v.", translation: "n. 副本；拷贝；一份\nv. 复制；抄写；模仿" },
  { word: "save", phonetic: "seɪv", pos: "v./n.", translation: "v. 保存；节省；挽救\nn. 保存；救球" },
  { word: "clear", phonetic: "klɪə", pos: "adj./v.", translation: "adj. 清楚的；明确的；晴朗的\nv. 清除；清空；通过" },
  { word: "error", phonetic: "ˈerə", pos: "n.", translation: "n. 错误；差错；误差" },
  { word: "failed", phonetic: "feɪld", pos: "adj./v.", translation: "adj. 失败的；不成功的\nv. 失败；未能做到" },
  { word: "success", phonetic: "səkˈses", pos: "n.", translation: "n. 成功；成就；成功的人或事" },
  { word: "simple", phonetic: "ˈsɪmpl", pos: "adj.", translation: "adj. 简单的；朴素的；单纯的" },
  { word: "advanced", phonetic: "ədˈvɑːnst", pos: "adj.", translation: "adj. 高级的；先进的；后期的" },
  { word: "modern", phonetic: "ˈmɒdn", pos: "adj./n.", translation: "adj. 现代的；新式的\nn. 现代人；现代风格" },
  { word: "clean", phonetic: "kliːn", pos: "adj./v.", translation: "adj. 干净的；整洁的；简洁的\nv. 清洁；清理" },
  { word: "light", phonetic: "laɪt", pos: "n./adj./v.", translation: "n. 光；灯；浅色\nadj. 轻的；浅色的；明亮的\nv. 点燃；照亮" },
  { word: "dark", phonetic: "dɑːk", pos: "adj./n.", translation: "adj. 黑暗的；深色的\nn. 黑暗；暗处" },
  { word: "system", phonetic: "ˈsɪstəm", pos: "n.", translation: "n. 系统；制度；体系" },
  { word: "font", phonetic: "fɒnt", pos: "n.", translation: "n. 字体；字形；字库" },
  { word: "icon", phonetic: "ˈaɪkɒn", pos: "n.", translation: "n. 图标；偶像；象征" },
  { word: "design", phonetic: "dɪˈzaɪn", pos: "n./v.", translation: "n. 设计；图案；意图\nv. 设计；计划" },
  { word: "style", phonetic: "staɪl", pos: "n./v.", translation: "n. 风格；样式；文体\nv. 设计；称呼" },
  { word: "polish", phonetic: "ˈpɒlɪʃ", pos: "n./v.", translation: "n. 打磨；润色；优雅\nv. 打磨；润色；完善" },
  { word: "mobile", phonetic: "ˈməʊbaɪl", pos: "adj./n.", translation: "adj. 移动的；可移动的\nn. 手机；移动设备" },
  { word: "application", phonetic: "ˌæplɪˈkeɪʃn", pos: "n.", translation: "n. 应用；申请；应用程序" },
  { word: "personal", phonetic: "ˈpɜːsənl", pos: "adj.", translation: "adj. 个人的；私人的；亲自的" },
  { word: "privacy", phonetic: "ˈprɪvəsi", pos: "n.", translation: "n. 隐私；私密；独处" },
  { word: "secure", phonetic: "sɪˈkjʊə", pos: "adj./v.", translation: "adj. 安全的；牢固的\nv. 保护；获得；固定" },
  { word: "data", phonetic: "ˈdeɪtə", pos: "n.", translation: "n. 数据；资料" },
  { word: "database", phonetic: "ˈdeɪtəbeɪs", pos: "n.", translation: "n. 数据库" },
  { word: "file", phonetic: "faɪl", pos: "n./v.", translation: "n. 文件；档案\nv. 归档；提交" },
  { word: "folder", phonetic: "ˈfəʊldə", pos: "n.", translation: "n. 文件夹；资料夹" },
  { word: "cache", phonetic: "kæʃ", pos: "n./v.", translation: "n. 缓存；隐藏处\nv. 缓存；隐藏" },
  { word: "sync", phonetic: "sɪŋk", pos: "n./v.", translation: "n. 同步\nv. 同步；使一致" },
  { word: "release", phonetic: "rɪˈliːs", pos: "n./v.", translation: "n. 发布；释放；版本\nv. 发布；释放；解除" },
  { word: "build", phonetic: "bɪld", pos: "n./v.", translation: "n. 构建；版本；体格\nv. 构建；建造；建立" },
  { word: "install", phonetic: "ɪnˈstɔːl", pos: "v.", translation: "v. 安装；任命；安置" },
  { word: "update", phonetic: "ˌʌpˈdeɪt", pos: "n./v.", translation: "n. 更新；最新信息\nv. 更新；使现代化" },
  { word: "version", phonetic: "ˈvɜːʃn", pos: "n.", translation: "n. 版本；说法；译本" },
  { word: "feature", phonetic: "ˈfiːtʃə", pos: "n./v.", translation: "n. 功能；特征；特点\nv. 以……为特色；突出显示" },
  { word: "function", phonetic: "ˈfʌŋkʃn", pos: "n./v.", translation: "n. 功能；函数；作用\nv. 起作用；运转" },
  { word: "quality", phonetic: "ˈkwɒləti", pos: "n./adj.", translation: "n. 质量；品质；特性\nadj. 高质量的" },
  { word: "stable", phonetic: "ˈsteɪbl", pos: "adj./n.", translation: "adj. 稳定的；牢固的\nn. 马厩" },
  { word: "fast", phonetic: "fɑːst", pos: "adj./adv.", translation: "adj. 快的；牢固的\nadv. 快速地" },
  { word: "slow", phonetic: "sləʊ", pos: "adj./v.", translation: "adj. 慢的；迟缓的\nv. 放慢；减速" },
  { word: "good", phonetic: "ɡʊd", pos: "adj./n.", translation: "adj. 好的；有益的；合适的\nn. 好处；善行" },
  { word: "bad", phonetic: "bæd", pos: "adj.", translation: "adj. 坏的；严重的；不好的" },
  { word: "better", phonetic: "ˈbetə", pos: "adj./adv./v.", translation: "adj. 更好的\nadv. 更好地\nv. 改善；胜过" },
  { word: "best", phonetic: "best", pos: "adj./adv./n.", translation: "adj. 最好的\nadv. 最好地\nn. 最好的人或事" },
  { word: "use", phonetic: "juːz", pos: "n./v.", translation: "n. 使用；用途\nv. 使用；利用" },
  { word: "useful", phonetic: "ˈjuːsfl", pos: "adj.", translation: "adj. 有用的；实用的" },
  { word: "important", phonetic: "ɪmˈpɔːtnt", pos: "adj.", translation: "adj. 重要的；有影响的" },
  { word: "common", phonetic: "ˈkɒmən", pos: "adj./n.", translation: "adj. 常见的；共同的；普通的\nn. 公共用地；普通事物" },
  { word: "core", phonetic: "kɔː", pos: "n./adj.", translation: "n. 核心；中心；果核\nadj. 核心的；基础的" },
  { word: "basic", phonetic: "ˈbeɪsɪk", pos: "adj./n.", translation: "adj. 基本的；基础的\nn. 基础；基本要素" },
  { word: "sustainable", phonetic: "səˈsteɪnəbl", pos: "adj.", translation: "adj. 可持续的；能长期维持的" },
  { word: "serendipity", phonetic: "ˌserənˈdɪpəti", pos: "n.", translation: "n. 意外发现美好事物的能力；机缘巧合" }
];

const BUILTIN_INDEX = new Map(BUILTIN_WORDS.map((entry) => [normalizeHeadword(entry.word), entry]));

export function lookupBuiltinEnglishChineseDictionary(text: string): DictionaryEntry | null {
  const normalized = normalizeHeadword(text);
  const entry = BUILTIN_INDEX.get(normalized) ?? BUILTIN_INDEX.get(stripSimpleSuffix(normalized));
  if (!entry) {
    return null;
  }

  const now = nowIso();
  return {
    id: `builtin_ec_${normalizeHeadword(entry.word)}`,
    headword: entry.word,
    normalizedHeadword: normalizeHeadword(entry.word),
    language: "en",
    phoneticUS: entry.phonetic ? withSlashes(entry.phonetic) : undefined,
    phoneticUK: entry.phonetic ? withSlashes(entry.phonetic) : undefined,
    definitions: buildDefinitions(entry),
    source: SOURCE_NAME,
    note: entry.tag,
    createdAt: now,
    updatedAt: now
  };
}

function buildDefinitions(entry: BuiltinWord): Definition[] {
  const lines = entry.translation.split("\n").map((line) => line.trim()).filter(Boolean);
  const definitions = lines.map((line) => {
    const match = line.match(/^([a-z]+\.|[a-z]+\/\w+\.|[a-z]+\.\/[a-z]+\.)\s*(.+)$/i);
    return {
      id: createId("def"),
      partOfSpeech: match?.[1] ?? entry.pos,
      definitionZh: match?.[2] ?? line,
      definitionEn: entry.definition,
      source: SOURCE_NAME
    };
  });
  return definitions.length ? definitions : [{ id: createId("def"), partOfSpeech: entry.pos, definitionZh: entry.translation, definitionEn: entry.definition, source: SOURCE_NAME }];
}

function stripSimpleSuffix(word: string): string {
  if (word.endsWith("ing") && word.length > 5) {
    return word.slice(0, -3);
  }
  if (word.endsWith("ed") && word.length > 4) {
    return word.slice(0, -2);
  }
  if (word.endsWith("es") && word.length > 4) {
    return word.slice(0, -2);
  }
  if (word.endsWith("s") && word.length > 3) {
    return word.slice(0, -1);
  }
  return word;
}

function withSlashes(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) {
    return trimmed;
  }
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}/`;
}
