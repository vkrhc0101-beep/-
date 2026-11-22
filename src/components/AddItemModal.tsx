import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { InventoryItem, InventoryCategory } from '../types/inventory';
import { InfoTip } from './InfoTip';

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (itemData: Partial<InventoryItem>) => void;
  editingItem?: InventoryItem | null;
}

const CATEGORIES: InventoryCategory[] = [
  '욕실 어메니티',
  '객실 소모품',
  '침구 및 린넨',
  '위생 & 하우스키핑',
  '식음료 & 미니바',
  '기타 비품',
];

export const AddItemModal: React.FC<AddItemModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingItem,
}) => {
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState<InventoryCategory>('욕실 어메니티');
  const [currentStock, setCurrentStock] = useState<number>(100);
  const [dailyConsumptionRate, setDailyConsumptionRate] = useState<number>(15);
  const [safetyStockLevel, setSafetyStockLevel] = useState<number>(50);
  const [unit, setUnit] = useState('개');
  const [unitCost, setUnitCost] = useState<number>(1200);
  const [leadTimeDays, setLeadTimeDays] = useState<number>(3);
  const [notes, setNotes] = useState('');
  const [supplier, setSupplier] = useState('');
  const [location, setLocation] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (editingItem) {
      setItemName(editingItem.itemName);
      setCategory(editingItem.category);
      setCurrentStock(editingItem.currentStock);
      setDailyConsumptionRate(editingItem.dailyConsumptionRate);
      setSafetyStockLevel(editingItem.safetyStockLevel);
      setUnit(editingItem.unit);
      setUnitCost(editingItem.unitCost || 0);
      setLeadTimeDays(editingItem.leadTimeDays || 3);
      setNotes(editingItem.notes || '');
      setSupplier(editingItem.supplier || '');
      setLocation(editingItem.location || '');
    } else {
      setItemName('');
      setCategory('욕실 어메니티');
      setCurrentStock(100);
      setDailyConsumptionRate(15);
      setSafetyStockLevel(50);
      setUnit('개');
      setUnitCost(1200);
      setLeadTimeDays(3);
      setNotes('');
      setSupplier('');
      setLocation('');
    }
  }, [editingItem, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) return;

    onSave({
      itemName: itemName.trim(),
      category,
      currentStock: Number(currentStock) || 0,
      dailyConsumptionRate: Number(dailyConsumptionRate) || 1,
      weeklyConsumptionRate: (Number(dailyConsumptionRate) || 1) * 7,
      safetyStockLevel: Number(safetyStockLevel) || 0,
      unit: unit.trim() || '개',
      unitCost: Number(unitCost) || 0,
      leadTimeDays: Number(leadTimeDays) || 1,
      notes: notes.trim(),
      supplier: supplier.trim(),
      location: location.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-t-3xl sm:rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <h2 className="text-base font-bold text-slate-900">
              {editingItem ? '품목 수정' : '새 품목 등록'}
            </h2>
            <InfoTip
              title="등록 안내"
              text="안전 재고와 하루 사용량, 배송 소요일을 입력하면 부족 여부를 자동으로 계산합니다."
            />
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-400 hover:text-slate-900 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                품목명
              </label>
              <input
                type="text"
                required
                placeholder="예: 칫솔 세트"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                className="w-full min-h-[44px] bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 focus:outline-none focus:border-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                카테고리
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as InventoryCategory)}
                className="w-full min-h-[44px] bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-slate-900 cursor-pointer"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                현재 재고
              </label>
              <input
                type="number"
                min="0"
                required
                value={currentStock}
                onChange={(e) => setCurrentStock(Math.max(0, Number(e.target.value)))}
                className="w-full min-h-[44px] bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 tabular-nums text-slate-900 focus:outline-none focus:border-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                안전 재고
              </label>
              <input
                type="number"
                min="0"
                required
                value={safetyStockLevel}
                onChange={(e) => setSafetyStockLevel(Math.max(0, Number(e.target.value)))}
                className="w-full min-h-[44px] bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 tabular-nums text-slate-900 focus:outline-none focus:border-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                단위
              </label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="개, 세트"
                className="w-full min-h-[44px] bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                하루 사용량
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                required
                value={dailyConsumptionRate}
                onChange={(e) => setDailyConsumptionRate(Math.max(0.1, Number(e.target.value)))}
                className="w-full min-h-[44px] bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 tabular-nums text-slate-900 focus:outline-none focus:border-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                배송일(일)
              </label>
              <input
                type="number"
                min="1"
                value={leadTimeDays}
                onChange={(e) => setLeadTimeDays(Math.max(1, Number(e.target.value)))}
                className="w-full min-h-[44px] bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 tabular-nums text-slate-900 focus:outline-none focus:border-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                단가(원)
              </label>
              <input
                type="number"
                min="0"
                value={unitCost}
                onChange={(e) => setUnitCost(Math.max(0, Number(e.target.value)))}
                className="w-full min-h-[44px] bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 tabular-nums text-slate-900 focus:outline-none focus:border-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                보관 위치
              </label>
              <input
                type="text"
                placeholder="예: 1층 창고"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full min-h-[44px] bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 focus:outline-none focus:border-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                거래처
              </label>
              <input
                type="text"
                placeholder="예: 쿠팡 / OO유통"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                className="w-full min-h-[44px] bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 focus:outline-none focus:border-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              메모
            </label>
            <input
              type="text"
              placeholder="특이사항 입력"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full min-h-[44px] bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 focus:outline-none focus:border-slate-900"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold"
            >
              취소
            </button>
            <button
              type="submit"
              className="min-h-[44px] px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>저장</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
