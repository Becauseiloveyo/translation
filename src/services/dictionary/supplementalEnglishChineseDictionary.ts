import { Definition, DictionaryEntry } from "../../types/models";
import { createId, nowIso } from "../../utils/id";
import { normalizeHeadword } from "../../utils/text";

type SupplementalWord = {
  word: string;
  phonetic?: string;
  pos: string;
  translation: string;
  definition?: string;
};

const SOURCE_NAME = "补充中英词库";

const WORDS: SupplementalWord[] = [
  { word: "map", phonetic: "mæp", pos: "n./v.", translation: "n. 地图；映射表；对应关系\nv. 绘制地图；映射；建立对应关系", definition: "A map shows places or defines a relationship between values." },
  { word: "mapper", phonetic: "ˈmæpər", pos: "n.", translation: "n. 映射器；映射程序；负责建立对应关系的人或工具", definition: "A mapper is a person, function, or tool that maps one value, object, or structure to another." },
  { word: "mapping", phonetic: "ˈmæpɪŋ", pos: "n.", translation: "n. 映射；对应关系；地图绘制", definition: "A relationship that connects one set of values or objects to another." },
  { word: "framework", phonetic: "ˈfreɪmwɜːrk", pos: "n.", translation: "n. 框架；结构；开发框架", definition: "A basic structure or software foundation used to build something." },
  { word: "handler", phonetic: "ˈhændlər", pos: "n.", translation: "n. 处理器；处理函数；处理程序", definition: "A function or object that handles a specific event, request, or task." },
  { word: "listener", phonetic: "ˈlɪsənər", pos: "n.", translation: "n. 监听器；监听函数；听者", definition: "A component that waits for and responds to an event." },
  { word: "adapter", phonetic: "əˈdæptər", pos: "n.", translation: "n. 适配器；转换器；适配层", definition: "A component that converts one interface or format into another." },
  { word: "parser", phonetic: "ˈpɑːrsər", pos: "n.", translation: "n. 解析器；语法分析器", definition: "A program or function that analyzes text or data structure." },
  { word: "renderer", phonetic: "ˈrendərər", pos: "n.", translation: "n. 渲染器；渲染程序", definition: "A component that draws or produces visible output." },
  { word: "controller", phonetic: "kənˈtroʊlər", pos: "n.", translation: "n. 控制器；控制程序；管理器", definition: "A component that controls behavior or coordinates actions." },
  { word: "middleware", phonetic: "ˈmɪdlwer", pos: "n.", translation: "n. 中间件；中间层", definition: "Software that sits between systems or processing steps." },
  { word: "endpoint", phonetic: "ˈendpɔɪnt", pos: "n.", translation: "n. 端点；接口地址；服务入口", definition: "An address or point where a service can be accessed." },
  { word: "payload", phonetic: "ˈpeɪloʊd", pos: "n.", translation: "n. 有效载荷；请求体；数据内容", definition: "The main data carried by a request, response, or message." },
  { word: "schema", phonetic: "ˈskiːmə", pos: "n.", translation: "n. 模式；结构定义；数据库架构", definition: "A formal structure that describes data fields and relationships." },
  { word: "module", phonetic: "ˈmɑːdʒuːl", pos: "n.", translation: "n. 模块；组件；单元", definition: "A separate unit of code or functionality." },
  { word: "package", phonetic: "ˈpækɪdʒ", pos: "n./v.", translation: "n. 包；软件包；包裹\nv. 打包；封装", definition: "A bundled set of files, code, or items." },
  { word: "dependency", phonetic: "dɪˈpendənsi", pos: "n.", translation: "n. 依赖；依赖项；依赖关系", definition: "Something that another component needs in order to work." },
  { word: "runtime", phonetic: "ˈrʌntaɪm", pos: "n.", translation: "n. 运行时；运行环境", definition: "The environment or period in which a program is running." },
  { word: "compile", phonetic: "kəmˈpaɪl", pos: "v.", translation: "v. 编译；汇编；整理", definition: "To convert source code into executable or lower-level code." },
  { word: "compiler", phonetic: "kəmˈpaɪlər", pos: "n.", translation: "n. 编译器", definition: "A program that compiles source code." },
  { word: "debug", phonetic: "ˌdiːˈbʌɡ", pos: "v.", translation: "v. 调试；排错", definition: "To find and fix errors in a program." },
  { word: "debugger", phonetic: "ˌdiːˈbʌɡər", pos: "n.", translation: "n. 调试器", definition: "A tool used to inspect and debug a program." },
  { word: "layout", phonetic: "ˈleɪaʊt", pos: "n.", translation: "n. 布局；版面；排列方式", definition: "The arrangement of elements on a screen or page." },
  { word: "margin", phonetic: "ˈmɑːrdʒɪn", pos: "n.", translation: "n. 外边距；页边距；余量", definition: "The space around an element or page." },
  { word: "padding", phonetic: "ˈpædɪŋ", pos: "n.", translation: "n. 内边距；填充", definition: "The space inside an element between content and border." },
  { word: "border", phonetic: "ˈbɔːrdər", pos: "n.", translation: "n. 边框；边界", definition: "A line or boundary around an element." },
  { word: "overflow", phonetic: "ˌoʊvərˈfloʊ", pos: "n./v.", translation: "n. 溢出；超出部分\nv. 溢出；超出范围", definition: "Content that extends beyond its container." },
  { word: "scroll", phonetic: "skroʊl", pos: "v./n.", translation: "v. 滚动\nn. 滚动；卷轴", definition: "To move content up, down, or sideways on a screen." },
  { word: "overlay", phonetic: "ˈoʊvərleɪ", pos: "n./v.", translation: "n. 覆盖层；浮层\nv. 覆盖；叠加", definition: "A layer displayed above other content." },
  { word: "dropdown", phonetic: "ˈdrɑːpdaʊn", pos: "n.", translation: "n. 下拉菜单；下拉选择框", definition: "A menu that expands to show selectable options." }
];

const WORD_INDEX = new Map(WORDS.map((word) => [normalizeHeadword(word.word), word]));

export function lookupSupplementalEnglishChineseDictionary(text: string): DictionaryEntry | null {
  const normalized = normalizeHeadword(text);
  const item = WORD_INDEX.get(normalized);
  if (!normalized || !item) {
    return null;
  }

  const now = nowIso();
  return {
    id: `supplemental_en_zh_${normalized}`,
    headword: item.word,
    normalizedHeadword: normalized,
    language: "en",
    phoneticUS: item.phonetic ? withSlashes(item.phonetic) : undefined,
    phoneticUK: item.phonetic ? withSlashes(item.phonetic) : undefined,
    definitions: buildDefinitions(item),
    source: SOURCE_NAME,
    createdAt: now,
    updatedAt: now
  };
}

export function getSupplementalDictionaryHeadwords(): string[] {
  return WORDS.map((word) => word.word);
}

function buildDefinitions(item: SupplementalWord): Definition[] {
  return item.translation.split("\n").map((line) => ({
    id: createId("def"),
    partOfSpeech: item.pos,
    definitionZh: line.trim(),
    definitionEn: item.definition,
    source: SOURCE_NAME
  }));
}

function withSlashes(text: string): string {
  const trimmed = text.trim();
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}/`;
}
