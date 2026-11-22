import React from 'react';
import {
  Boxes,
  ClipboardEdit,
  ShoppingCart,
  Sparkles,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import { AppView, InventoryItem } from '../types/inventory';
import { determineSafetyStatus } from '../utils/inventoryCalculations';
import { InfoTip } from './InfoTip';
import { PWAInstallButton } from './PWAInstallButton';

interface HomeHubProps {
  items: InventoryItem[];
  cartCount: number;
  onNavigate: (view: AppView) => void;
}

export const HomeHub: React.FC<HomeHubProps> = ({ items, cartCount, onNavigate }) => {
  const criticalCount = items.filter((it) => {
    const status =
      it.lastAiAnalysis?.statusAssessment.safetyStatus ||
      determineSafetyStatus(it.currentStock, it.safetyStockLevel, it.dailyConsumptionRate, it.leadTimeDays);
    return status === '위험';
  }).length;

  const restockRecommendedCount = items.filter((it) => {
    return (
      it.lastAiAnalysis?.restockRecommendation.isNeeded ??
      it.currentStock <= it.safetyStockLevel + it.dailyConsumptionRate * it.leadTimeDays
    );
  }).length;

  const cards: Array<{
    id: AppView;
    title: string;
    metric: string;
    accent: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    {
      id: 'inventory',
      title: '재고확인',
      metric: `전체 ${items.length}종 · 부족 ${criticalCount}종`,
      accent: 'bg-slate-900 text-white',
      icon: Boxes,
    },
    {
      id: 'log',
      title: '재고기록',
      metric: '사용 · 입고 · 폐기',
      accent: 'bg-emerald-700 text-white',
      icon: ClipboardEdit,
    },
    {
      id: 'order',
      title: '발주',
      metric: `추천 ${restockRecommendedCount}종 · 장바구니 ${cartCount}종`,
      accent: 'bg-amber-600 text-white',
      icon: ShoppingCart,
    },
    {
      id: 'scenario',
      title: '시나리오',
      metric: '예약 · 행사 맞춤 예측',
      accent: 'bg-indigo-700 text-white',
      icon: Sparkles,
    },
  ];

  return (
    <section className="max-w-3xl mx-auto py-4 sm:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            무엇을 할까요?
          </h2>
          <InfoTip
            title="메뉴 안내"
            text={`• 재고확인: 전체 비품 수량과 부족 품목 확인\n• 재고기록: 오늘 사용한 수량이나 입고·폐기 등록\n• 발주: AI 추천 품목 확인 및 장바구니 발주\n• 시나리오: 예약·비수기·축제 상황 입력 후 필요 재고 예측`}
          />
        </div>

        <div className="flex items-center gap-2">
          <PWAInstallButton />
          {criticalCount > 0 && (
            <button
              type="button"
              onClick={() => onNavigate('inventory')}
              className="min-h-[40px] px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold flex items-center gap-1.5 hover:bg-rose-100 transition-colors whitespace-nowrap shrink-0"
            >
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span className="tabular-nums">부족 {criticalCount}건</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => onNavigate(card.id)}
              className="group bg-white border border-slate-200 hover:border-slate-400 rounded-2xl p-4 sm:p-6 text-left transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 flex items-center justify-between min-h-[136px] sm:min-h-[156px]"
            >
              <div className="space-y-3 min-w-0">
                <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl ${card.accent} flex items-center justify-center`}>
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="min-w-0">
                  <div className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight truncate">
                    {card.title}
                  </div>
                  <div className="text-xs sm:text-sm text-slate-500 mt-1 tabular-nums truncate">
                    {card.metric}
                  </div>
                </div>
              </div>

              <ChevronRight className="hidden sm:block w-5 h-5 text-slate-300 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all shrink-0" />
            </button>
          );
        })}
      </div>
    </section>
  );
};
