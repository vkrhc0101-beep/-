import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  Download,
  Smartphone,
  X,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const {
    isInstallable,
    isInstalled,
    isIOS,
    isAndroid,
    isSamsungInternet,
    isInAppBrowser,
    install,
    openInChrome,
  } = usePWAInstall();

  const [showGuide, setShowGuide] = useState(false);
  const [deviceTab, setDeviceTab] = useState<'galaxy' | 'ipad'>(isIOS ? 'ipad' : 'galaxy');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const appUrl = typeof window !== 'undefined' ? window.location.origin : '';

  useEffect(() => {
    setDeviceTab(isIOS ? 'ipad' : 'galaxy');
  }, [isIOS]);

  useEffect(() => {
    if (!showGuide || !appUrl) return;
    QRCode.toDataURL(appUrl, {
      width: 180,
      margin: 1,
      color: { dark: '#0f172a', light: '#ffffff' },
    })
      .then((url) => setQrDataUrl(url))
      .catch(() => {});
  }, [showGuide, appUrl]);

  if (isInstalled) {
    return null;
  }

  const handleCopyUrl = () => {
    if (!appUrl) return;
    navigator.clipboard.writeText(appUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const buttonLabel = isInstallable
    ? '앱 설치'
    : isAndroid
    ? '갤럭시 앱 설치'
    : isIOS
    ? '아이패드 설치'
    : '폰·태블릿 설치';

  return (
    <>
      {isInstallable ? (
        <button
          type="button"
          onClick={install}
          className="min-h-[40px] px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{buttonLabel}</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setShowGuide(true)}
          className="min-h-[40px] px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>{buttonLabel}</span>
        </button>
      )}

      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-t-3xl sm:rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                폰 · 태블릿 앱 설치
              </h3>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                aria-label="닫기"
                className="min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-400 hover:text-slate-900 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* KakaoTalk / In-App Browser Direct Escape for Galaxy */}
            {isAndroid && isInAppBrowser && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 space-y-2">
                <p className="text-xs font-semibold text-amber-900 leading-relaxed">
                  카카오톡 등 앱 내부 브라우저에서는 설치가 제한됩니다. Chrome으로 열면 바로 앱으로 설치됩니다.
                </p>
                <button
                  type="button"
                  onClick={openInChrome}
                  className="w-full min-h-[44px] bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Chrome으로 열어서 설치하기</span>
                </button>
              </div>
            )}

            {/* Device Switcher Tabs */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setDeviceTab('galaxy')}
                className={`min-h-[38px] rounded-lg text-xs font-semibold transition-colors ${
                  deviceTab === 'galaxy'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                갤럭시 (안드로이드)
              </button>
              <button
                type="button"
                onClick={() => setDeviceTab('ipad')}
                className={`min-h-[38px] rounded-lg text-xs font-semibold transition-colors ${
                  deviceTab === 'ipad'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                아이패드 · 아이폰
              </button>
            </div>

            {/* QR Code for scanning directly with Galaxy Camera */}
            {qrDataUrl && !isAndroid && !isIOS && (
              <div className="flex flex-col items-center gap-2 py-2 bg-slate-50 rounded-xl border border-slate-100">
                <img
                  src={qrDataUrl}
                  alt="앱 접속 QR 코드"
                  className="w-36 h-36 rounded-lg bg-white p-1.5 border border-slate-200"
                />
                <span className="text-xs text-slate-500">
                  갤럭시 카메라로 스캔하면 바로 열립니다
                </span>
              </div>
            )}

            {deviceTab === 'galaxy' ? (
              <div className="space-y-2.5 text-sm text-slate-700 leading-relaxed">
                <p>
                  1. 갤럭시 <strong>Chrome</strong> 또는 <strong>삼성 인터넷</strong>으로 주소를 엽니다.
                </p>
                <p>
                  2.{' '}
                  {isSamsungInternet ? (
                    <>
                      하단 <strong>≡ 메뉴 → 현재 페이지 추가 → 홈 화면</strong>을 누르세요.
                    </>
                  ) : (
                    <>
                      상단 <strong>앱 설치</strong> 버튼을 누르거나 우측 상단{' '}
                      <strong>⋮ 메뉴 → 앱 설치(홈 화면에 추가)</strong>를 선택하세요.
                    </>
                  )}
                </p>
                <p className="text-xs text-slate-500">
                  설치 후에는 일반 안드로이드 앱처럼 앱 서랍과 홈 화면에 아이콘이 생성됩니다.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 text-sm text-slate-700 leading-relaxed">
                <p>
                  1. 아이패드·아이폰 <strong>Safari</strong>로 주소를 엽니다.
                </p>
                <p>
                  2. 상단 <strong>공유(□↑) → 홈 화면에 추가</strong>를 누르면 앱처럼 바로 실행됩니다.
                </p>
              </div>
            )}

            {appUrl && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between gap-2">
                <span className="text-xs text-slate-600 truncate font-mono">{appUrl}</span>
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="min-h-[36px] px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-800 flex items-center gap-1 shrink-0"
                >
                  {copiedUrl ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedUrl ? '복사됨' : '주소 복사'}</span>
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="w-full min-h-[44px] bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </>
  );
};
