import React, { useState } from 'react';
import {
  ShoppingCart,
  Sparkles,
  Plus,
  Minus,
  Trash2,
  Copy,
  Check,
  Printer,
} from 'lucide-react';
import { InventoryItem } from '../types/inventory';
import { PoItemEntry } from './PurchaseOrderModal';
import { computeRuleBasedRecommendation, formatKRW } from '../utils/inventoryCalculations';
import { InfoTip } from './InfoTip';

interface PurchaseOrderViewProps {
  items: InventoryItem[];
  cart: PoItemEntry[];
  onAddToPo: (item: InventoryItem, qty: number) => void;
  onAddManyToPo: (entries: Array<{ item: InventoryItem; qty: number }>) => void;
  onUpdateQty: (itemId: string, newQty: number) => void;
  onRemoveItem: (itemId: string) => void;
  onClearCart: () => void;
}

export const PurchaseOrderView: React.FC<PurchaseOrderViewProps> = ({
  items,
  cart,
  onAddToPo,
  onAddManyToPo,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
}) => {
  const [copied, setCopied] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().slice(0, 10);
  });
  const [orderNotes, setOrderNotes] = useState('');

  // AI-recommended items needing purchase
  const recommendedList = items
    .map((item) => {
      const analysis = item.lastAiAnalysis || computeRuleBasedRecommendation(item);
      return {
        item,
        analysis,
      };
    })
    .filter(({ analysis }) => analysis.restockRecommendation.isNeeded)
    .sort(
      (a, b) =>
        a.analysis.statusAssessment.estimatedDaysRemaining -
        b.analysis.statusAssessment.estimatedDaysRemaining
    );

  const totalCost = cart.reduce(
    (sum, entry) => sum + entry.quantity * (entry.item.unitCost || 0),
    0
  );

  const handleAddAllRecommended = () => {
    const entries = recommendedList.map(({ item, analysis }) => ({
      item,
      qty: analysis.restockRecommendation.recommendedQuantity || Math.max(10, item.safetyStockLevel),
    }));
    if (entries.length > 0) {
      onAddManyToPo(entries);
    }
  };

  const handleCopyPo = () => {
    if (cart.length === 0) return;
    const lines = [
      `[비품 발주 요청]`,
      `요청일: ${new Date().toISOString().slice(0, 10)} · 희망 납품일: ${deliveryDate}`,
      ...(orderNotes.trim() ? [`메모: ${orderNotes.trim()}`] : []),
      ``,
      ...cart.map(
        (entry, idx) =>
          `${idx + 1}. ${entry.item.itemName} - ${entry.quantity.toLocaleString()}${entry.item.unit} (${formatKRW(
            entry.quantity * (entry.item.unitCost || 0)
          )})`
      ),
      ``,
      `총 ${cart.length}종 / 합계 ${formatKRW(totalCost)}`,
    ].join('\n');

    navigator.clipboard.writeText(lines);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">발주 관리</h2>
          <InfoTip
            title="발주 화면 안내"
            text={`• 왼쪽/상단 AI 추천 품목에서 '+ 담기'를 눌러 장바구니에 추가할 수 있습니다.\n• 장바구니 수량을 조절한 뒤 '발주서 복사'를 누르면 문자나 카톡으로 바로 보낼 수 있습니다.`}
          />
        </div>
      </div>

      {/* Top Priority Grid: AI Recommended Items & Order Cart side-by-side on desktop, stacked at top on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        {/* 1. AI Recommended Purchase Items */}
        <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <h3 className="text-base font-bold text-slate-900">
                구매 필요 AI 추천 품목
              </h3>
              <span className="text-xs font-semibold text-rose-600 tabular-nums">
                {recommendedList.length}종
              </span>
              <InfoTip
                title="추천 기준"
                text="현재 재고, 일일 소진량, 배송 소요일(리드타임), 안전 재고를 계산해 품절 위험이 있는 품목을 자동으로 추립니다."
              />
            </div>

            {recommendedList.length > 0 && (
              <button
                type="button"
                onClick={handleAddAllRecommended}
                className="min-h-[40px] px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0"
              >
                추천 전체 담기
              </button>
            )}
          </div>

          {recommendedList.length === 0 ? (
            <p className="text-sm text-slate-500 py-8 text-center">
              현재 당장 구매가 필요한 품목이 없습니다.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {recommendedList.map(({ item, analysis }) => {
                const recQty =
                  analysis.restockRecommendation.recommendedQuantity ||
                  Math.max(10, item.safetyStockLevel);
                const inCart = cart.some((c) => c.item.id === item.id);
                const status = analysis.statusAssessment.safetyStatus;

                return (
                  <div
                    key={item.id}
                    className="py-3.5 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 truncate">
                          {item.itemName}
                        </span>
                        <span
                          className={`text-xs font-bold shrink-0 ${
                            status === '위험' ? 'text-rose-600' : 'text-amber-600'
                          }`}
                        >
                          {status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 tabular-nums flex items-center gap-1.5 flex-wrap">
                        <span>
                          현재 {item.currentStock.toLocaleString()}{item.unit}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>약 {analysis.statusAssessment.estimatedDaysRemaining}일치</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-semibold text-slate-800">
                          추천 {recQty.toLocaleString()}{item.unit}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onAddToPo(item, recQty)}
                      className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                        inCart
                          ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          : 'bg-slate-900 text-white hover:bg-slate-800'
                      }`}
                    >
                      {inCart ? '+ 추가' : '+ 담기'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 2. Purchase Order Cart */}
        <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-amber-600" />
              <h3 className="text-base font-bold text-slate-900">발주 장바구니</h3>
              <span className="text-xs font-semibold text-slate-500 tabular-nums">
                {cart.length}종
              </span>
            </div>

            {cart.length > 0 && (
              <button
                type="button"
                onClick={onClearCart}
                className="min-h-[40px] px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl"
              >
                비우기
              </button>
            )}
          </div>

          {cart.length === 0 ? (
            <p className="text-sm text-slate-500 py-8 text-center">
              장바구니가 비어 있습니다. 왼쪽 AI 추천이나 재고확인에서 품목을 담아주세요.
            </p>
          ) : (
            <>
              <div className="divide-y divide-slate-100">
                {cart.map((entry) => {
                  const rowCost = entry.quantity * (entry.item.unitCost || 0);
                  return (
                    <div
                      key={entry.item.id}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-900 truncate">
                          {entry.item.itemName}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 tabular-nums flex items-center gap-1.5">
                          <span>{entry.item.supplier || '기본 거래처'}</span>
                          <span aria-hidden="true">·</span>
                          <span>{formatKRW(rowCost)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <div className="inline-flex items-center border border-slate-200 rounded-xl bg-slate-50">
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateQty(entry.item.id, Math.max(1, entry.quantity - 10))
                            }
                            aria-label="수량 감소"
                            className="min-h-[44px] min-w-[40px] flex items-center justify-center text-slate-600 hover:text-slate-900"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={entry.quantity}
                            onChange={(e) =>
                              onUpdateQty(entry.item.id, Math.max(1, Number(e.target.value)))
                            }
                            className="w-16 text-center bg-transparent text-sm font-bold text-slate-900 tabular-nums focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => onUpdateQty(entry.item.id, entry.quantity + 10)}
                            aria-label="수량 증가"
                            className="min-h-[44px] min-w-[40px] flex items-center justify-center text-slate-600 hover:text-slate-900"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => onRemoveItem(entry.item.id)}
                          aria-label={`${entry.item.itemName} 제거`}
                          className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-rose-600 rounded-xl border border-slate-200"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Delivery Date & Note */}
              <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    희망 납품일
                  </label>
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full min-h-[44px] bg-slate-50 border border-slate-200 rounded-xl px-3 text-sm text-slate-900 focus:outline-none focus:border-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    전달 메모
                  </label>
                  <input
                    type="text"
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    placeholder="예: 오전 배송 부탁드립니다"
                    className="w-full min-h-[44px] bg-slate-50 border border-slate-200 rounded-xl px-3 text-sm text-slate-900 focus:outline-none focus:border-slate-900"
                  />
                </div>
              </div>

              {/* Summary & Copy/Print Actions */}
              <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs text-slate-500 block">예상 발주 합계</span>
                  <span className="text-xl font-bold text-slate-900 tabular-nums">
                    {formatKRW(totalCost)}
                  </span>
                </div>

                <div className="flex items-center gap-2 no-print">
                  <button
                    type="button"
                    onClick={handleCopyPo}
                    className="flex-1 sm:flex-none min-h-[44px] px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                    <span>{copied ? '복사됨' : '발주서 복사'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="min-h-[44px] px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap"
                  >
                    <Printer className="w-4 h-4" />
                    <span>인쇄</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
};
