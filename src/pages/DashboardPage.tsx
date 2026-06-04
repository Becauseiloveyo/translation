import { ArrowRight, BarChart3, BookOpen, Clock3, DatabaseZap, Languages, Play, RotateCcw, Settings, Sparkles, Star } from "lucide-react";
import { PageKey } from "../components/AppShell";
import { PageProps } from "../types/app";

type DashboardPageProps = PageProps & {
  onNavigate: (page: PageKey) => void;
};

export function DashboardPage({ store, onNavigate }: DashboardPageProps) {
  const totalWords = store.vocabulary.length;
  const learningWords = store.vocabulary.filter((item) => item.status === "learning").length;
  const masteredWords = store.vocabulary.filter((item) => item.status === "mastered").length;
  const newWords = Math.max(totalWords - learningWords - masteredWords, 0);
  const progress = totalWords ? Math.round((masteredWords / totalWords) * 100) : 0;
  const recentHistory = store.history.slice(0, 3);
  const enabledProviders = store.apiProviders.filter((provider) => provider.enabled).length;

  return (
    <section className="page dashboard-page">
      <div className="mobile-page-title">LiteDict</div>

      <section className="dashboard-hero">
        <div className="hero-copy">
          <span className="eyebrow">今日学习</span>
          <h1>翻译、查词、背词放到一个流程里</h1>
          <p>先查词和翻译，再把有价值的内容沉淀到词汇本、术语表和历史里。</p>
        </div>
        <div className="hero-actions">
          <button className="button primary big" type="button" onClick={() => onNavigate("translate")}>
            <Languages size={18} aria-hidden="true" />
            开始翻译
          </button>
          <button className="button big" type="button" onClick={() => onNavigate("vocabulary")}>
            <Play size={18} aria-hidden="true" />
            学习词汇
          </button>
        </div>
      </section>

      <section className="metric-grid">
        <MetricCard label="词汇本" value={totalWords} suffix="词" tone="green" icon={Star} />
        <MetricCard label="学习中" value={learningWords} suffix="词" tone="orange" icon={RotateCcw} />
        <MetricCard label="已掌握" value={masteredWords} suffix="词" tone="blue" icon={BarChart3} />
        <MetricCard label="历史" value={store.history.length} suffix="条" tone="red" icon={Clock3} />
      </section>

      <section className="grid-two dashboard-main-grid">
        <div className="panel pad stack">
          <div className="item-head">
            <div>
              <div className="panel-title">正在学习</div>
              <div className="muted small">新词 {newWords} · 学习中 {learningWords} · 已掌握 {masteredWords}</div>
            </div>
            <button className="button icon" type="button" onClick={() => onNavigate("vocabulary")} title="打开词汇本">
              <ArrowRight size={17} aria-hidden="true" />
            </button>
          </div>
          <div className="progress-track" aria-label="词汇掌握进度">
            <div style={{ width: `${progress}%` }} />
          </div>
          <div className="study-actions">
            <button type="button" className="study-action" onClick={() => onNavigate("dictionary")}>
              <BookOpen size={20} aria-hidden="true" />
              <span>查词</span>
              <strong>本地词典优先</strong>
            </button>
            <button type="button" className="study-action" onClick={() => onNavigate("glossary")}>
              <Sparkles size={20} aria-hidden="true" />
              <span>术语</span>
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
