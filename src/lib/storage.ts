export interface NotifyConfig {
  appName: string;
  title: string;
  body: string;
  iconBase64: string;
  fromText: string;
  showFrom: boolean;
  delaySeconds: number;
  pwaDisplayName: string;
}

export interface AutoConfig {
  active: boolean;
  intervalMinutes: number;
}

const CONFIG_KEY = 'notifypro_config';
const AUTO_KEY = 'notifypro_auto';
const HISTORY_KEY = 'notifypro_history';

export const defaultConfig: NotifyConfig = {
  appName: '',
  title: '',
  body: '',
  iconBase64: '',
  fromText: '',
  showFrom: false,
  delaySeconds: 0,
  pwaDisplayName: 'Notificações',
};

export const defaultAutoConfig: AutoConfig = {
  active: false,
  intervalMinutes: 1,
};

export function loadConfig(): NotifyConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) return { ...defaultConfig, ...JSON.parse(raw) };
  } catch {}
  return { ...defaultConfig };
}

export function saveConfig(config: NotifyConfig) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export function loadAutoConfig(): AutoConfig {
  try {
    const raw = localStorage.getItem(AUTO_KEY);
    if (raw) return { ...defaultAutoConfig, ...JSON.parse(raw) };
  } catch {}
  return { ...defaultAutoConfig };
}

export function saveAutoConfig(config: AutoConfig) {
  localStorage.setItem(AUTO_KEY, JSON.stringify(config));
}

export interface HistoryEntry {
  id: string;
  appName: string;
  title: string;
  body: string;
  iconBase64: string;
  fromText: string;
  showFrom: boolean;
  timestamp: number;
}

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export function saveHistory(history: HistoryEntry[]) {
  // Guardar apenas os últimos 50
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 50)));
}

export function addToHistory(config: NotifyConfig): HistoryEntry[] {
  const history = loadHistory();
  const entry: HistoryEntry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    appName: config.appName,
    title: config.title,
    body: config.body,
    iconBase64: config.iconBase64,
    fromText: config.fromText,
    showFrom: config.showFrom,
    timestamp: Date.now(),
  };
  history.unshift(entry);
  saveHistory(history);
  return history;
}
