import {
  BookOpen,
  Clock,
  DatabaseZap,
  Languages,
  Library,
  Settings,
  Sparkles,
  Star
} from "lucide-react";
import { ReactNode } from "react";

export type PageKey = "translate" | "dictionary" | "vocabulary" | "glossary" | "sources" | "history" | "settings";

type NavItem = {
  id: PageKey;
  label: string;
  icon: typeof Languages;
};

const navItems: NavItem[] = [
  { id: "translate", label: "翻译", icon: Languages },
  { id: "dictionary", label: "词典", icon: BookOpen },
  { id: "vocabulary", label: "词汇本", icon: Star },
  { id: "glossary", label: "术语表", icon: Sparkles },
  { id: "sources", label: "词典来源", icon: DatabaseZap },
  { id: "history", label: "历史", icon: Clock },
  { id: "settings", label: "设置", icon: Settings }
];

type AppShellProps = {
  currentPage: PageKey;
  onPageChange: (page: PageKey) => void;
  children: ReactNode;
};

export function AppShell({ currentPage, onPageChange, children }: AppShellProps) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Library size={20} aria-hidden="true" />
          </div>
          <div>
            <div className="brand-title">LiteDict</div>
            <div className="brand-subtitle">Personal dictionary</div>
          </div>
        </div>

        <nav className="nav-list" aria-label="Primary">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.id === currentPage;
            return (
              <button
                className={active ? "nav-item active" : "nav-item"}
                key={item.id}
                type="button"
                onClick={() => onPageChange(item.id)}
              >
                <Icon size={18} aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}

