import { Download, Upload } from "lucide-react";
import { ChangeEvent, Dispatch, SetStateAction, useState } from "react";
import { importStoreBackup } from "../services/storage/localStore";
import { AppStore } from "../types/models";
import { downloadTextFile } from "../utils/text";

type BackupRestoreCardProps = {
  store: AppStore;
  setStore: Dispatch<SetStateAction<AppStore>>;
};

type BackupPreview = {
  fileName: string;
  raw: string;
  app?: string;
  exportedAt?: string;
  vocabulary: number;
  history: number;
  dictionaries: number;
  dictionaryEntries: number;
  providers: number;
};

export function BackupRestoreCard({ store, setStore }: BackupRestoreCardProps) {
  const [backupMessage, setBackupMessage] = useState("");
  const [pendingBackup, setPendingBackup] = useState<BackupPreview | null>(null);

  function exportBackup() {
    const exportedAt = new Date().toISOString();
    const backup = JSON.stringify({ ...store, exportedAt, app: "LiteDict" }, null, 2);
    downloadTextFile(`litedict-backup-${exportedAt.slice(0, 10)}.json`, backup, "application/json;charset=utf-8");
    setBackupMessage("完整备份已导出。它包含设置、Provider、词汇本、历史、词典数据。请妥善保存。 ");
  }

  async function previewBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    try {
      const raw = await file.text();
      setPendingBackup(parseBackupPreview(file.name, raw));
      setBackupMessage("");
    } catch {
      setPendingBackup(null);
      setBackupMessage("备份读取失败。请确认选择的是 LiteDict 导出的 JSON 文件。 ");
    } finally {
      event.target.value = "";
    }
  }

  function confirmRestore() {
    if (!pendingBackup) {
      return;
    }
    const exportedAt = new Date().toISOString();
    const safetyBackup = JSON.stringify({ ...store, exportedAt, app: "LiteDict", reason: "before-restore" }, null, 2);
    downloadTextFile(`litedict-before-restore-${exportedAt.slice(0, 10)}.json`, safetyBackup, "application/json;charset=utf-8");
    const next = importStoreBackup(pendingBackup.raw);
    setStore(() => next);
    setBackupMessage("已恢复备份，并自动导出了一份恢复前的本地数据。 ");
    setPendingBackup(null);
  }

  return (
    <div className="panel pad stack settings-card backup-card">
      <div>
        <div className="panel-title">备份与恢复</div>
        <div className="muted small">恢复前先预览；确认恢复时会自动导出当前数据，降低误覆盖风险。</div>
      </div>
      <div className="backup-actions">
        <button className="button primary" type="button" onClick={exportBackup}>
          <Download size={16} aria-hidden="true" />
          导出完整备份
        </button>
        <label className="button" htmlFor="settings-backup-import">
          <Upload size={16} aria-hidden="true" />
          选择备份预览
        </label>
        <input id="settings-backup-import" className="hidden-file" type="file" accept=".json,application/json" onChange={previewBackup} />
      </div>
      {pendingBackup ? (
        <div className="backup-preview-card">
          <div className="item-title">恢复预览：{pendingBackup.fileName}</div>
          <div className="provider-status-grid">
            <PreviewStat title="词汇本" value={pendingBackup.vocabulary} />
            <PreviewStat title="历史" value={pendingBackup.history} />
            <PreviewStat title="词库" value={pendingBackup.dictionaries} />
            <PreviewStat title="词条" value={pendingBackup.dictionaryEntries} />
            <PreviewStat title="Provider" value={pendingBackup.providers} />
            <PreviewStat title="时间" value={pendingBackup.exportedAt ? pendingBackup.exportedAt.slice(0, 10) : "未知"} />
          </div>
          <div className="row">
            <button className="button primary" type="button" onClick={confirmRestore}>确认恢复</button>
            <button className="button" type="button" onClick={() => setPendingBackup(null)}>取消</button>
          </div>
        </div>
      ) : null}
      {backupMessage ? <div className="notice">{backupMessage}</div> : null}
      <div className="notice">API key 只保存在本地应用数据和你导出的备份文件中，不要公开分享备份。</div>
    </div>
  );
}

function PreviewStat({ title, value }: { title: string; value: number | string }) {
  return (
    <div className="provider-status-card">
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  );
}

function parseBackupPreview(fileName: string, raw: string): BackupPreview {
  const parsed = JSON.parse(raw) as Partial<AppStore> & { exportedAt?: string; app?: string };
  return {
    fileName,
    raw,
    app: parsed.app,
    exportedAt: parsed.exportedAt,
    vocabulary: parsed.vocabulary?.length ?? 0,
    history: parsed.history?.length ?? 0,
    dictionaries: parsed.userDictionaries?.length ?? 0,
    dictionaryEntries: parsed.dictionaryEntries?.length ?? 0,
    providers: parsed.apiProviders?.length ?? 0
  };
}
