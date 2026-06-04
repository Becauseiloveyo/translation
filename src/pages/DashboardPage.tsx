import { ArrowRight, BookOpen, Clock3, DatabaseZap, Languages, Settings, Sparkles, Star } from "lucide-react";
import { PageKey } from "../components/AppShell";
import { PageProps } from "../types/app";

type DashboardPageProps = PageProps & {
  onNavigate: (page: PageKey) => void;
};

export function DashboardPage({ store, onNavigate }: DashboardPageProps) {
  const totalWords = store.vocabulary.length;
  const recentHistory = store.history.slice(0, 3);
  const enabledProviders = store.apiProviders.filter((provider) => provider.enabled).length;

  return (
    <section className="page dashboard-page">
      <div className="mobile-page-title">LiteDict</div>

      <section className="dashboard-hero">
        <div className="hero-copy">
          <span className="eyebrow">Local-first translator</span>
          <h1>今天想翻译什么？</h1>
          <p>本地优先、无需登录，可导入词典与术语表，把翻译、查词、收藏和复习串成一个轻量工作流。</p>
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

      <section className="metric-grid">
        <MetricCard label="词汇本" value={totalWords} suffix="词" tone="green" icon={Star} />
        <MetricCard label="术语表" value={store.glossary.length} suffix="条" tone="orange" icon={Sparkles} />
        <MetricCard label="词典" value={store.userDictionaries.length} suffix="本" tone="blue" icon={DatabaseZap} />
        <MetricCard label="历史" value={store.history.length} suffix="条" tone="red" icon={Clock3} />
      </section>

      <section className="grid-two dashboard-main-grid">
        <div className="panel pad stack">
          <div className="item-head">
            <div>
              <div className="panel-title">正在学习</div>
              <div className="muted small">从翻译结果、查词结果和导入词典沉淀词条</div>
            </div>
            <button className="button icon" type="button" onClick={() => onNavigate("vocabulary")} title="打开词汇本">
              <ArrowRight size={17} aria-hidden="true" />
            </button>
          </div>
          <div className="study-actions">
            <button type="button" className="study-action" onClick={() => onNavigate("translate")}>
              <Languages size={20} aria-hidden="true" />
              <span>翻译一句话</span>
              <strong>自动保存历史</strong>
            </button>
            <button type="button" className="study-action" onClick={() => onNavigate("dictionary")}>
              <BookOpen size={20} aria-hidden="true" />
              <span>查一个单词</span>
              <strong>本地词典优先</strong>
            </button>
            <button type="button" className="study-action" onClick={() => onNavigate("vocabulary")}>
              <Star size={20} aria-hidden="true" />
              <span>复习词汇本</span>
              <strong>{totalWords} 个词条</strong>
            </button>
            <button type="button" className="study-action" onClick={() => onNavigate("glossary")}>
              <Sparkles size={20} aria-hidden="true" />
              <span>管理术语表</span>
              <strong>{store.glossary.length} 条规则</strong>
            </button>
          </div>
        </div>

        <div className="panel pad stack">
          <div className="item-head">
            <div>
              <div className="panel-title">我的内容</div>
              <div className="muted small">把数据入口放到能找到的位置</div>
            </div>
            <button className="button icon" type="button" onClick={() => onNavigate("sources")} title="词典来源">
              <DatabaseZap size={17} aria-hidden="true" />
            </button>
          </div>
          <div className="content-list">
            <ContentButton label="词汇本" value={`${totalWords} 词`} icon={Star} onClick={() => onNavigate("vocabulary")} />
            <ContentButton label="术语表" value={`${store.glossary.length} 条`} icon={Sparkles} onClick={() => onNavigate("glossary")} />
            <ContentButton label="词典来源" value={`${store.userDictionaries.length} 本`} icon={DatabaseZap} onClick={() => onNavigate("sources")} />
            <ContentButton label="设置" value={`${enabledProviders} 个 Provider`} icon={Settings} onClick={() => onNavigate("settings")} />
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <div className="panel-title">最近记录</div>
            <div className="muted small">翻译历史可以直接复制复用</div>
          </div>
          <button className="button" type="button" onClick={() => onNavigate("history")}>
            查看全部
          </button>
        </div>
        {recentHistory.length ? (
          <div className="list">
            {recentHistory.map((item) => (
              <div className="list-item compact" key={item.id}>
                <div className="item-title">{item.sourceText}</div>
                <div className="muted">{item.translatedText}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="pad muted">还没有历史记录。先翻译一句话，记录会自动出现在这里。</div>
        )}
      </section>
    </section>
  );
}

function MetricCard({ label, value, suffix, tone, icon: Icon }: { label: string; value: number; suffix: string; tone: string; icon: typeof Star }) {
  return (
    <div className={`metric-card tone-${tone}`}>
      <Icon size={18} aria-hidden="true" />
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{suffix}</small>
    </div>
  );
}

function ContentButton({ label, value, icon: Icon, onClick }: { label: string; value: string; icon: typeof Star; onClick: () => void }) {
  return (
    <button type="button" className="content-button" onClick={onClick}>
      <span className="content-icon">
        <Icon size={19} aria-hidden="true" />
      </span>
      <span>{label}</span>
      <strong>{value}</strong>
      <ArrowRight size={16} aria-hidden="true" />
    </button>
  );
}
