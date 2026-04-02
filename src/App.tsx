import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bell, Upload, Globe, Clock, Settings, Play, Square,
  CheckCircle2, ShieldAlert, Smartphone, Send, History,
  Trash2, RotateCcw, Loader2, ImageIcon, ChevronDown, ChevronUp,
  Download, Zap, X
} from 'lucide-react';
import NotificationPreview from './components/NotificationPreview';
import { smartExtractIcon } from './lib/iconExtractor';
import {
  type NotifyConfig, type AutoConfig, type HistoryEntry,
  loadConfig, saveConfig, loadAutoConfig, saveAutoConfig,
  loadHistory, saveHistory, addToHistory, defaultConfig
} from './lib/storage';

// ─── Templates com URLs reais para extração via API ───
const TEMPLATES = [
  { name: '🟣 Nubank', appName: 'Nubank', title: 'Transferência recebida', body: 'Você recebeu R$ 150,00 via Pix de João Silva', storeUrl: 'https://apps.apple.com/br/app/nubank/id814456780' },
  { name: '💚 PicPay', appName: 'PicPay', title: 'Pix recebido!', body: 'Você recebeu R$ 75,00 de Maria Souza', storeUrl: 'https://apps.apple.com/br/app/picpay/id561524792' },
  { name: '🔵 Mercado Pago', appName: 'Mercado Pago', title: 'Novo Pix!', body: 'R$ 230,00 recebido na sua conta Mercado Pago', storeUrl: 'https://apps.apple.com/br/app/mercado-pago/id925436649' },
  { name: '💛 BB', appName: 'Banco do Brasil', title: 'Pix creditado', body: 'Pix de R$ 500,00 recebido de Carlos Oliveira', storeUrl: 'https://apps.apple.com/br/app/banco-do-brasil/id330984271' },
  { name: '🟠 Inter', appName: 'Inter', title: 'Pix recebido', body: 'Você recebeu R$ 89,90 via Pix', storeUrl: 'https://apps.apple.com/br/app/inter-conta-cart%C3%A3o-e-pix/id839711154' },
  { name: '💬 WhatsApp', appName: 'WhatsApp', title: 'Maria (2)', body: 'Oi! Já te enviei o comprovante 📎', storeUrl: 'https://apps.apple.com/br/app/whatsapp-messenger/id310633997' },
];

export default function App() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [config, setConfig] = useState<NotifyConfig>(loadConfig);
  const [autoConfig, setAutoConfig] = useState<AutoConfig>(loadAutoConfig);
  const [history, setHistory] = useState<HistoryEntry[]>(loadHistory);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [extractUrl, setExtractUrl] = useState('');
  const [showExtractor, setShowExtractor] = useState(false);
  const [toast, setToast] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  const autoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const configRef = useRef(config);
  configRef.current = config;

  // ─── Salvar no localStorage automaticamente ───
  useEffect(() => { saveConfig(config); }, [config]);
  useEffect(() => { saveAutoConfig(autoConfig); }, [autoConfig]);

  // ─── Atualizar manifest dinâmico para o nome PWA ───
  useEffect(() => {
    const manifest = {
      name: config.pwaDisplayName || 'Notificações',
      short_name: config.pwaDisplayName || 'Notificações',
      display: 'standalone',
      background_color: '#0f172a',
      theme_color: '#0f172a',
      start_url: '/',
      orientation: 'portrait',
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
      ]
    };
    const blob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    let link = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'manifest';
      document.head.appendChild(link);
    }
    link.href = url;
    document.title = config.pwaDisplayName || 'NotifyPro';
    return () => URL.revokeObjectURL(url);
  }, [config.pwaDisplayName]);

  // ─── Checar permissão ───
  useEffect(() => {
    if ('Notification' in window) setPermission(Notification.permission);
  }, []);

  // ─── PWA Install prompt ───
  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // ─── Toast ───
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }, []);

  // ─── Solicitar permissão ───
  const requestPermission = async () => {
    if (!('Notification' in window)) {
      showToast('❌ Navegador não suporta notificações');
      return;
    }
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === 'granted') showToast('✅ Notificações ativadas!');
    else if (result === 'denied') showToast('❌ Notificações bloqueadas no navegador');
  };

  // ─── Instalar PWA ───
  const installPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      if (result.outcome === 'accepted') showToast('✅ App instalado!');
      setDeferredPrompt(null);
    } else {
      showToast('📱 Use "Adicionar à Tela Inicial" no menu do navegador');
    }
  };

  // ─── Upload manual de imagem ───
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      setConfig(prev => ({ ...prev, iconBase64: base64 }));
      showToast('✅ Imagem carregada!');
    };
    reader.readAsDataURL(file);
  };

  // ─── Extração inteligente de ícone ───
  const handleExtractIcon = async () => {
    if (!extractUrl.trim()) return;
    setIsLoading(true);

    const url = extractUrl.trim();
    if (url.includes('apps.apple.com') || url.includes('itunes.apple.com')) {
      setLoadingMsg('Buscando na App Store...');
    } else if (url.includes('play.google.com')) {
      setLoadingMsg('Buscando na Play Store...');
    } else {
      setLoadingMsg('Buscando ícone do site...');
    }

    try {
      const result = await smartExtractIcon(url);
      if (result) {
        setConfig(prev => ({ ...prev, iconBase64: result.base64 }));
        showToast(`✅ Ícone extraído da ${result.source}!`);
        setShowExtractor(false);
        setExtractUrl('');
      } else {
        showToast('❌ Não foi possível extrair o ícone. Tente outro link.');
      }
    } catch {
      showToast('❌ Erro na extração. Verifique o link.');
    }
    setIsLoading(false);
    setLoadingMsg('');
  };

  // ─── Aplicar template ───
  const applyTemplate = async (tpl: typeof TEMPLATES[0]) => {
    setIsLoading(true);
    setLoadingMsg(`Carregando ${tpl.name}...`);
    setConfig(prev => ({
      ...prev,
      appName: tpl.appName,
      title: tpl.title,
      body: tpl.body,
    }));

    try {
      const result = await smartExtractIcon(tpl.storeUrl);
      if (result) {
        setConfig(prev => ({ ...prev, iconBase64: result.base64 }));
      }
    } catch {}

    setIsLoading(false);
    setLoadingMsg('');
    showToast(`✅ Template ${tpl.appName} aplicado!`);
  };

  // ─── Enviar notificação ───
  const sendNotification = useCallback(async () => {
    const c = configRef.current;
    if (permission !== 'granted') {
      showToast('⚠️ Permita as notificações primeiro!');
      return;
    }

    const titleParts = [];
    if (c.appName) titleParts.push(c.appName);
    if (c.showFrom && c.fromText) titleParts.push(`de: ${c.fromText}`);

    const finalTitle = c.title || 'Notificação';
    const tag = Date.now().toString();

    const options: NotificationOptions = {
      body: c.body || '',
      icon: c.iconBase64 || undefined,
      badge: c.iconBase64 || undefined,
      tag,
      silent: false,
      requireInteraction: false,
    };

    // Monta o título completo
    const displayTitle = titleParts.length > 0
      ? `${titleParts.join(' • ')} — ${finalTitle}`
      : finalTitle;

    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(displayTitle, options);
      } else {
        new Notification(displayTitle, options);
      }
    } catch {
      // Fallback
      new Notification(displayTitle, options);
    }

    // Salvar no histórico
    const newHistory = addToHistory(c);
    setHistory(newHistory);
  }, [permission, showToast]);

  // ─── Envio com delay + countdown ───
  const sendWithDelay = () => {
    if (config.delaySeconds === 0) {
      sendNotification();
      showToast('✅ Notificação enviada!');
      return;
    }
    setCountdown(config.delaySeconds);
    showToast(`⏱️ Enviando em ${config.delaySeconds}s...`);

    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          sendNotification();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // ─── Auto envio ───
  const toggleAuto = () => {
    if (!autoConfig.active) {
      setAutoConfig(prev => ({ ...prev, active: true }));
      sendNotification();
      autoTimerRef.current = setInterval(sendNotification, autoConfig.intervalMinutes * 60000);
      showToast(`🔄 Envio automático a cada ${autoConfig.intervalMinutes} min`);
    } else {
      setAutoConfig(prev => ({ ...prev, active: false }));
      if (autoTimerRef.current) clearInterval(autoTimerRef.current);
      autoTimerRef.current = null;
      showToast('⏹️ Envio automático parado');
    }
  };

  // Limpar timer ao desmontar
  useEffect(() => {
    return () => {
      if (autoTimerRef.current) clearInterval(autoTimerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  // ─── Restaurar do histórico ───
  const restoreFromHistory = (entry: HistoryEntry) => {
    setConfig(prev => ({
      ...prev,
      appName: entry.appName,
      title: entry.title,
      body: entry.body,
      iconBase64: entry.iconBase64,
      fromText: entry.fromText,
      showFrom: entry.showFrom,
    }));
    showToast('✅ Configuração restaurada!');
  };

  // ─── Limpar ícone ───
  const clearIcon = () => {
    setConfig(prev => ({ ...prev, iconBase64: '' }));
    showToast('🗑️ Ícone removido');
  };

  // ─── Reset geral ───
  const resetAll = () => {
    setConfig({ ...defaultConfig });
    showToast('🔄 Tudo resetado');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white pb-28">

      {/* ─── Toast ─── */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[999] slide-up">
          <div className="bg-slate-800 border border-slate-700 text-white px-5 py-3 rounded-xl shadow-2xl text-sm font-medium backdrop-blur-xl">
            {toast}
          </div>
        </div>
      )}

      {/* ─── Loading Overlay ─── */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[998] flex items-center justify-center">
          <div className="bg-slate-800 rounded-2xl p-6 flex flex-col items-center gap-3 shadow-2xl border border-slate-700">
            <Loader2 className="animate-spin text-blue-400" size={32} />
            <p className="text-sm text-gray-300">{loadingMsg || 'Carregando...'}</p>
          </div>
        </div>
      )}

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-5">

        {/* ─── Header ─── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/30">
              <Bell size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold">NotifyPro</h1>
              <p className="text-[11px] text-slate-400">Sistema de Notificações PWA</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={installPWA} className="bg-slate-800 hover:bg-slate-700 border border-slate-700 p-2.5 rounded-xl transition-colors" title="Instalar App">
              <Download size={18} />
            </button>
            <button onClick={requestPermission}
              className={`p-2.5 rounded-xl border transition-colors ${
                permission === 'granted' ? 'bg-emerald-900/50 border-emerald-700 text-emerald-400' :
                permission === 'denied' ? 'bg-red-900/50 border-red-700 text-red-400' :
                'bg-blue-600 border-blue-500 text-white pulse-glow'
              }`} title="Permissão de Notificações">
              {permission === 'granted' ? <CheckCircle2 size={18} /> :
               permission === 'denied' ? <ShieldAlert size={18} /> :
               <Bell size={18} />}
            </button>
          </div>
        </div>

        {/* ─── Nome do PWA (from) ─── */}
        <div className="bg-gradient-to-r from-blue-900/40 to-indigo-900/40 border border-blue-800/50 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Smartphone size={16} className="text-blue-400" />
            <h3 className="text-sm font-bold text-blue-300">Nome do App Instalado (PWA)</h3>
          </div>
          <p className="text-[11px] text-blue-400/70 leading-relaxed">
            No iPhone, a notificação mostra <b>"from [nome]"</b> na base. Mude aqui <b>ANTES</b> de instalar o app na tela inicial. Ex: coloque "Nubank" para aparecer "from Nubank".
          </p>
          <input
            type="text"
            value={config.pwaDisplayName}
            onChange={e => setConfig(prev => ({ ...prev, pwaDisplayName: e.target.value }))}
            placeholder="Ex: Nubank, Notificações, Avisos..."
            className="w-full bg-slate-900/80 border border-blue-800/50 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-600"
          />
        </div>

        {/* ─── Templates Rápidos ─── */}
        <div>
          <p className="text-[11px] text-slate-500 font-medium mb-2 uppercase tracking-wider">Templates Rápidos</p>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
            {TEMPLATES.map((tpl, i) => (
              <button key={i} onClick={() => applyTemplate(tpl)}
                className="whitespace-nowrap px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-[13px] font-medium hover:border-blue-500 hover:bg-slate-700 transition-all active:scale-95 flex-shrink-0">
                {tpl.name}
              </button>
            ))}
          </div>
        </div>

        {/* ─── Conteúdo da Notificação ─── */}
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-bold flex items-center gap-2 text-slate-300">
            <Settings size={16} className="text-slate-400" /> CONTEÚDO
          </h2>

          <div>
            <label className="block text-[11px] text-slate-500 font-medium mb-1 uppercase">Nome do App (topo da notificação)</label>
            <input type="text" value={config.appName}
              onChange={e => setConfig(prev => ({ ...prev, appName: e.target.value }))}
              placeholder="Ex: Nubank, WhatsApp..."
              className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-600" />
          </div>

          <div>
            <label className="block text-[11px] text-slate-500 font-medium mb-1 uppercase">Título</label>
            <input type="text" value={config.title}
              onChange={e => setConfig(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Ex: Transferência recebida"
              className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-600" />
          </div>

          <div>
            <label className="block text-[11px] text-slate-500 font-medium mb-1 uppercase">Descrição</label>
            <textarea value={config.body}
              onChange={e => setConfig(prev => ({ ...prev, body: e.target.value }))}
              placeholder="Ex: Você recebeu R$ 150,00 via Pix..."
              rows={3}
              className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-600 resize-none" />
          </div>

          {/* Remetente (from) */}
          <div className="bg-slate-900/60 rounded-xl p-3 space-y-2 border border-slate-700/50">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={config.showFrom}
                onChange={e => setConfig(prev => ({ ...prev, showFrom: e.target.checked }))}
                className="w-4 h-4 rounded text-blue-600 bg-slate-800 border-slate-600 focus:ring-blue-500" />
              <span className="text-sm font-medium text-slate-300">Mostrar remetente ("de:")</span>
            </label>
            {config.showFrom && (
              <input type="text" value={config.fromText}
                onChange={e => setConfig(prev => ({ ...prev, fromText: e.target.value }))}
                placeholder="Ex: João da Silva"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-600" />
            )}
          </div>
        </div>

        {/* ─── Ícone do App ─── */}
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-bold flex items-center gap-2 text-slate-300">
            <ImageIcon size={16} className="text-slate-400" /> ÍCONE DO APP
          </h2>

          {/* Preview do ícone atual */}
          <div className="flex items-center gap-4">
            {config.iconBase64 ? (
              <div className="relative group">
                <img src={config.iconBase64} alt="Ícone" className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-600" />
                <button onClick={clearIcon}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <X size={12} />
                </button>
              </div>
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-slate-700 border-2 border-dashed border-slate-600 flex items-center justify-center text-slate-500">
                <ImageIcon size={24} />
              </div>
            )}
            <div className="text-[12px] text-slate-400">
              {config.iconBase64 ? 'Ícone carregado ✅' : 'Nenhum ícone selecionado'}
              <br />
              <span className="text-slate-500">Todas as imagens são salvas localmente (base64)</span>
            </div>
          </div>

          {/* Botões de ação */}
          <div className="grid grid-cols-2 gap-2">
            <label className="cursor-pointer flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-xl text-[12px] font-medium transition-colors active:scale-95">
              <Upload size={14} /> Upload Manual
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
            <button onClick={() => setShowExtractor(!showExtractor)}
              className="flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-[12px] font-bold transition-colors active:scale-95">
              <Zap size={14} /> Extrair Automático
            </button>
          </div>

          {/* Painel de extração */}
          {showExtractor && (
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 space-y-3 slide-up">
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Cole o link de um <b>site</b>, da <b>App Store</b> ou da <b>Play Store</b>. O sistema detecta automaticamente e extrai o ícone correto do aplicativo.
              </p>
              <div className="flex gap-2">
                <input type="text" value={extractUrl}
                  onChange={e => setExtractUrl(e.target.value)}
                  placeholder="https://apps.apple.com/... ou play.google.com/..."
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-600" />
                <button onClick={handleExtractIcon} disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700 px-4 py-2.5 rounded-lg font-bold text-sm transition-colors disabled:opacity-50 active:scale-95 flex-shrink-0">
                  {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Globe size={16} />}
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[10px] bg-slate-800 text-slate-500 px-2 py-1 rounded-md">✅ apps.apple.com/...</span>
                <span className="text-[10px] bg-slate-800 text-slate-500 px-2 py-1 rounded-md">✅ play.google.com/...</span>
                <span className="text-[10px] bg-slate-800 text-slate-500 px-2 py-1 rounded-md">✅ nubank.com.br</span>
                <span className="text-[10px] bg-slate-800 text-slate-500 px-2 py-1 rounded-md">✅ qualquer site</span>
              </div>
            </div>
          )}
        </div>

        {/* ─── Preview ─── */}
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-700/50">
            <h2 className="text-sm font-bold flex items-center gap-2 text-slate-300">
              <Smartphone size={16} className="text-slate-400" /> PREVIEW DA NOTIFICAÇÃO
            </h2>
          </div>
          <NotificationPreview config={config} />
        </div>

        {/* ─── Envio ─── */}
        <div className="grid grid-cols-1 gap-4">

          {/* Envio Único */}
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold flex items-center gap-2 text-slate-300">
              <Send size={16} className="text-blue-400" /> ENVIO ÚNICO
            </h3>
            <div>
              <div className="flex justify-between text-[11px] text-slate-500 mb-2">
                <span>Atraso antes do envio</span>
                <span className="text-blue-400 font-bold">{config.delaySeconds}s</span>
              </div>
              <input type="range" min="0" max="120" step="1" value={config.delaySeconds}
                onChange={e => setConfig(prev => ({ ...prev, delaySeconds: parseInt(e.target.value) }))}
                className="w-full" />
              <div className="flex justify-between text-[10px] text-slate-600 mt-1">
                <span>Imediato</span>
                <span>2 min</span>
              </div>
            </div>

            <button onClick={sendWithDelay} disabled={countdown > 0}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold text-sm transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2">
              {countdown > 0 ? (
                <><Clock size={18} className="animate-pulse" /> Enviando em {countdown}s...</>
              ) : (
                <><Send size={18} /> Enviar Notificação</>
              )}
            </button>
          </div>

          {/* Envio Automático */}
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold flex items-center gap-2 text-slate-300">
              <Zap size={16} className="text-amber-400" /> ENVIO AUTOMÁTICO
            </h3>
            <div>
              <label className="block text-[11px] text-slate-500 font-medium mb-1 uppercase">Intervalo (minutos)</label>
              <div className="flex gap-2">
                {[1, 5, 15, 30].map(v => (
                  <button key={v} onClick={() => setAutoConfig(prev => ({ ...prev, intervalMinutes: v }))}
                    disabled={autoConfig.active}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                      autoConfig.intervalMinutes === v
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                    } disabled:opacity-50`}>
                    {v} min
                  </button>
                ))}
                <input type="number" min="1" max="1440"
                  value={autoConfig.intervalMinutes}
                  onChange={e => setAutoConfig(prev => ({ ...prev, intervalMinutes: Math.max(1, parseInt(e.target.value) || 1) }))}
                  disabled={autoConfig.active}
                  className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-xs text-center outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50" />
              </div>
            </div>

            <button onClick={toggleAuto}
              className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-2 ${
                autoConfig.active
                  ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
              }`}>
              {autoConfig.active ? (
                <><Square size={18} /> Parar Envios Automáticos</>
              ) : (
                <><Play size={18} /> Iniciar Envios Automáticos</>
              )}
            </button>

            {autoConfig.active && (
              <p className="text-center text-[11px] text-emerald-400 animate-pulse">
                🔄 Enviando a cada {autoConfig.intervalMinutes} min...
              </p>
            )}
          </div>
        </div>

        {/* ─── Avançado ─── */}
        <button onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between bg-slate-800/40 border border-slate-700/30 rounded-xl px-4 py-3 text-sm text-slate-400 hover:text-slate-300 transition-colors">
          <span className="flex items-center gap-2"><Settings size={14} /> Opções Avançadas</span>
          {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showAdvanced && (
          <div className="bg-slate-800/40 border border-slate-700/30 rounded-2xl p-5 space-y-3 slide-up">
            <button onClick={resetAll}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-xl text-sm transition-colors active:scale-95">
              <RotateCcw size={14} /> Resetar Todas as Configurações
            </button>
            <button onClick={() => {
              setHistory([]);
              saveHistory([]);
              showToast('🗑️ Histórico limpo');
            }}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-800/30 rounded-xl text-sm transition-colors active:scale-95">
              <Trash2 size={14} /> Limpar Todo o Histórico
            </button>
          </div>
        )}

        {/* ─── Histórico ─── */}
        <div className="bg-slate-800/40 border border-slate-700/30 rounded-2xl overflow-hidden">
          <button onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center justify-between px-5 py-3.5 text-sm text-slate-300 hover:bg-slate-800/60 transition-colors">
            <span className="flex items-center gap-2 font-bold">
              <History size={16} className="text-slate-400" /> Histórico
              {history.length > 0 && (
                <span className="bg-blue-600 text-[10px] px-1.5 py-0.5 rounded-full font-bold">{history.length}</span>
              )}
            </span>
            {showHistory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showHistory && (
            <div className="border-t border-slate-700/50 max-h-80 overflow-y-auto">
              {history.length === 0 ? (
                <p className="text-center text-slate-600 text-sm py-8">Nenhuma notificação enviada ainda</p>
              ) : (
                history.map((entry) => (
                  <div key={entry.id} className="flex items-center gap-3 px-4 py-3 border-b border-slate-700/30 hover:bg-slate-800/40">
                    {entry.iconBase64 ? (
                      <img src={entry.iconBase64} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0 text-slate-500">
                        <Bell size={14} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] text-slate-400 truncate">{entry.appName}</p>
                      <p className="text-[13px] font-medium truncate">{entry.title}</p>
                      <p className="text-[11px] text-slate-500 truncate">{entry.body}</p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => restoreFromHistory(entry)}
                        className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors" title="Reutilizar">
                        <RotateCcw size={12} />
                      </button>
                      <button onClick={() => {
                        const newH = history.filter(h => h.id !== entry.id);
                        setHistory(newH);
                        saveHistory(newH);
                      }}
                        className="p-2 bg-slate-700 hover:bg-red-600 rounded-lg transition-colors" title="Excluir">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-slate-700 pb-4">
          NotifyPro © {new Date().getFullYear()} — Suas configurações são salvas automaticamente no navegador
        </p>
      </div>
    </div>
  );
}
