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
  const [dictionaryQuery, setDictionaryQuery] = useState("");

  useEffect(() => {
    saveStore(store);
  }, [store]);

  useEffect(() => {
    const root = document.documentElement;
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const useDark = store.settings.theme === "dark" || (store.settings.theme === "system" && systemDark);
    root.classList.toggle("dark", useDark);
    root.classList.remove("font-system");
  }, [store.settings.theme]);

  function openDictionary(word: string) {
    setDictionaryQuery(word);
    setPage("dictionary");
  }

  const content = useMemo(() => {
    const shared = { store, setStore };
    switch (page) {
      case "home":
        return <DashboardPage {...shared} onNavigate={setPage} />;
      case "translate":
        return <TranslatePage {...shared} />;
      case "dictionary":
        return <DictionaryPage {...shared} onNavigate={setPage} initialQuery={dictionaryQuery} />;
      case "vocabulary":
        return <VocabularyPage {...shared} onLookup={openDictionary} />;
      case "glossary":
        return <GlossaryPage {...shared} />;
      case "sources":
        return <DictionarySourcesPage {...shared} />;
      case "history":
        return <HistoryPage {...shared} />;
      case "settings":
        return <SettingsPage {...shared} />;
      default:
        return <DictionaryPage {...shared} onNavigate={setPage} initialQuery={dictionaryQuery} />;
    }
  }, [dictionaryQuery, page, store]);

  return (
    <AppShell currentPage={page} onPageChange={setPage}>
      {content}
    </AppShell>
  );
}
