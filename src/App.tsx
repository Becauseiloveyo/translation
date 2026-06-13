import { useEffect, useMemo, useState } from "react";
import { AppShell, PageKey } from "./components/AppShell";
import { DashboardPage } from "./pages/DashboardPage";
import { DictionaryPage } from "./pages/DictionaryPage";
import { DictionarySourcesPage } from "./pages/DictionarySourcesPage";
import { GlossaryPage } from "./pages/GlossaryPage";
import { HistoryPage } from "./pages/HistoryPage";
import { SettingsPage } from "./pages/SettingsPage";
import { TranslatePage } from "./pages/TranslatePage";
import { VocabularyPage } from "./pages/VocabularyPage";
import { AppStore } from "./types/models";
import { loadStore, saveStore } from "./services/storage/localStore";

export function App() {
  const [page, setPage] = useState<PageKey>("dictionary");
  const [store, setStore] = useState<AppStore>(() => loadStore());

  useEffect(() => {
    saveStore(store);
  }, [store]);

  useEffect(() => {
    const root = document.documentElement;
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const useDark = store.settings.theme === "dark" || (store.settings.theme === "system" && systemDark);
    root.classList.toggle("dark", useDark);
  }, [store.settings.theme]);

  const content = useMemo(() => {
    const shared = { store, setStore };
    switch (page) {
      case "home":
        return <DashboardPage {...shared} onNavigate={setPage} />;
      case "translate":
        return <TranslatePage {...shared} />;
      case "dictionary":
        return <DictionaryPage {...shared} onNavigate={setPage} />;
      case "vocabulary":
        return <VocabularyPage {...shared} />;
      case "glossary":
        return <GlossaryPage {...shared} />;
      case "sources":
        return <DictionarySourcesPage {...shared} />;
      case "history":
        return <HistoryPage {...shared} />;
      case "settings":
        return <SettingsPage {...shared} />;
      default:
        return <DictionaryPage {...shared} onNavigate={setPage} />;
    }
  }, [page, store]);

  return (
    <AppShell currentPage={page} onPageChange={setPage}>
      {content}
    </AppShell>
  );
}
