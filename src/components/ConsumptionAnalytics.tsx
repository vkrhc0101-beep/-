import React from 'react';
import { 
  TrendingUp, 
  Trash2, 
  AlertTriangle, 
  Boxes, 
  BarChart3, 
  PieChart, 
  Sparkles,
  ShieldAlert,
  Clock
} from 'lucide-react';
import { InventoryItem } from '../types/inventory';
import { formatKRW } from '../utils/inventoryCalculations';

interface ConsumptionAnalyticsProps {
  items: InventoryItem[];
  onSelectItemForAi: (item: InventoryItem) => void;
}

export const ConsumptionAnalytics: React.FC<ConsumptionAnalyticsProps> = ({
  items,
  onSelectItemForAi,
}) => {
  // Sort by daily consumption rate
  const topConsumed = [...items].sort((a, b) => b.dailyConsumptionRate - a.dailyConsumptionRate).slice(0, 5);

  // Items with recent disposal
  const highDisposal = [...items].filter((i) => i.recentDisposal > 0).sort((a, b) => b.recentDisposal - a.recentDisposal);

  // Category breakdown
  const categoryStats = items.reduce((acc, it) => {
    if (!acc[it.category]) {
      acc[it.category] = { count: 0, totalStock: 0, totalDailyRate: 0 };
    }
    acc[it.category].count += 1;
    acc[it.category].totalStock += it.currentStock;
    acc[it.category].totalDailyRate += it.dailyConsumptionRate;
    return acc;
  }, {} as Record<string, { count: number; totalStock: number; totalDailyRate: number }>);

  return (
    <div className="space-y-6 mb-12">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            호텔 비품 소비 패턴 & 폐기 감모 분석 리포트
          </h3>
          <p className="text-xs text-slate-400">
            직원 수불 데이터와 폐기 기록을 바탕으로 소진 속도 및 불용 손실 요인을 다각도로 분석합니다.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Card 1: Top Consumed Items */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" />
              일일 최다 소진 비품 TOP 5
            </h4>
            <span className="text-[11px] text-slate-500">일일 소진율 기준</span>
          </div>

          <div className="space-y-3.5">
            {topConsumed.map((item, idx) => {
              const maxRate = topConsumed[0]?.dailyConsumptionRate || 1;
              const pct = Math.round((item.dailyConsumptionRate / maxRate) * 100);

              return (
                <div 
                  key={item.id}
                  onClick={() => onSelectItemForAi(item)}
                  className="cursor-pointer group hover:bg-slate-800/40 p-2 rounded-xl transition-colors"
                >
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="font-semibold text-slate-200 group-hover:text-amber-400 transition-colors flex items-center gap-1.5 truncate max-w-[170px]">
                      <span className="w-4 text-slate-500 font-mono text-[11px]">{idx + 1}.</span>
                      {item.itemName}
                    </span>
                    <span className="font-bold text-slate-100">
                      {item.dailyConsumptionRate} {item.unit}/일
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-indigo-500 h-full rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Card 2: Waste & Disposal Hotspots */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
              <Trash2 className="w-4 h-4" />
              폐기 및 불량 감모 요인 점검
            </h4>
            <span className="text-[11px] text-rose-400/80 font-semibold">
              총 {highDisposal.reduce((s, i) => s + i.recentDisposal, 0)}건 발생
            </span>
          </div>

          {highDisposal.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              최근 보고된 폐기 및 불량 감모 내역이 없습니다.
            </div>
          ) : (
            <div className="space-y-3">
              {highDisposal.slice(0, 4).map((item) => (
                <div 
                  key={item.id}
                  onClick={() => onSelectItemForAi(item)}
                  className="cursor-pointer group p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 hover:border-rose-900/50 transition-all"
                >
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-200 group-hover:text-rose-300 truncate max-w-[180px]">
                      {item.itemName}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                      폐기 {item.recentDisposal}{item.unit}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                    {item.notes || '보관 중 파손 또는 세탁 불량'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Card 3: Category Distribution */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg md:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Boxes className="w-4 h-4" />
              카테고리별 비품 현황
            </h4>
            <span className="text-[11px] text-slate-500">{Object.keys(categoryStats).length}개 분야</span>
          </div>

          <div className="space-y-3">
            {Object.entries(categoryStats).map(([cat, stats]) => (
              <div key={cat} className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/80">
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="font-semibold text-slate-200">{cat}</span>
                  <span className="text-slate-400 font-mono text-[11px]">{stats.count}개 품목</span>
                </div>
                <div className="flex justify-between items-center text-[11px] text-slate-400">
                  <span>총 재고: <strong className="text-slate-200">{stats.totalStock.toLocaleString()}</strong></span>
                  <span>일일 소진합: <strong className="text-amber-400">{Math.round(stats.totalDailyRate).toLocaleString()}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
