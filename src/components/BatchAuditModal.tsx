import React, { useState } from 'react';
import { 
  X, 
  Bot, 
  Sparkles, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle, 
  RefreshCw, 
  ShoppingCart, 
  DollarSign, 
  Copy, 
  Check 
} from 'lucide-react';
import { InventoryItem, BatchAuditResult } from '../types/inventory';
import { formatKRW } from '../utils/inventoryCalculations';

interface BatchAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: InventoryItem[];
  onAddAllUrgentToPo: (urgentItems: Array<{ item: InventoryItem; qty: number }>) => void;
}

export const BatchAuditModal: React.FC<BatchAuditModalProps> = ({
  isOpen,
  onClose,
  items,
  onAddAllUrgentToPo,
}) => {
  if (!isOpen) return null;

  const [scenario, setScenario] = useState('주말 투숙률 100% (만실) 및 국제 컨퍼런스 연회 개최');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BatchAuditResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [addedAll, setAddedAll] = useState(false);

  const handleRunAudit = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/gemini/batch-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, scenario }),
      });

      if (!res.ok) {
        throw new Error('Batch audit failed');
      }

      const data: BatchAuditResult = await res.json();
      setResult(data);
    } catch (e) {
      console.warn('Batch audit fallback:', e);
      // Fallback
      const critical = items.filter((i) => i.currentStock <= i.safetyStockLevel);
      setResult({
        executiveSummary: `총 ${items.length}개 품목 중 긴급 위험 품목 ${critical.length}건이 감지되었습니다. 주말 만실 대비 욕실 어메니티 및 객실 슬리퍼의 안전 재고가 즉시 소진될 위험이 있습니다.`,
        riskLevel: critical.length >= 3 ? '심각' : '높음',
        urgentItemsToOrder: critical.map((c) => ({
          itemName: c.itemName,
          recommendedQty: Math.max(100, c.safetyStockLevel * 2 - c.currentStock),
          urgency: '긴급',
          reason: `현재 재고(${c.currentStock}${c.unit})가 안전 재고(${c.safetyStockLevel}${c.unit}) 이하로 하락하여 품절 우려`,
        })),
        strategicAdvice: [
          '긴급 위험 품목에 대해 금일 오후 2시 이전 공급사 직납 발주서를 승인하세요.',
          '하우스키핑 린넨실 보관분을 즉시 전수 검수하여 불량 폐기율을 통제하세요.',
          '주말 체크인 피크 전 린넨 카트 적재량을 미리 확보하세요.',
        ],
        estimatedTotalBudget: critical.reduce((sum, c) => sum + (c.unitCost * 300), 0),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddAll = () => {
    if (!result) return;
    const toAdd: Array<{ item: InventoryItem; qty: number }> = [];
    result.urgentItemsToOrder.forEach((urgent) => {
      const match = items.find((i) => i.itemName === urgent.itemName);
      if (match) {
        toAdd.push({ item: match, qty: urgent.recommendedQty });
      }
    });
    onAddAllUrgentToPo(toAdd);
    setAddedAll(true);
    setTimeout(() => setAddedAll(false), 2500);
  };

  const handleCopy = () => {
    if (!result) return;
    const text = `
[호텔 비품 AI 종합 발주 감사 보고서]
시나리오: ${scenario}
위험 등급: ${result.riskLevel}
총괄 요약: ${result.executiveSummary}

[긴급 발주 추천 품목]
${result.urgentItemsToOrder.map((u) => `- ${u.itemName}: ${u.recommendedQty.toLocaleString()}개 (${u.urgency}) - ${u.reason}`).join('\n')}

[행동 지침]
${result.strategicAdvice.map((a, i) => `${i + 1}. ${a}`).join('\n')}

예상 발주 총예산: ${formatKRW(result.estimatedTotalBudget)}
    `.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                  EXECUTIVE BRIEFING
                </span>
                <span className="text-xs text-slate-400">총 {items.length}개 비품 전수 감사</span>
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight mt-0.5">
                호텔 비품 AI 종합 발주 감사 & 경영진 브리핑
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Scenario Selector */}
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800">
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              운영 시나리오 및 호텔 이벤트 설정
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {[
                '주말 투숙률 100% (만실) 및 국제 컨퍼런스 연회 개최',
                '추석/연휴 성수기 가족 투숙객 급증 (어메니티 소비 +40%)',
                '공급업체 명절 연휴 배송 지연 예상 (리드타임 +3일 지연)',
                '평상시 정상 객실 가동률 (평일 78%, 주말 95%)',
              ].map((sc) => (
                <button
                  key={sc}
                  type="button"
                  onClick={() => setScenario(sc)}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                    scenario === sc
                      ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                      : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {sc}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={scenario}
                onChange={(e) => setScenario(e.target.value)}
                placeholder="직접 특이사항 시나리오 입력..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={handleRunAudit}
                disabled={loading}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-lg text-xs font-bold transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>{loading ? 'AI 종합 감사 분석 중...' : 'AI 종합 감사 시작'}</span>
              </button>
            </div>
          </div>

          {/* Results View */}
          {result ? (
            <div className="space-y-4">
              {/* Executive Summary Card */}
              <div className="bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-900 p-5 rounded-xl border border-indigo-500/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" />
                    수석 SCM 분석가 총평
                  </span>
                  <span className={`px-2.5 py-0.5 rounded text-xs font-bold border ${
                    result.riskLevel === '심각' ? 'bg-rose-500/20 text-rose-400 border-rose-500/40' :
                    result.riskLevel === '높음' ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' :
                    'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  }`}>
                    전체 위험도: {result.riskLevel}
                  </span>
                </div>
                <p className="text-sm text-slate-200 leading-relaxed">
                  {result.executiveSummary}
                </p>
                <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400">추천 발주 소요 예상 예산:</span>
                  <span className="text-amber-400 font-bold text-base">
                    {formatKRW(result.estimatedTotalBudget)}
                  </span>
                </div>
              </div>

              {/* Urgent Items To Order */}
              <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    긴급 우선 발주 품목 ({result.urgentItemsToOrder.length}건)
                  </h3>
                  <button
                    onClick={handleAddAll}
                    className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                      addedAll ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                    }`}
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    <span>{addedAll ? '발주서에 전체 추가 완료!' : '발주서에 전체 일괄 담기'}</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {result.urgentItemsToOrder.map((it, idx) => (
                    <div key={idx} className="p-3 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold text-white flex items-center gap-2">
                          <span>{it.itemName}</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40">
                            {it.urgency}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {it.reason}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-amber-400 font-bold text-sm block">
                          +{it.recommendedQty.toLocaleString()}개
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Strategic Advice */}
              <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800">
                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-2.5">
                  호텔 구매팀 & 하우스키핑팀 행동 지침 (Action Plan)
                </h3>
                <ul className="space-y-2 text-xs sm:text-sm text-slate-300">
                  {result.strategicAdvice.map((adv, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-indigo-900/50 text-indigo-300 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span className="leading-relaxed">{adv}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400 border border-dashed border-slate-800 rounded-xl">
              <Bot className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-sm">위 시나리오를 선택한 후 <strong>[AI 종합 감사 시작]</strong> 버튼을 누르세요.</p>
              <p className="text-xs text-slate-500 mt-1">
                전체 비품의 일일 소진율, 최소 안전재고, 납품 리드타임과 특이사항을 정밀 분석합니다.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/90 flex justify-between items-center">
          {result ? (
            <button
              onClick={handleCopy}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border border-slate-700"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '보고서 복사됨' : '감사 결과 텍스트 복사'}</span>
            </button>
          ) : <div />}

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
