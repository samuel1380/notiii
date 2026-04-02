import type { NotifyConfig } from '../lib/storage';

interface Props {
  config: NotifyConfig;
}

export default function NotificationPreview({ config }: Props) {
  const hasIcon = !!config.iconBase64;

  return (
    <div className="rounded-2xl overflow-hidden">
      {/* Android Preview */}
      <div className="bg-[#1e1e1e] p-4 space-y-3">
        <div className="flex items-center gap-2 text-[11px] text-gray-400 font-medium tracking-wide uppercase">
          <span>Android</span>
          <span className="text-gray-600">•</span>
          <span>agora</span>
        </div>
        <div className="bg-[#2d2d2d] rounded-2xl p-3.5 flex gap-3">
          {hasIcon ? (
            <img src={config.iconBase64} alt="" className="w-11 h-11 rounded-xl object-cover flex-shrink-0" />
          ) : (
            <div className="w-11 h-11 rounded-xl bg-gray-600 flex items-center justify-center flex-shrink-0 text-gray-300 text-lg">📱</div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              {hasIcon && <img src={config.iconBase64} alt="" className="w-3.5 h-3.5 rounded-sm" />}
              <span className="text-[11px] text-gray-400 font-medium truncate">{config.appName || 'App'}</span>
              <span className="text-[11px] text-gray-500">• agora</span>
            </div>
            <p className="text-white text-[13px] font-semibold truncate leading-tight">{config.title || 'Título'}</p>
            <p className="text-gray-300 text-[12px] leading-tight mt-0.5 line-clamp-2">{config.body || 'Descrição da notificação...'}</p>
            {config.showFrom && config.fromText && (
              <p className="text-gray-500 text-[11px] mt-1">de: {config.fromText}</p>
            )}
          </div>
        </div>
      </div>

      {/* Divisor */}
      <div className="h-px bg-gray-700" />

      {/* iOS Preview */}
      <div className="bg-[#1c1c1e] p-4 space-y-3">
        <div className="flex items-center gap-2 text-[11px] text-gray-400 font-medium tracking-wide uppercase">
          <span>iPhone</span>
          <span className="text-gray-600">•</span>
          <span>agora</span>
        </div>
        <div className="bg-[#2c2c2e] rounded-2xl p-3.5 space-y-1">
          <div className="flex items-center gap-2 mb-1">
            {hasIcon ? (
              <img src={config.iconBase64} alt="" className="w-5 h-5 rounded-md" />
            ) : (
              <div className="w-5 h-5 rounded-md bg-gray-600 flex items-center justify-center text-[10px]">📱</div>
            )}
            <span className="text-gray-400 text-[12px] font-medium uppercase tracking-wide flex-1 truncate">
              {config.appName || 'APP'}
            </span>
            <span className="text-gray-500 text-[11px]">agora</span>
          </div>
          <p className="text-white text-[14px] font-semibold leading-tight">{config.title || 'Título'}</p>
          <p className="text-gray-300 text-[13px] leading-tight line-clamp-3">{config.body || 'Descrição da notificação...'}</p>
          {config.showFrom && config.fromText && (
            <p className="text-gray-500 text-[11px] mt-1 italic">de: {config.fromText}</p>
          )}
          <div className="pt-2 border-t border-gray-700 mt-2">
            <p className="text-gray-500 text-[10px]">
              from <span className="font-medium">{config.pwaDisplayName || 'Notificações'}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
