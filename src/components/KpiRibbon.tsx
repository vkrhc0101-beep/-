import React from 'react';
import { 
  AlertTriangle, 
  ShieldCheck, 
  AlertCircle, 
  Boxes, 
  TrendingDown, 
  CreditCard 
} from 'lucide-react';
import { InventoryItem } from '../types/inventory';
import { determineSafetyStatus, formatKRW } from '../utils/inventoryCalculations';

interface KpiRibbonProps {
  items: InventoryItem[];
  onFilterStatus: (status: '전체' | '위험' | '주의' | '안전') => void;
  activeStatusFilter: '전체' | '위험' | '주의' | '안전';
}

export const KpiRibbon: React.FC<KpiRibbonProps> = ({
  items,
  onFilterStatus,
  activeStatusFilter,
}) => {
  const statusCounts = items.reduce(
    (acc, it) => {
      const status = it.lastAiAnalysis?.statusAssessment.safetyStatus || 
        determineSafetyStatus(it.currentStock, it.safetyStockLevel, it.dailyConsumptionRate, it.leadTimeDays);
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    },
    { 안전: 0, 주의: 0, 위험: 0 } as Record<string, number>
  );

  const totalItems = items.length;
  const criticalCount = statusCounts['위험'] || 0;
  const warningCount = statusCounts['주의'] || 0;
  const safeCount = statusCounts['안전'] || 0;

  const safetyRate = totalItems > 0 ? Math.round((safeCount / totalItems) * 100) : 100;

  // Calculate estimated restock budget for items requiring reorder
  const estimatedRestockBudget = items.reduce((sum, it) => {
    const isNeeded = it.lastAiAnalysis?.restockRecommendation.isNeeded ?? 
      (it.currentStock <= it.safetyStockLevel + (it.dailyConsumptionRate * it.leadTimeDays));
    
    if (isNeeded) {
      const recQty = it.lastAiAnalysis?.restockRecommendation.recommendedQuantity ||
        Math.max(0, (it.safetyStockLevel * 1.5 + it.dailyConsumptionRate * 14) - it.currentStock);
      return sum + (recQty * (it.unitCost || 0));
    }
    return sum;
  }, 0);

  // Total daily consumption volume
  const totalDailyConsumption = items.reduce((sum, it) => sum + (it.dailyConsumptionRate || 0), 0);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 my-6">
      {/* Total Items */}
      <div 
        onClick={() => onFilterStatus('전체')}
        className={`bg-slate-900/90 border p-4 rounded-xl cursor-pointer transition-all hover:border-slate-600 ${
          activeStatusFilter === '전체' ? 'border-amber-400/80 ring-2 ring-amber-400/20' : 'border-slate-800'
        }`}
      >
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">총 관리 품목</span>
          <Boxes className="w-4 h-4 text-slate-400" />
        </div>
        <div className="text-2xl font-bold text-white tracking-tight">{totalItems}<span className="text-xs font-normal text-slate-400 ml-1">종</span></div>
        <div className="text-[11px] text-slate-500 mt-1">호텔 비품 및 어메니티</div>
      </div>

      {/* Critical Items (위험) */}
      <div 
        onClick={() => onFilterStatus('위험')}
        className={`bg-rose-950/20 border p-4 rounded-xl cursor-pointer transition-all hover:border-rose-500/60 ${
          activeStatusFilter === '위험' 
            ? 'border-rose-500 ring-2 ring-rose-500/30 bg-rose-950/40' 
            : 'border-rose-900/40'
        }`}
      >
        <div className="flex items-center justify-between text-rose-300 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            즉시 발주 위험
          </span>
          <AlertTriangle className="w-4 h-4 text-rose-400" />
        </div>
        <div className="text-2xl font-bold text-rose-400 tracking-tight">{criticalCount}<span className="text-xs font-normal text-rose-300/80 ml-1">품목</span></div>
        <div className="text-[11px] text-rose-300/60 mt-1">소진 임박 및 안전재고 미달</div>
      </div>

      {/* Warning Items (주의) */}
      <div 
        onClick={() => onFilterStatus('주의')}
        className={`bg-amber-950/20 border p-4 rounded-xl cursor-pointer transition-all hover:border-amber-500/60 ${
          activeStatusFilter === '주의' 
            ? 'border-amber-500 ring-2 ring-amber-500/30 bg-amber-950/40' 
            : 'border-amber-900/40'
        }`}
      >
        <div className="flex items-center justify-between text-amber-300 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">발주 주의/관찰</span>
          <AlertCircle className="w-4 h-4 text-amber-400" />
        </div>
        <div className="text-2xl font-bold text-amber-400 tracking-tight">{warningCount}<span className="text-xs font-normal text-amber-300/80 ml-1">품목</span></div>
        <div className="text-[11px] text-amber-300/60 mt-1">3~4일 내 발주 필요</div>
      </div>

      {/* Safe Items (안전) */}
      <div 
        onClick={() => onFilterStatus('안전')}
        className={`bg-emerald-950/20 border p-4 rounded-xl cursor-pointer transition-all hover:border-emerald-500/60 ${
          activeStatusFilter === '안전' 
            ? 'border-emerald-500 ring-2 ring-emerald-500/30 bg-emerald-950/40' 
            : 'border-emerald-900/40'
        }`}
      >
        <div className="flex items-center justify-between text-emerald-300 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">안전 재고 확보</span>
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="text-2xl font-bold text-emerald-400 tracking-tight">{safeCount}<span className="text-xs font-normal text-emerald-300/80 ml-1">품목 ({safetyRate}%)</span></div>
        <div className="text-[11px] text-emerald-300/60 mt-1">완충 버퍼 충분</div>
      </div>

      {/* Total Daily Consumption */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">일일 총소진율</span>
          <TrendingDown className="w-4 h-4 text-blue-400" />
        </div>
        <div className="text-2xl font-bold text-white tracking-tight">{Math.round(totalDailyConsumption).toLocaleString()}<span className="text-xs font-normal text-slate-400 ml-1">단위/일</span></div>
        <div className="text-[11px] text-slate-500 mt-1">주간 약 {Math.round(totalDailyConsumption * 7).toLocaleString()}개 소진</div>
      </div>

      {/* Recommended Restock Budget */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">권장 발주 총예산</span>
          <CreditCard className="w-4 h-4 text-amber-400" />
        </div>
        <div className="text-xl font-bold text-amber-300 tracking-tight truncate">{formatKRW(estimatedRestockBudget)}</div>
        <div className="text-[11px] text-slate-500 mt-1">부족 위험 {criticalCount + warningCount}품목 소요분</div>
      </div>
    </div>
  );
};
