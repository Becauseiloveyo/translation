import { BookOpen, Clock, DatabaseZap, Home, Languages, Library, Settings, Sparkles, Star } from "lucide-react";
import { ReactNode } from "react";

export type PageKey = "home" | "translate" | "dictionary" | "vocabulary" | "glossary" | "sources" | "history" | "settings";

type NavItem = {
  id: PageKey;
  label: string;
  shortLabel?: string;
  icon: typeof Languages;
  group: "home" | "core" | "study" | "advanced" | "system";
};

const navItems: NavItem[] = [
  { id: "home", label: "首页", icon: Home, group: "home" },
  { id: "dictionary", label: "查词", icon: BookOpen, group: "core" },
  { id: "translate", label: "翻译", icon: Languages, group: "core" },
  { id: "vocabulary", label: "词汇本", shortLabel: "词汇", icon: Star, group: "study" },
  { id: "history", label: "历史", icon: Clock, group: "study" },
  { id: "glossary", label: "术语表", shortLabel: "术语", icon: Sparkles, group: "advanced" },
  { id: "sources", label: "词典来源", shortLabel: "来源", icon: DatabaseZap, group: "advanced" },
  { id: "settings", label: "我的", icon: Settings, group: "system" }
];

const mobileNav = navItems.filter((item) => ["dictionary", "translate", "vocabulary", "history"].includes(item.id));

type AppShellProps = {
  currentPage: PageKey;
  onPageChange: (page: PageKey) => void;
  children: ReactNode;
};

export function AppShell({ currentPage, onPageChange, children }: AppShellProps) {
  const title = navItems.find((item) => item.id === currentPage)?.label ?? "LiteDict";

  function navigate(page: PageKey) {
    if (page === currentPage) {
      return;
    }
    onPageChange(page);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="桌面导航">
        <button className="brand" type="button" onClick={() => navigate("dictionary")}>
          <div className="brand-mark">
            <Library size={20} aria-hidden="true" />
          </div>
          <div>
            <div className="brand-title">LiteDict</div>
            <div className="brand-subtitle">查词优先 · 顺手翻译</div>
          </div>
        </button>

        <NavGroup title="核心功能" items={navItems.filter((item) => item.group === "core")} currentPage={currentPage} onPageChange={navigate} />
        <NavGroup title="学习" items={navItems.filter((item) => item.group === "study")} currentPage={currentPage} onPageChange={navigate} />
        <NavGroup title="更多" items={navItems.filter((item) => item.group === "advanced")} currentPage={currentPage} onPageChange={navigate} />
        <NavGroup title="偏好" items={navItems.filter((item) => item.group === "system")} currentPage={currentPage} onPageChange={navigate} />
      </aside>

      <div className="mobile-topbar">
        <div>
          <div className="mobile-brand">LiteDict</div>
          <div className="mobile-title">{title}</div>
        </div>
        <button className="mobile-settings-button" type="button" onClick={() => navigate("settings")} aria-label="设置">
          <Settings size={20} aria-hidden="true" />
        </button>
      </div>

      <main className="main-content">{children}</main>

      <nav className="bottom-nav" aria-label="移动端主导航">
        {mobileNav.map((item) => {
          const Icon = item.icon;
          const active = item.id === currentPage;
          return (
            <button
              className={active ? "bottom-nav-item active" : "bottom-nav-item"}
              key={item.id}
              type="button"
              onClick={() => navigate(item.id)}
              aria-current={active ? "page" : undefined}
            >
              <Icon size={21} aria-hidden="true" />
              <span>{item.shortLabel ?? item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

function NavGroup({
  title,
  items,
  currentPage,
  onPageChange
}: {
  title: string;
  items: NavItem[];
  currentPage: PageKey;
  onPageChange: (page: PageKey) => void;
}) {
  return (
    <div className="nav-group">
      <div className="nav-group-title">{title}</div>
      <div className="nav-list">
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.id === currentPage;
          return (
            <button
              className={active ? "nav-item active" : "nav-item"}
              key={item.id}
              type="button"
              onClick={() => onPageChange(item.id)}
              aria-current={active ? "page" : undefined}
            >
              <Icon size={18} aria-hidden="true" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
