import React, { useState } from 'react';
import { X, ClipboardList, Check, AlertCircle } from 'lucide-react';
import { InventoryItem, StockLog } from '../types/inventory';

interface QuickLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: InventoryItem[];
  preselectedItem?: InventoryItem | null;
  onAddLog: (itemId: string, log: Omit<StockLog, 'id'>, stockAdjustment: number) => void;
}

export const QuickLogModal: React.FC<QuickLogModalProps> = ({
  isOpen,
  onClose,
  items,
  preselectedItem,
  onAddLog,
}) => {
  if (!isOpen) return null;

  const [selectedItemId, setSelectedItemId] = useState<string>(
    preselectedItem?.id || (items[0]?.id ?? '')
  );
  const [logType, setLogType] = useState<'사용(소진)' | '신규 입고' | '폐기/불량' | '재고 실사 조정'>('사용(소진)');
  const [quantity, setQuantity] = useState<number>(10);
  const [reason, setReason] = useState<string>('객실 하우스키핑 세팅 분출');
  const [recordedBy, setRecordedBy] = useState<string>('하우스키핑 린넨팀');

  const selectedItem = items.find((i) => i.id === selectedItemId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId || quantity <= 0) return;

    let stockDelta = 0;
    if (logType === '사용(소진)') {
      stockDelta = -quantity;
    } else if (logType === '폐기/불량') {
      stockDelta = -quantity;
    } else if (logType === '신규 입고') {
      stockDelta = +quantity;
    } else {
      // 실사 조정: delta directly
      stockDelta = quantity;
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    onAddLog(selectedItemId, {
      date: todayStr,
      type: logType,
      quantity,
      reason,
      recordedBy,
    }, stockDelta);

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-auto">
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                일일 비품 수불 및 폐기 기록
              </h2>
              <p className="text-xs text-slate-400">
                실시간 소진 및 폐기량은 AI 사용 패턴 분석의 핵심 기초 자료가 됩니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs sm:text-sm">
          {/* Target Item Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              대상 품목 선택
            </label>
            <select
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              {items.map((it) => (
                <option key={it.id} value={it.id} className="bg-slate-900">
                  [{it.category}] {it.itemName} (현재 재고: {it.currentStock}{it.unit})
                </option>
              ))}
            </select>
          </div>

          {/* Current Stock Preview */}
          {selectedItem && (
            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-400">현재 보유량:</span>
              <span className="text-white font-bold text-sm">
                {selectedItem.currentStock} {selectedItem.unit}
              </span>
            </div>
          )}

          {/* Log Type Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              구분 (작업 유형)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['사용(소진)', '신규 입고', '폐기/불량', '재고 실사 조정'] as const).map((type) => (
                <button
                  type="button"
                  key={type}
                  onClick={() => {
                    setLogType(type);
                    if (type === '사용(소진)') setReason('객실 하우스키핑 세팅 분출');
                    if (type === '신규 입고') setReason('정기 발주분 입고 검수 완료');
                    if (type === '폐기/불량') setReason('보관 운반 중 파손 및 오염 불량 폐기');
                    if (type === '재고 실사 조정') setReason('월말 정기 재고 실사 차이분 반영');
                  }}
                  className={`py-2 px-2.5 rounded-lg text-xs font-semibold border transition-all text-center ${
                    logType === type
                      ? type === '폐기/불량'
                        ? 'bg-rose-500 text-white border-rose-600'
                        : type === '신규 입고'
                        ? 'bg-emerald-600 text-white border-emerald-700'
                        : 'bg-indigo-600 text-white border-indigo-700'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity & Unit */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              수량 ({selectedItem?.unit || '개'})
            </label>
            <input
              type="number"
              min="1"
              required
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Reason / Details */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              사유 및 상세 내역
            </label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="예: 주말 만실로 추가 세팅, 세탁 불량 올풀림 폐기 등"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Recorded By */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              담당자 / 부서
            </label>
            <input
              type="text"
              required
              value={recordedBy}
              onChange={(e) => setRecordedBy(e.target.value)}
              placeholder="예: 김민주 주임 (하우스키핑)"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>기록 저장 및 재고 반영</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
