import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Bot, 
  AlertTriangle, 
  AlertCircle, 
  ShieldCheck, 
  TrendingDown, 
  Plus, 
  ClipboardList, 
  Trash2, 
  Edit3, 
  ShoppingCart, 
  ChevronRight,
  Sparkles,
  Layers,
  ArrowUpDown
} from 'lucide-react';
import { InventoryItem, InventoryCategory, SafetyStatus } from '../types/inventory';
import { 
  determineSafetyStatus, 
  calculateDaysRemaining, 
  formatKRW, 
  computeRuleBasedRecommendation 
} from '../utils/inventoryCalculations';

interface InventoryTableProps {
  items: InventoryItem[];
  onSelectItemForAi: (item: InventoryItem) => void;
  onOpenQuickLogForItem: (item: InventoryItem) => void;
  onEditItem: (item: InventoryItem) => void;
  onDeleteItem: (itemId: string) => void;
  onAddToPo: (item: InventoryItem, qty: number) => void;
  activeStatusFilter: '전체' | '위험' | '주의' | '안전';
  onFilterStatus: (status: '전체' | '위험' | '주의' | '안전') => void;
}

const CATEGORIES: Array<'전체' | InventoryCategory> = [
  '전체',
  '욕실 어메니티',
  '객실 소모품',
  '침구 및 린넨',
  '위생 & 하우스키핑',
  '식음료 & 미니바',
  '기타 비품',
];

export const InventoryTable: React.FC<InventoryTableProps> = ({
  items,
  onSelectItemForAi,
  onOpenQuickLogForItem,
  onEditItem,
  onDeleteItem,
  onAddToPo,
  activeStatusFilter,
  onFilterStatus,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'전체' | InventoryCategory>('전체');
  const [onlyNeedRestock, setOnlyNeedRestock] = useState(false);
  const [sortBy, setSortBy] = useState<'days' | 'stock' | 'name'>('days');

  // Filter items
  const filteredItems = items.filter((item) => {
    // Search filter
    const matchesSearch = 
      item.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.notes && item.notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.location && item.location.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.supplier && item.supplier.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    // Category filter
    if (selectedCategory !== '전체' && item.category !== selectedCategory) {
      return false;
    }

    // Status filter
    const currentStatus = item.lastAiAnalysis?.statusAssessment.safetyStatus ||
      determineSafetyStatus(item.currentStock, item.safetyStockLevel, item.dailyConsumptionRate, item.leadTimeDays);

    if (activeStatusFilter !== '전체' && currentStatus !== activeStatusFilter) {
      return false;
    }

    // Only restock needed filter
    if (onlyNeedRestock) {
      const isNeeded = item.lastAiAnalysis?.restockRecommendation.isNeeded ??
        (item.currentStock <= item.safetyStockLevel + (item.dailyConsumptionRate * item.leadTimeDays));
      if (!isNeeded) return false;
    }

    return true;
  });

  // Sort items
  const sortedItems = [...filteredItems].sort((a, b) => {
    if (sortBy === 'days') {
      const daysA = a.lastAiAnalysis?.statusAssessment.estimatedDaysRemaining ?? 
        calculateDaysRemaining(a.currentStock, a.dailyConsumptionRate);
      const daysB = b.lastAiAnalysis?.statusAssessment.estimatedDaysRemaining ?? 
        calculateDaysRemaining(b.currentStock, b.dailyConsumptionRate);
      return daysA - daysB;
    }
    if (sortBy === 'stock') {
      return a.currentStock - b.currentStock;
    }
    return a.itemName.localeCompare(b.itemName);
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden mb-12">
      {/* Controls & Filter Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-900/90 space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="품목명, 특이사항, 보관위치, 납품업체 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 bg-slate-950/80 border border-slate-800 px-3 py-2 rounded-xl cursor-pointer hover:border-slate-700">
              <input
                type="checkbox"
                checked={onlyNeedRestock}
                onChange={(e) => setOnlyNeedRestock(e.target.checked)}
                className="w-4 h-4 rounded text-rose-500 focus:ring-0 focus:ring-offset-0 bg-slate-900 border-slate-700"
              />
              <span className="text-rose-400">🚨 발주 필요 품목만 보기</span>
            </label>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-xl text-xs text-slate-300">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-500">정렬:</span>
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="bg-transparent border-none text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="days" className="bg-slate-900">잔여일수 적은순 (위험순)</option>
                <option value="stock" className="bg-slate-900">재고 수량 적은순</option>
                <option value="name" className="bg-slate-900">품목명 순</option>
              </select>
            </div>
          </div>
        </div>

        {/* Category Pills & Status Tabs */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between pt-1">
          {/* Categories */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                    : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Status Segment */}
          <div className="flex items-center gap-1 bg-slate-950/90 p-1 rounded-xl border border-slate-800 self-end sm:self-auto">
            {(['전체', '위험', '주의', '안전'] as const).map((status) => (
              <button
                key={status}
                onClick={() => onFilterStatus(status)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  activeStatusFilter === status
                    ? status === '위험'
                      ? 'bg-rose-500 text-white shadow-sm'
                      : status === '주의'
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : status === '안전'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table Data */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <th className="py-3.5 px-4">품목명 / 카테고리</th>
              <th className="py-3.5 px-4">현재 재고 vs 안전재고</th>
              <th className="py-3.5 px-4">일일 소진율</th>
              <th className="py-3.5 px-4 text-center">예상 잔여일</th>
              <th className="py-3.5 px-4 text-center">안전 상태</th>
              <th className="py-3.5 px-4">AI 발주 추천</th>
              <th className="py-3.5 px-4 text-right">의사결정 작업</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70 text-xs sm:text-sm">
            {sortedItems.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-500">
                  조건에 일치하는 호텔 비품이 없습니다.
                </td>
              </tr>
            ) : (
              sortedItems.map((item) => {
                const analysis = item.lastAiAnalysis || computeRuleBasedRecommendation(item);
                const status = analysis.statusAssessment.safetyStatus;
                const daysRemaining = analysis.statusAssessment.estimatedDaysRemaining;
                const isNeeded = analysis.restockRecommendation.isNeeded;
                const recommendedQty = analysis.restockRecommendation.recommendedQuantity;

                // Stock vs Safety ratio for progress bar
                const stockRatio = item.safetyStockLevel > 0 
                  ? Math.min(200, Math.round((item.currentStock / item.safetyStockLevel) * 100))
                  : 100;

                const statusBadgeStyle = {
                  위험: 'bg-rose-500/10 text-rose-400 border border-rose-500/30',
                  주의: 'bg-amber-500/10 text-amber-400 border border-amber-500/30',
                  안전: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30',
                }[status];

                const StatusIcon = status === '위험' ? AlertTriangle : status === '주의' ? AlertCircle : ShieldCheck;

                return (
                  <tr 
                    key={item.id}
                    className="hover:bg-slate-800/40 transition-colors group"
                  >
                    {/* Item Name & Details */}
                    <td className="py-4 px-4 max-w-xs">
                      <div className="font-semibold text-white group-hover:text-amber-400 transition-colors flex items-center gap-1.5">
                        <span>{item.itemName}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                          {item.category}
                        </span>
                        {item.location && (
                          <span className="text-slate-400 truncate max-w-[120px]" title={item.location}>
                            {item.location}
                          </span>
                        )}
                        {item.unitCost > 0 && (
                          <span className="text-slate-400">
                            {formatKRW(item.unitCost)}/{item.unit}
                          </span>
                        )}
                      </div>
                      {item.notes && (
                        <div className="text-[11px] text-amber-400/90 mt-1 line-clamp-1 italic" title={item.notes}>
                          ※ {item.notes}
                        </div>
                      )}
                    </td>

                    {/* Stock & Gauge */}
                    <td className="py-4 px-4 min-w-[180px]">
                      <div className="flex items-baseline justify-between mb-1">
                        <span className="font-bold text-slate-100 text-sm">
                          {item.currentStock.toLocaleString()}{' '}
                          <span className="text-xs font-normal text-slate-400">{item.unit}</span>
                        </span>
                        <span className="text-[11px] text-slate-400">
                          기준: <strong className="text-slate-300">{item.safetyStockLevel}</strong>{item.unit}
                        </span>
                      </div>
                      
                      {/* Gauge Bar */}
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden relative">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            status === '위험' 
                              ? 'bg-rose-500' 
                              : status === '주의' 
                              ? 'bg-amber-400' 
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, (item.currentStock / (item.safetyStockLevel * 1.5 || 1)) * 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1">
                        <span>충족률 {stockRatio}%</span>
                        {item.recentDisposal > 0 && (
                          <span className="text-rose-400 font-medium">
                            최근폐기: {item.recentDisposal}{item.unit}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Daily Consumption */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-200">
                        {item.dailyConsumptionRate} <span className="text-xs font-normal text-slate-400">{item.unit}/일</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        주간 {Math.round(item.dailyConsumptionRate * 7)}{item.unit}
                      </div>
                    </td>

                    {/* Days Remaining */}
                    <td className="py-4 px-4 text-center whitespace-nowrap">
                      <div className={`inline-block font-extrabold text-sm px-2.5 py-1 rounded-lg ${
                        daysRemaining <= item.leadTimeDays 
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                          : daysRemaining <= item.leadTimeDays * 2
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-slate-800 text-slate-200'
                      }`}>
                        {daysRemaining}일
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        리드타임 {item.leadTimeDays}일
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-4 px-4 text-center whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${statusBadgeStyle}`}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {status}
                      </span>
                    </td>

                    {/* AI Restock Recommendation */}
                    <td className="py-4 px-4 min-w-[190px]">
                      {isNeeded ? (
                        <div>
                          <div className="flex items-center gap-1.5 text-xs font-bold text-rose-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            추천: {recommendedQty.toLocaleString()} {item.unit}
                          </div>
                          <div className="text-[11px] text-slate-300 mt-0.5 font-medium truncate" title={analysis.restockRecommendation.recommendedTiming}>
                            시점: {analysis.restockRecommendation.recommendedTiming}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[200px]" title={analysis.restockRecommendation.keyReason}>
                            {analysis.restockRecommendation.keyReason}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            발주 불필요 (보유 충분)
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 truncate" title={analysis.restockRecommendation.recommendedTiming}>
                            {analysis.restockRecommendation.recommendedTiming}
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onSelectItemForAi(item)}
                          className="px-2.5 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 hover:text-white border border-indigo-500/30 rounded-lg text-xs font-semibold transition-all flex items-center gap-1"
                          title="호텔 3대 항목 AI 정밀 의사결정 브리핑 확인"
                        >
                          <Bot className="w-3.5 h-3.5" />
                          <span>AI 진단</span>
                        </button>

                        <button
                          onClick={() => onOpenQuickLogForItem(item)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors border border-slate-700"
                          title="수불/폐기 내역 기록"
                        >
                          <ClipboardList className="w-3.5 h-3.5 text-emerald-400" />
                        </button>

                        <button
                          onClick={() => onAddToPo(item, isNeeded ? recommendedQty : (item.safetyStockLevel || 100))}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-400 rounded-lg transition-colors border border-slate-700"
                          title="발주서 목록에 추가"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => onEditItem(item)}
                          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                          title="기본 정보 수정"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => onDeleteItem(item.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                          title="품목 삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
