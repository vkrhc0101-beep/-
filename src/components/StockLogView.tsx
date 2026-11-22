import React, { useState, useEffect } from 'react';
import { Check, Minus, Plus } from 'lucide-react';
import { InventoryItem, StockLog } from '../types/inventory';
import { InfoTip } from './InfoTip';

interface StockLogViewProps {
  items: InventoryItem[];
  preselectedItemId?: string | null;
  onAddLog: (itemId: string, log: Omit<StockLog, 'id'>, stockAdjustment: number) => void;
}

const LOG_TYPES: Array<{
  type: StockLog['type'];
  label: string;
  defaultReason: string;
  activeClass: string;
}> = [
  {
    type: '사용(소진)',
    label: '사용',
    defaultReason: '객실 세팅 사용',
    activeClass: 'bg-slate-900 text-white border-slate-900',
  },
  {
    type: '신규 입고',
    label: '입고',
    defaultReason: '발주 입고 완료',
    activeClass: 'bg-emerald-600 text-white border-emerald-600',
  },
  {
    type: '폐기/불량',
    label: '폐기·불량',
    defaultReason: '파손 또는 오염 폐기',
    activeClass: 'bg-rose-600 text-white border-rose-600',
  },
  {
    type: '재고 실사 조정',
    label: '실사 조정',
    defaultReason: '실사 수량 반영',
    activeClass: 'bg-indigo-600 text-white border-indigo-600',
  },
];

export const StockLogView: React.FC<StockLogViewProps> = ({
  items,
  preselectedItemId,
  onAddLog,
}) => {
  const [selectedItemId, setSelectedItemId] = useState<string>(
    preselectedItemId || items[0]?.id || ''
  );
  const [logType, setLogType] = useState<StockLog['type']>('사용(소진)');
  const [quantity, setQuantity] = useState<number>(10);
  const [reason, setReason] = useState<string>('객실 세팅 사용');
  const [recordedBy, setRecordedBy] = useState<string>('매니저');
  const [savedToast, setSavedToast] = useState<string | null>(null);

  useEffect(() => {
    if (preselectedItemId && items.some((i) => i.id === preselectedItemId)) {
      setSelectedItemId(preselectedItemId);
    }
  }, [preselectedItemId, items]);

  const selectedItem = items.find((i) => i.id === selectedItemId) || items[0];

  const handleSelectType = (type: StockLog['type'], defaultReason: string) => {
    setLogType(type);
    setReason(defaultReason);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || quantity === 0) return;

    let stockDelta = 0;
    if (logType === '사용(소진)' || logType === '폐기/불량') {
      stockDelta = -Math.abs(quantity);
    } else if (logType === '신규 입고') {
      stockDelta = Math.abs(quantity);
    } else {
      stockDelta = quantity;
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    onAddLog(
      selectedItem.id,
      {
        date: todayStr,
        type: logType,
        quantity: Math.abs(quantity),
        reason: reason.trim() || '현장 기록',
        recordedBy: recordedBy.trim() || '매니저',
      },
      stockDelta
    );

    setSavedToast(`${selectedItem.itemName} ${stockDelta > 0 ? `+${stockDelta}` : stockDelta}${selectedItem.unit} 반영됨`);
    setTimeout(() => setSavedToast(null), 2600);
  };

  // Recent logs across all items (latest 8)
  const recentLogs = items
    .flatMap((it) =>
      (it.logs || []).map((log) => ({
        ...log,
        itemName: it.itemName,
        unit: it.unit,
      }))
    )
    .sort((a, b) => (b.date > a.date ? 1 : -1))
    .slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">재고 기록</h2>
          <InfoTip
            title="수불·폐기 기록 안내"
            text={`• 사용: 객실 비치 등으로 줄어든 수량\n• 입고: 새로 들어온 수량 (+)\n• 폐기·불량: 파손·오염 등으로 버린 수량\n• 실사 조정: 직접 세어본 차이 수량 반영`}
          />
        </div>

        {savedToast && (
          <div className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5" />
            <span>{savedToast}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        {/* Form Card */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-5 space-y-5"
        >
          {/* Item Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              품목 선택
            </label>
            <select
              value={selectedItem?.id || ''}
              onChange={(e) => setSelectedItemId(e.target.value)}
              className="w-full min-h-[48px] bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:border-slate-900 cursor-pointer"
            >
              {items.map((it) => (
                <option key={it.id} value={it.id}>
                  {it.itemName} (현재 {it.currentStock.toLocaleString()}{it.unit})
                </option>
              ))}
            </select>

            {selectedItem && (
              <div className="mt-2 flex items-center justify-between text-xs text-slate-500 px-1 tabular-nums">
                <span>{selectedItem.category}</span>
                <span>
                  현재 재고 <strong className="text-slate-900">{selectedItem.currentStock.toLocaleString()}{selectedItem.unit}</strong>
                </span>
              </div>
            )}
          </div>

          {/* Log Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              구분
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {LOG_TYPES.map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => handleSelectType(item.type, item.defaultReason)}
                  className={`min-h-[44px] px-3 py-2 rounded-xl text-sm font-semibold border transition-colors whitespace-nowrap ${
                    logType === item.type
                      ? item.activeClass
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity with Mobile Steppers */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              수량 ({selectedItem?.unit || '개'})
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                aria-label="수량 1 감소"
                className="min-h-[48px] min-w-[48px] rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-700"
              >
                <Minus className="w-4 h-4" />
              </button>
              <input
                type="number"
                required
                min={logType === '재고 실사 조정' ? undefined : 1}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="flex-1 min-h-[48px] bg-white border border-slate-200 rounded-xl px-4 py-2 text-center text-lg font-bold text-slate-900 tabular-nums focus:outline-none focus:border-slate-900"
              />
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                aria-label="수량 1 증가"
                className="min-h-[48px] min-w-[48px] rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-700"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-2 mt-2">
              {[5, 10, 30, 50].map((step) => (
                <button
                  key={step}
                  type="button"
                  onClick={() => setQuantity((q) => q + step)}
                  className="flex-1 min-h-[40px] rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 tabular-nums"
                >
                  +{step}
                </button>
              ))}
            </div>
          </div>

          {/* Reason & Staff */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                사유
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="사유 입력"
                className="w-full min-h-[44px] bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                기록자
              </label>
              <input
                type="text"
                value={recordedBy}
                onChange={(e) => setRecordedBy(e.target.value)}
                placeholder="이름"
                className="w-full min-h-[44px] bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-slate-900"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full min-h-[48px] bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors"
          >
            <Check className="w-4 h-4" />
            <span>기록 저장</span>
          </button>
        </form>

        {/* Recent History */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-3">최근 기록</h3>
          {recentLogs.length === 0 ? (
            <p className="text-xs text-slate-400 py-8 text-center">아직 기록이 없습니다.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentLogs.map((log) => {
                const isInbound = log.type === '신규 입고';
                const isWaste = log.type === '폐기/불량';
                return (
                  <div key={log.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 truncate">
                        {log.itemName}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                        <span>{log.type.replace('(소진)', '')}</span>
                        <span aria-hidden="true">·</span>
                        <span>{log.date}</span>
                        {log.reason && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="truncate">{log.reason}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div
                      className={`text-sm font-bold tabular-nums shrink-0 ${
                        isInbound
                          ? 'text-emerald-600'
                          : isWaste
                          ? 'text-rose-600'
                          : 'text-slate-800'
                      }`}
                    >
                      {isInbound ? `+${log.quantity}` : `-${log.quantity}`} {log.unit}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
