import { ArrowRight, BookOpen, Clock3, DatabaseZap, Languages, Sparkles, Star, type LucideIcon } from "lucide-react";
import { PageKey } from "../components/AppShell";
import { PageProps } from "../types/app";

type DashboardPageProps = PageProps & {
  onNavigate: (page: PageKey) => void;
};

export function DashboardPage({ store, onNavigate }: DashboardPageProps) {
  const overview = [
    { label: "词汇本", value: store.vocabulary.length, suffix: "词", icon: Star },
    { label: "术语表", value: store.glossary.length, suffix: "条", icon: Sparkles },
    { label: "历史记录", value: store.history.length, suffix: "条", icon: Clock3 },
    { label: "词典来源", value: store.userDictionaries.length, suffix: "本", icon: DatabaseZap }
  ];

  return (
    <section className="page dashboard-page launch-page">
      <div className="mobile-page-title">LiteDict</div>

      <section className="dashboard-hero launch-hero">
        <div className="hero-copy">
          <span className="eyebrow">LiteDict workspace</span>
          <h1>今天想翻译什么？</h1>
          <p>本地优先的个人翻译词典，支持查词、术语表、词汇本和自定义 Provider。打开后先翻译，沉淀内容再复习。</p>
        </div>
        <div className="hero-actions">
          <button className="button primary big" type="button" onClick={() => onNavigate("translate")}>
            <Languages size={18} aria-hidden="true" />
            开始翻译
          </button>
          <button className="button big" type="button" onClick={() => onNavigate("sources")}>
            <DatabaseZap size={18} aria-hidden="true" />
            导入词典
          </button>
        </div>
      </section>

      <section className="quick-launch-grid" aria-label="快速入口">
        <LaunchCard
          title="翻译一句话"
          description="进入双栏工作台，自动判断查词或翻译。"
          icon={Languages}
          onClick={() => onNavigate("translate")}
        />
        <LaunchCard
          title="查一个单词"
          description="从本地词典和已导入词库里查释义。"
          icon={BookOpen}
          onClick={() => onNavigate("dictionary")}
        />
        <LaunchCard
          title="复习词汇本"
          description={`${store.vocabulary.length} 个词条，可继续积累和整理。`}
          icon={Star}
          onClick={() => onNavigate("vocabulary")}
        />
        <LaunchCard
          title="管理术语表"
          description="让专有名词和固定表达保持一致。"
          icon={Sparkles}
          onClick={() => onNavigate("glossary")}
        />
      </section>

      <section className="panel pad launch-overview">
        <div className="item-head">
          <div>
            <div className="panel-title">轻量概览</div>
            <div className="muted small">这些数据只是辅助入口，不是主要工作区。</div>
          </div>
          <button className="button" type="button" onClick={() => onNavigate("history")}>
            最近历史
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
