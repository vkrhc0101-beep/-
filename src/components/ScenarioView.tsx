import React, { useState } from 'react';
import { Sparkles, RefreshCw, ShoppingCart, Check } from 'lucide-react';
import { InventoryItem, ScenarioForecastResult } from '../types/inventory';
import { formatKRW } from '../utils/inventoryCalculations';
import { InfoTip } from './InfoTip';

interface ScenarioViewProps {
  items: InventoryItem[];
  onAddToPo: (item: InventoryItem, qty: number) => void;
  onAddManyToPo: (entries: Array<{ item: InventoryItem; qty: number }>) => void;
}

const EXAMPLE_SCENARIOS = [
  '이번 주말 전 객실 만실이고, 다음 주 근처 불꽃축제로 연박 손님이 많을 예정입니다.',
  '다음 달 평일 비수기라 예약률이 40% 정도로 줄어들 것 같습니다.',
  '명절 연휴가 끼어 있어서 가족 단위 투숙객이 많고 택배 배송이 3일 정도 늦어질 예정입니다.',
];

function computeOfflineScenarioForecast(
  items: InventoryItem[],
  story: string
): ScenarioForecastResult {
  const lower = story.toLowerCase();
  let multiplier = 1.0;
  let demandLabel = '평소 수준 (오프라인 계산)';
  let periodDays = 7;

  if (/(비수기|한산|적음|줄어|취소|감소)/.test(lower)) {
    multiplier = 0.7;
    demandLabel = '평소 대비 약 -30% 감소 예상';
  } else if (/(축제|만실|연휴|성수기|단체|행사|풀부킹|100%|폭증)/.test(lower)) {
    multiplier = 1.45;
    demandLabel = '평소 대비 약 +45% 증가 예상';
  } else if (/(주말|예약 많|증가|연박)/.test(lower)) {
    multiplier = 1.25;
    demandLabel = '평소 대비 약 +25% 증가 예상';
  }

  if (/(2주|보름|14일|한달|월)/.test(lower)) {
    periodDays = 14;
  }

  const leadBonus = /(지연|태풍|명절|폭설|배송)/.test(lower) ? 2 : 0;

  const forecastItems = items.map((it) => {
    const daily = it.dailyConsumptionRate || 1;
    const stock = it.currentStock || 0;
    const safety = it.safetyStockLevel || 0;
    const lead = (it.leadTimeDays || 3) + leadBonus;
    const expectedNeed = Math.ceil(daily * multiplier * periodDays);
    const neededBuffer = expectedNeed + safety * 0.5 + daily * multiplier * lead;
    const recOrder = Math.max(0, Math.ceil(neededBuffer - stock));

    let urgency: '긴급' | '권장' | '여유' = '여유';
    if (stock < expectedNeed * 0.6 || stock <= safety) {
      urgency = '긴급';
    } else if (recOrder > 0) {
      urgency = '권장';
    }

    return {
      itemName: it.itemName,
      unit: it.unit || '개',
      currentStock: stock,
      expectedNeedQty: expectedNeed,
      recommendedOrderQty: recOrder,
      urgency,
      reason:
        recOrder > 0
          ? `${periodDays}일 예상 필요량(${expectedNeed}${it.unit}) 기준 ${recOrder}${it.unit} 추가 발주 권장`
          : `현재 재고(${stock}${it.unit})로 예상 필요량(${expectedNeed}${it.unit})을 감당할 수 있습니다.`,
    };
  });

  const rank: Record<string, number> = { 긴급: 0, 권장: 1, 여유: 2 };
  forecastItems.sort((a, b) => rank[a.urgency] - rank[b.urgency]);

  const totalBudget = forecastItems.reduce((sum, fi) => {
    const matched = items.find((i) => i.itemName === fi.itemName);
    return sum + fi.recommendedOrderQty * (matched?.unitCost || 0);
  }, 0);

  return {
    situationSummary: `"${story}" 상황을 반영해 향후 ${periodDays}일간 예상 필요량과 발주 수량을 계산했습니다.`,
    demandChangeLabel: demandLabel,
    forecastPeriodDays: periodDays,
    items: forecastItems,
    actionTips: [
      forecastItems.some((i) => i.urgency === '긴급')
        ? '긴급 표시된 품목은 오늘 발주 장바구니에 담아 먼저 주문하세요.'
        : '전체 재고가 안정적입니다. 필요한 품목만 골라 담아보세요.',
    ],
    estimatedTotalBudget: totalBudget,
  };
}

export const ScenarioView: React.FC<ScenarioViewProps> = ({
  items,
  onAddToPo,
  onAddManyToPo,
}) => {
  const [story, setStory] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScenarioForecastResult | null>(null);
  const [addedAll, setAddedAll] = useState(false);

  const handleAnalyze = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!story.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/gemini/scenario-forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, story }),
      });

      if (!res.ok) {
        throw new Error('Request failed');
      }

      const data: ScenarioForecastResult = await res.json();
      setResult(data);
    } catch {
      // Offline / fallback calculation so iPad offline mode keeps working
      setResult(computeOfflineScenarioForecast(items, story.trim()));
    } finally {
      setLoading(false);
    }
  };

  const handleAddAllRecommended = () => {
    if (!result) return;
    const entries: Array<{ item: InventoryItem; qty: number }> = [];
    result.items.forEach((rec) => {
      if (rec.recommendedOrderQty > 0) {
        const match = items.find((i) => i.itemName === rec.itemName);
        if (match) {
          entries.push({ item: match, qty: rec.recommendedOrderQty });
        }
      }
    });
    if (entries.length > 0) {
      onAddManyToPo(entries);
      setAddedAll(true);
      setTimeout(() => setAddedAll(false), 2200);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-2">
        <h2 className="text-lg sm:text-xl font-bold text-slate-900">시나리오 예측</h2>
        <InfoTip
          title="시나리오 작성 팁"
          text={`현재 숙소의 상황을 편하게 적어보세요.\n예) 예약률, 비수기/성수기, 주변 축제·행사, 단체 손님, 연휴 배송 지연 등\n적어주신 내용을 바탕으로 필요한 재고와 발주 수량을 계산합니다.`}
        />
      </div>

      {/* Story Input Card */}
      <form
        onSubmit={handleAnalyze}
        className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4"
      >
        <div>
          <label className="block text-sm font-bold text-slate-900 mb-2">
            현재 예약·운영 상황 이야기
          </label>
          <textarea
            rows={4}
            value={story}
            onChange={(e) => setStory(e.target.value)}
            placeholder="예: 이번 주말 방 8개 중 7개가 예약됐고, 다음 주 근처 지역 축제로 손님이 평소보다 많을 것 같아요."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-900 leading-relaxed"
          />
        </div>

        {/* Quick Examples */}
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_SCENARIOS.map((example, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setStory(example)}
              className="min-h-[38px] px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-700 text-left transition-colors"
            >
              {idx === 0 ? '주말 만실 · 축제' : idx === 1 ? '평일 비수기' : '연휴 · 배송 지연'}
            </button>
          ))}
        </div>

        <button
          type="submit"
          disabled={loading || !story.trim()}
          className="w-full sm:w-auto min-h-[48px] px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors"
        >
          {loading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          <span>{loading ? '예상 재고 계산 중...' : '예상 재고·발주 추천 받기'}</span>
        </button>
      </form>

      {/* Results */}
      {result && (
        <div className="space-y-5">
          {/* Summary */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-bold text-indigo-700">
                {result.demandChangeLabel}
              </span>
              <span className="text-xs text-slate-500 tabular-nums">
                예측 기간 {result.forecastPeriodDays}일 · 예상 발주 금액{' '}
                <strong className="text-slate-900">
                  {formatKRW(result.estimatedTotalBudget)}
                </strong>
              </span>
            </div>
            <p className="text-sm text-slate-800 leading-relaxed">
              {result.situationSummary}
            </p>
            {result.actionTips?.length > 0 && (
              <ul className="pt-2 border-t border-slate-100 space-y-1 text-xs sm:text-sm text-slate-600">
                {result.actionTips.map((tip, i) => (
                  <li key={i}>· {tip}</li>
                ))}
              </ul>
            )}
          </div>

          {/* Itemized Forecast & Order Recommendations */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-bold text-slate-900">
                품목별 예상 필요 재고 및 발주 추천
              </h3>

              {result.items.some((i) => i.recommendedOrderQty > 0) && (
                <button
                  type="button"
                  onClick={handleAddAllRecommended}
                  className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                    addedAll
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                >
                  {addedAll ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <ShoppingCart className="w-3.5 h-3.5" />
                  )}
                  <span>{addedAll ? '발주 담기 완료' : '추천 품목 전체 담기'}</span>
                </button>
              )}
            </div>

            <div className="divide-y divide-slate-100">
              {result.items.map((rec, idx) => {
                const matchedItem = items.find((i) => i.itemName === rec.itemName);
                const urgencyColor =
                  rec.urgency === '긴급'
                    ? 'text-rose-600'
                    : rec.urgency === '권장'
                    ? 'text-amber-600'
                    : 'text-emerald-600';

                return (
                  <div
                    key={idx}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">
                          {rec.itemName}
                        </span>
                        <span className={`text-xs font-bold ${urgencyColor}`}>
                          {rec.urgency}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 tabular-nums flex items-center gap-1.5 flex-wrap">
                        <span>
                          현재 {rec.currentStock.toLocaleString()}{rec.unit}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          예상 필요 {rec.expectedNeedQty.toLocaleString()}{rec.unit}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-semibold text-slate-900">
                          추천 발주{' '}
                          {rec.recommendedOrderQty > 0
                            ? `${rec.recommendedOrderQty.toLocaleString()}${rec.unit}`
                            : '불필요'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">{rec.reason}</p>
                    </div>

                    {rec.recommendedOrderQty > 0 && matchedItem && (
                      <button
                        type="button"
                        onClick={() => onAddToPo(matchedItem, rec.recommendedOrderQty)}
                        className="min-h-[44px] px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 self-end sm:self-center"
                      >
                        + 발주 담기
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
