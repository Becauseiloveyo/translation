import { ArrowRight, BookOpen, Clock3, DatabaseZap, Languages, Search, Settings, Star, type LucideIcon } from "lucide-react";
import { PageKey } from "../components/AppShell";
import { PageProps } from "../types/app";

type DashboardPageProps = PageProps & {
  onNavigate: (page: PageKey) => void;
};

export function DashboardPage({ store, onNavigate }: DashboardPageProps) {
  const enabledDictionaries = store.userDictionaries.filter((dictionary) => dictionary.enabled).length;
  const overview = [
    { label: "词汇本", value: store.vocabulary.length, suffix: "词", icon: Star },
    { label: "历史记录", value: store.history.length, suffix: "条", icon: Clock3 },
    { label: "已启用词典", value: enabledDictionaries, suffix: "本", icon: DatabaseZap },
    { label: "词条总数", value: store.dictionaryEntries.length, suffix: "条", icon: BookOpen }
  ];

  return (
    <section className="page dashboard-page launch-page">
      <div className="mobile-page-title">LiteDict</div>

      <section className="dashboard-hero launch-hero">
        <div className="hero-copy">
          <span className="eyebrow">Lookup first</span>
          <h1>先查单词，再翻译句子</h1>
          <p>LiteDict 的核心是快速查词：输入一个单词先给释义、音标、例句；遇到短语或长句，再切到翻译处理。</p>
        </div>
        <div className="hero-actions">
          <button className="button primary big" type="button" onClick={() => onNavigate("dictionary")}>
            <Search size={18} aria-hidden="true" />
            查一个单词
          </button>
          <button className="button big" type="button" onClick={() => onNavigate("translate")}>
            <Languages size={18} aria-hidden="true" />
            翻译句子
          </button>
        </div>
      </section>

      <section className="quick-launch-grid" aria-label="核心入口">
        <LaunchCard
          title="查词"
          description="单词释义、音标、例句，本地词典优先。"
          icon={BookOpen}
          onClick={() => onNavigate("dictionary")}
        />
        <LaunchCard
          title="翻译"
          description="短语和句子翻译，保留术语匹配能力。"
          icon={Languages}
          onClick={() => onNavigate("translate")}
        />
        <LaunchCard
          title="词汇本"
          description="把查到的单词收起来，后面再复习。"
          icon={Star}
          onClick={() => onNavigate("vocabulary")}
        />
        <LaunchCard
          title="词典设置"
          description="导入本地词典、管理来源和 Provider。"
          icon={Settings}
          onClick={() => onNavigate("sources")}
        />
      </section>

      <section className="panel pad launch-overview">
        <div className="item-head">
          <div>
            <div className="panel-title">轻量概览</div>
            <div className="muted small">只保留和查词、翻译直接相关的数据。</div>
          </div>
          <button className="button" type="button" onClick={() => onNavigate("history")}>
            最近记录
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>
        <div className="overview-grid">
          {overview.map((item) => (
            <OverviewItem key={item.label} {...item} />
          ))}
        </div>
      </section>
    </section>
  );
}

function LaunchCard({
  title,
  description,
  icon: Icon,
  onClick
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  onClick: () => void;
}) {
  return (
    <button className="launch-card" type="button" onClick={onClick}>
      <span className="launch-icon">
        <Icon size={22} aria-hidden="true" />
      </span>
      <span className="launch-text">
        <strong>{title}</strong>
        <span>{description}</span>
      </span>
      <ArrowRight size={17} aria-hidden="true" />
    </button>
  );
}

function OverviewItem({
  label,
  value,
  suffix,
  icon: Icon
}: {
  label: string;
  value: number;
  suffix: string;
  icon: LucideIcon;
}) {
  return (
    <div className="overview-item">
      <Icon size={18} aria-hidden="true" />
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{suffix}</small>
    </div>
  );
}
