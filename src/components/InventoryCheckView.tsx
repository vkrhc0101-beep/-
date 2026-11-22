import React, { useState, useRef } from 'react';
import {
  Search,
  Plus,
  AlertTriangle,
  AlertCircle,
  ShieldCheck,
  Sparkles,
  ClipboardEdit,
  ShoppingCart,
  Edit3,
  Trash2,
  Download,
  Upload,
} from 'lucide-react';
import { InventoryItem, InventoryCategory, SafetyStatus } from '../types/inventory';
import {
  determineSafetyStatus,
  calculateDaysRemaining,
  formatKRW,
  computeRuleBasedRecommendation,
} from '../utils/inventoryCalculations';
import { InfoTip } from './InfoTip';

interface InventoryCheckViewProps {
  items: InventoryItem[];
  activeStatusFilter: '전체' | '위험' | '주의' | '안전';
  onFilterStatus: (status: '전체' | '위험' | '주의' | '안전') => void;
  onSelectItemForAi: (item: InventoryItem) => void;
  onQuickLogItem: (item: InventoryItem) => void;
  onAddItem: () => void;
  onEditItem: (item: InventoryItem) => void;
  onDeleteItem: (itemId: string) => void;
  onAddToPo: (item: InventoryItem, qty: number) => void;
  onImportItems: (imported: InventoryItem[]) => void;
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

export const InventoryCheckView: React.FC<InventoryCheckViewProps> = ({
  items,
  activeStatusFilter,
  onFilterStatus,
  onSelectItemForAi,
  onQuickLogItem,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onAddToPo,
  onImportItems,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'전체' | InventoryCategory>('전체');
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportBackup = () => {
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].itemName) {
          onImportItems(parsed);
        }
      } catch {
        // Ignore invalid JSON file
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const getStatus = (item: InventoryItem): SafetyStatus =>
    item.lastAiAnalysis?.statusAssessment.safetyStatus ||
    determineSafetyStatus(item.currentStock, item.safetyStockLevel, item.dailyConsumptionRate, item.leadTimeDays);

  const statusCounts = items.reduce(
    (acc, it) => {
      const s = getStatus(it);
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    },
    { 위험: 0, 주의: 0, 안전: 0 } as Record<SafetyStatus, number>
  );

  const filteredItems = items
    .filter((item) => {
      const matchesSearch =
        item.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.location && item.location.toLowerCase().includes(searchTerm.toLowerCase()));
      if (!matchesSearch) return false;
      if (selectedCategory !== '전체' && item.category !== selectedCategory) return false;
      if (activeStatusFilter !== '전체' && getStatus(item) !== activeStatusFilter) return false;
      return true;
    })
    .sort((a, b) => {
      const dA = a.lastAiAnalysis?.statusAssessment.estimatedDaysRemaining ?? calculateDaysRemaining(a.currentStock, a.dailyConsumptionRate);
      const dB = b.lastAiAnalysis?.statusAssessment.estimatedDaysRemaining ?? calculateDaysRemaining(b.currentStock, b.dailyConsumptionRate);
      return dA - dB;
    });

  const handleQuickAddPo = (item: InventoryItem, qty: number) => {
    onAddToPo(item, qty);
    setJustAddedId(item.id);
    setTimeout(() => setJustAddedId(null), 1400);
  };

  const statusMeta = {
    위험: {
      icon: AlertTriangle,
      textClass: 'text-rose-700',
      barClass: 'bg-rose-500',
      label: '위험',
    },
    주의: {
      icon: AlertCircle,
      textClass: 'text-amber-700',
      barClass: 'bg-amber-500',
      label: '주의',
    },
    안전: {
      icon: ShieldCheck,
      textClass: 'text-emerald-700',
      barClass: 'bg-emerald-600',
      label: '안전',
    },
  };

  return (
    <div className="space-y-4">
      {/* Page Title & Primary Action */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">총 관리 품목</h2>
          <span className="text-sm font-medium text-slate-500 tabular-nums">{items.length}종</span>
          <InfoTip
            title="재고 상태 기준"
            text={`• 위험: 안전 재고 이하이거나 배송 기간 안에 소진 예상\n• 주의: 곧 발주가 필요한 단계\n• 안전: 여유 재고 충분`}
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={handleExportBackup}
            aria-label="재고 데이터 백업 저장"
            title="백업 저장"
            className="min-h-[44px] px-3 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">백업</span>
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label="백업 파일 불러오기"
            title="백업 불러오기"
            className="min-h-[44px] px-3 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">복원</span>
          </button>
          <button
            type="button"
            onClick={onAddItem}
            className="min-h-[44px] px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>품목 추가</span>
          </button>
        </div>
      </div>

      {/* Compact Status Segmented Strip */}
      <div className="grid grid-cols-4 gap-1 sm:gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
        {(
          [
            { key: '전체', count: items.length },
            { key: '위험', count: statusCounts.위험 },
            { key: '주의', count: statusCounts.주의 },
            { key: '안전', count: statusCounts.안전 },
          ] as const
        ).map(({ key, count }) => {
          const active = activeStatusFilter === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onFilterStatus(key)}
              className={`min-h-[44px] px-1.5 sm:px-2 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1 whitespace-nowrap ${
                active
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>{key}</span>
              <span
                className={`tabular-nums ${
                  key === '위험' && count > 0
                    ? 'text-rose-600'
                    : key === '주의' && count > 0
                    ? 'text-amber-600'
                    : 'text-slate-400'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search & Categories */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="품목명 또는 보관 위치 검색"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full min-h-[44px] bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-900"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap shrink-0 transition-colors ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {filteredItems.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-3">
          <p className="text-sm text-slate-500">해당 조건의 품목이 없습니다.</p>
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setSelectedCategory('전체');
              onFilterStatus('전체');
            }}
            className="min-h-[44px] px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold"
          >
            필터 초기화
          </button>
        </div>
      ) : (
        <>
          {/* Mobile & Tablet Card List */}
          <div className="lg:hidden space-y-3">
            {filteredItems.map((item) => {
              const analysis = item.lastAiAnalysis || computeRuleBasedRecommendation(item);
              const status = analysis.statusAssessment.safetyStatus;
              const daysRemaining = analysis.statusAssessment.estimatedDaysRemaining;
              const isNeeded = analysis.restockRecommendation.isNeeded;
              const recQty = analysis.restockRecommendation.recommendedQuantity || Math.max(10, item.safetyStockLevel);
              const meta = statusMeta[status];
              const StatusIcon = meta.icon;
              const progressPct = Math.min(
                100,
                Math.round((item.currentStock / (item.safetyStockLevel * 1.5 || 1)) * 100)
              );

              return (
                <div
                  key={item.id}
                  className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-base font-bold text-slate-900 truncate">
                        {item.itemName}
                      </h3>
                      <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <span>{item.category}</span>
                        {item.location && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{item.location}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className={`flex items-center gap-1 text-xs font-bold shrink-0 ${meta.textClass}`}>
                      <StatusIcon className="w-4 h-4" />
                      <span>{meta.label}</span>
                    </div>
                  </div>

                  {/* Numbers + Progress */}
                  <div className="space-y-1.5">
                    <div className="flex items-baseline justify-between text-sm tabular-nums">
                      <div>
                        <span className="text-lg font-bold text-slate-900">
                          {item.currentStock.toLocaleString()}
                        </span>
                        <span className="text-xs text-slate-500 ml-1">
                          {item.unit} / 안전 {item.safetyStockLevel.toLocaleString()}
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-slate-700">
                        약 {daysRemaining}일치 · 일 {item.dailyConsumptionRate}{item.unit}
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${meta.barClass}`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Touch Actions */}
                  <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectItemForAi(item)}
                      className="flex-1 min-h-[44px] px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      <span>AI 분석</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onQuickLogItem(item)}
                      className="flex-1 min-h-[44px] px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"
                    >
                      <ClipboardEdit className="w-3.5 h-3.5 text-emerald-600" />
                      <span>기록</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickAddPo(item, recQty)}
                      className={`flex-1 min-h-[44px] px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                        justAddedId === item.id
                          ? 'bg-emerald-600 text-white'
                          : isNeeded
                          ? 'bg-amber-500 hover:bg-amber-600 text-white'
                          : 'bg-slate-900 hover:bg-slate-800 text-white'
                      }`}
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>{justAddedId === item.id ? '담김' : '발주 담기'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onEditItem(item)}
                      aria-label={`${item.itemName} 수정`}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-500 hover:text-slate-900 rounded-xl border border-slate-200"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteItem(item.id)}
                      aria-label={`${item.itemName} 삭제`}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-rose-600 rounded-xl border border-slate-200"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Clean Table */}
          <div className="hidden lg:block bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500">
                  <th className="py-3.5 px-4">품목</th>
                  <th className="py-3.5 px-4">현재 / 안전 재고</th>
                  <th className="py-3.5 px-4 text-right">일 소진</th>
                  <th className="py-3.5 px-4 text-right">잔여일</th>
                  <th className="py-3.5 px-4 text-center">상태</th>
                  <th className="py-3.5 px-4 text-right">작업</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredItems.map((item) => {
                  const analysis = item.lastAiAnalysis || computeRuleBasedRecommendation(item);
                  const status = analysis.statusAssessment.safetyStatus;
                  const daysRemaining = analysis.statusAssessment.estimatedDaysRemaining;
                  const isNeeded = analysis.restockRecommendation.isNeeded;
                  const recQty = analysis.restockRecommendation.recommendedQuantity || Math.max(10, item.safetyStockLevel);
                  const meta = statusMeta[status];
                  const StatusIcon = meta.icon;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{item.itemName}</div>
                        <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                          <span>{item.category}</span>
                          {item.location && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>{item.location}</span>
                            </>
                          )}
                          {item.unitCost > 0 && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="tabular-nums">{formatKRW(item.unitCost)}</span>
                            </>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 tabular-nums">
                        <span className="font-bold text-slate-900">
                          {item.currentStock.toLocaleString()}
                        </span>
                        <span className="text-xs text-slate-500 ml-1">
                          {item.unit} / 안전 {item.safetyStockLevel.toLocaleString()}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right tabular-nums text-slate-700">
                        {item.dailyConsumptionRate} {item.unit}
                      </td>

                      <td className="py-3.5 px-4 text-right tabular-nums font-semibold text-slate-900">
                        {daysRemaining}일
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 text-xs font-bold ${meta.textClass}`}>
                          <StatusIcon className="w-4 h-4" />
                          <span>{meta.label}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onSelectItemForAi(item)}
                            className="min-h-[38px] px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-lg text-xs font-semibold flex items-center gap-1 whitespace-nowrap"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                            <span>AI 분석</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onQuickLogItem(item)}
                            className="min-h-[38px] px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-lg text-xs font-semibold whitespace-nowrap"
                          >
                            기록
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickAddPo(item, recQty)}
                            className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                              justAddedId === item.id
                                ? 'bg-emerald-600 text-white'
                                : isNeeded
                                ? 'bg-amber-500 hover:bg-amber-600 text-white'
                                : 'bg-slate-900 hover:bg-slate-800 text-white'
                            }`}
                          >
                            {justAddedId === item.id ? '담김' : '발주 담기'}
                          </button>
                          <button
                            type="button"
                            onClick={() => onEditItem(item)}
                            aria-label={`${item.itemName} 수정`}
                            className="min-h-[38px] min-w-[38px] flex items-center justify-center text-slate-400 hover:text-slate-800 rounded-lg"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteItem(item.id)}
                            aria-label={`${item.itemName} 삭제`}
                            className="min-h-[38px] min-w-[38px] flex items-center justify-center text-slate-400 hover:text-rose-600 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};
