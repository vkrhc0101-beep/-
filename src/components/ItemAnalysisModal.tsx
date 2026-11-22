import React, { useState, useEffect } from 'react';
import {
  X,
  RefreshCw,
  ShoppingCart,
  AlertTriangle,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import { InventoryItem, AiAnalysisResult } from '../types/inventory';
import { formatKRW, computeRuleBasedRecommendation } from '../utils/inventoryCalculations';
import { InfoTip } from './InfoTip';

interface ItemAnalysisModalProps {
  item: InventoryItem | null;
  onClose: () => void;
  onUpdateItemAi: (itemId: string, result: AiAnalysisResult) => void;
  onAddToPo: (item: InventoryItem, qty: number) => void;
}

export const ItemAnalysisModal: React.FC<ItemAnalysisModalProps> = ({
  item,
  onClose,
  onUpdateItemAi,
  onAddToPo,
}) => {
  const [loading, setLoading] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'history'>('summary');
  const [currentAnalysis, setCurrentAnalysis] = useState<AiAnalysisResult | null>(null);

  useEffect(() => {
    if (item) {
      setCurrentAnalysis(item.lastAiAnalysis || computeRuleBasedRecommendation(item));
      setActiveTab('summary');
      setAddedToCart(false);
    }
  }, [item]);

  if (!item || !currentAnalysis) return null;

  const handleRunAiAnalysis = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/gemini/analyze-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemName: item.itemName,
          category: item.category,
          currentStock: item.currentStock,
          dailyConsumptionRate: item.dailyConsumptionRate,
          safetyStockLevel: item.safetyStockLevel,
          unit: item.unit,
          unitCost: item.unitCost,
          leadTimeDays: item.leadTimeDays,
          recentDisposal: item.recentDisposal,
          notes: item.notes,
        }),
      });
      if (!res.ok) throw new Error('Request failed');
      const data: AiAnalysisResult = await res.json();
      setCurrentAnalysis(data);
      onUpdateItemAi(item.id, data);
    } catch {
      const fallback = computeRuleBasedRecommendation(item);
      setCurrentAnalysis(fallback);
      onUpdateItemAi(item.id, fallback);
    } finally {
      setLoading(false);
    }
  };

  const status = currentAnalysis.statusAssessment.safetyStatus;
  const StatusIcon =
    status === '위험' ? AlertTriangle : status === '주의' ? AlertCircle : ShieldCheck;
  const statusTextColor =
    status === '위험' ? 'text-rose-600' : status === '주의' ? 'text-amber-600' : 'text-emerald-600';

  const recQty =
    currentAnalysis.restockRecommendation.recommendedQuantity ||
    Math.max(10, item.safetyStockLevel);

  const handleAdd = () => {
    onAddToPo(item, recQty);
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-t-3xl sm:rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              <span>{item.category}</span>
              <span aria-hidden="true">·</span>
              <span className={`font-bold flex items-center gap-1 ${statusTextColor}`}>
                <StatusIcon className="w-3.5 h-3.5" />
                {status}
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 truncate mt-0.5">
              {item.itemName}
            </h2>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleRunAiAnalysis}
              disabled={loading}
              className="min-h-[40px] px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? '분석 중' : '다시 분석'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="닫기"
              className="min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-400 hover:text-slate-900 rounded-xl"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-5 border-b border-slate-100 flex gap-6 text-sm font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('summary')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'summary'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            AI 요약
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`py-3 border-b-2 transition-colors tabular-nums ${
              activeTab === 'history'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            기록 ({item.logs?.length || 0})
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 text-sm">
          {/* Metrics */}
          <div className="grid grid-cols-3 gap-3 text-center bg-slate-50 rounded-xl p-3 border border-slate-100 tabular-nums">
            <div>
              <span className="text-xs text-slate-500 block">현재 재고</span>
              <span className="text-base font-bold text-slate-900">
                {item.currentStock.toLocaleString()}{item.unit}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">남은 일수</span>
              <span className={`text-base font-bold ${statusTextColor}`}>
                약 {currentAnalysis.statusAssessment.estimatedDaysRemaining}일
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">하루 사용</span>
              <span className="text-base font-bold text-slate-900">
                {item.dailyConsumptionRate}{item.unit}
              </span>
            </div>
          </div>

          {activeTab === 'summary' ? (
            <div className="space-y-4">
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold text-slate-500">상태 요약</span>
                  <InfoTip text="현재 재고, 안전 재고, 배송 소요일(리드타임)을 함께 계산한 결과입니다." />
                </div>
                <p className="text-slate-800 leading-relaxed">
                  {currentAnalysis.statusAssessment.summary}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-1">
                <span className="text-xs font-bold text-slate-500 block">사용 추세</span>
                <p className="text-slate-800 leading-relaxed">
                  {currentAnalysis.consumptionAnalysis.trendAnalysis}
                </p>
                {currentAnalysis.consumptionAnalysis.details && (
                  <p className="text-xs text-slate-500">
                    {currentAnalysis.consumptionAnalysis.details}
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">발주 추천</span>
                  <span className="text-xs font-semibold text-slate-700">
                    {currentAnalysis.restockRecommendation.recommendedTiming}
                  </span>
                </div>
                <div className="flex items-baseline justify-between tabular-nums">
                  <span className="text-lg font-bold text-slate-900">
                    {currentAnalysis.restockRecommendation.isNeeded
                      ? `${recQty.toLocaleString()}${item.unit} 발주 권장`
                      : '지금은 발주 불필요'}
                  </span>
                  {currentAnalysis.restockRecommendation.isNeeded && (
                    <span className="text-xs text-slate-500">
                      약 {formatKRW(recQty * (item.unitCost || 0))}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {currentAnalysis.restockRecommendation.keyReason}
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {!item.logs || item.logs.length === 0 ? (
                <p className="text-center py-8 text-xs text-slate-400">기록이 없습니다.</p>
              ) : (
                item.logs
                  .slice()
                  .reverse()
                  .map((log) => {
                    const isInbound = log.type === '신규 입고';
                    return (
                      <div key={log.id} className="py-3 flex items-center justify-between">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">
                            {log.type.replace('(소진)', '')}
                          </div>
                          <div className="text-xs text-slate-500">
                            {log.date} · {log.reason || '현장 기록'}
                          </div>
                        </div>
                        <span
                          className={`text-sm font-bold tabular-nums ${
                            isInbound ? 'text-emerald-600' : 'text-slate-800'
                          }`}
                        >
                          {isInbound ? `+${log.quantity}` : `-${log.quantity}`} {item.unit}
                        </span>
                      </div>
                    );
                  })
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100 flex items-center gap-2">
          <button
            type="button"
            onClick={handleAdd}
            className={`flex-1 min-h-[48px] rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
              addedToCart
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-900 hover:bg-slate-800 text-white'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>
              {addedToCart ? '발주 장바구니에 담김' : `${recQty.toLocaleString()}${item.unit} 발주 담기`}
            </span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[48px] px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
