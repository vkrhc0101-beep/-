import React, { useState } from 'react';
import { 
  X, 
  FileText, 
  Printer, 
  Copy, 
  Check, 
  Trash2, 
  Building, 
  Calendar, 
  AlertCircle,
  Download
} from 'lucide-react';
import { InventoryItem } from '../types/inventory';
import { formatKRW } from '../utils/inventoryCalculations';

export interface PoItemEntry {
  item: InventoryItem;
  quantity: number;
}

interface PurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: PoItemEntry[];
  onUpdateQty: (itemId: string, newQty: number) => void;
  onRemoveItem: (itemId: string) => void;
  onClearCart: () => void;
}

export const PurchaseOrderModal: React.FC<PurchaseOrderModalProps> = ({
  isOpen,
  onClose,
  cart,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
}) => {
  if (!isOpen) return null;

  const [copied, setCopied] = useState(false);
  const [poNumber] = useState(`PO-HOTEL-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`);
  const [deliveryDate, setDeliveryDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().slice(0, 10);
  });
  const [orderNotes, setOrderNotes] = useState('주말 투숙객 만실 대비 긴급 납품 요망. 지하 1층 하우스키핑 린넨실 하역.');

  const totalCost = cart.reduce((sum, entry) => sum + (entry.quantity * (entry.item.unitCost || 0)), 0);
  const totalQuantity = cart.reduce((sum, entry) => sum + entry.quantity, 0);

  const handleCopyPo = () => {
    const lines = [
      `=========================================`,
      `[호텔 비품 및 어메니티 공식 발주서 (P/O)]`,
      `발주 번호: ${poNumber}`,
      `발주 일자: ${new Date().toISOString().slice(0, 10)}`,
      `납품 요청일: ${deliveryDate}`,
      `발주처: GRAND HOTEL SEOUL & RESORT 구매총괄팀`,
      `특기사항: ${orderNotes}`,
      `=========================================`,
      `[발주 내역]`,
      ...cart.map((entry, idx) => {
        const cost = entry.quantity * (entry.item.unitCost || 0);
        return `${idx + 1}. ${entry.item.itemName} | 수량: ${entry.quantity.toLocaleString()}${entry.item.unit} | 단가: ${formatKRW(entry.item.unitCost)} | 공급가: ${formatKRW(cost)} (납품처: ${entry.item.supplier || '공통공급사'})`;
      }),
      `=========================================`,
      `총 발주 품목: ${cart.length}종`,
      `총 발주 수량: ${totalQuantity.toLocaleString()}개/세트`,
      `총 발주 공급예정가: ${formatKRW(totalCost)} (VAT 별도)`,
      `=========================================`,
    ].join('\n');

    navigator.clipboard.writeText(lines);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                  {poNumber}
                </span>
                <span className="text-xs text-amber-400 font-medium">
                  호텔 비품 공식 발주서
                </span>
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight mt-0.5">
                AI 추천 기반 발주서(Purchase Order) 발행
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Metadata Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950/70 p-4 rounded-xl border border-slate-800 text-xs">
            <div>
              <span className="text-slate-400 block mb-1">발주 기관 및 부서</span>
              <span className="text-white font-bold text-sm block">GRAND HOTEL SEOUL & RESORT</span>
              <span className="text-slate-500">객실 하우스키핑 & 구매팀</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-1">납품 희망 일자</span>
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white text-xs focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <span className="text-slate-400 block mb-1">총 발주 예정 금액</span>
              <span className="text-amber-400 font-extrabold text-lg block">
                {formatKRW(totalCost)}
              </span>
              <span className="text-slate-500 text-[11px]">총 {cart.length}개 품목 / {totalQuantity.toLocaleString()}개</span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              발주 특기 및 배송 요청사항
            </label>
            <input
              type="text"
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              placeholder="배송 장소, 검수 요청사항 등"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* PO Items Table */}
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950 text-[11px] font-semibold text-slate-400 uppercase">
                  <th className="py-3 px-4">품목명 / 공급처</th>
                  <th className="py-3 px-4 text-center">현재 재고</th>
                  <th className="py-3 px-4 text-center">발주 수량</th>
                  <th className="py-3 px-4 text-right">단가</th>
                  <th className="py-3 px-4 text-right">합계 금액</th>
                  <th className="py-3 px-4 text-center">제거</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {cart.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-500">
                      발주서에 담긴 비품이 없습니다. 인벤토리 목록이나 AI 추천에서 담기를 눌러주세요.
                    </td>
                  </tr>
                ) : (
                  cart.map((entry) => {
                    const rowCost = entry.quantity * (entry.item.unitCost || 0);

                    return (
                      <tr key={entry.item.id} className="hover:bg-slate-900/50">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-white">{entry.item.itemName}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {entry.item.category} &bull; {entry.item.supplier || '지정 공급사'}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center text-slate-300 whitespace-nowrap">
                          {entry.item.currentStock} {entry.item.unit}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1">
                            <input
                              type="number"
                              min="1"
                              value={entry.quantity}
                              onChange={(e) => onUpdateQty(entry.item.id, Math.max(1, Number(e.target.value)))}
                              className="w-20 bg-transparent text-center font-bold text-amber-400 focus:outline-none text-xs sm:text-sm"
                            />
                            <span className="text-xs text-slate-400">{entry.item.unit}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right text-slate-300 whitespace-nowrap">
                          {formatKRW(entry.item.unitCost || 0)}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-white whitespace-nowrap">
                          {formatKRW(rowCost)}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <button
                            onClick={() => onRemoveItem(entry.item.id)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                            title="발주 목록에서 삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/90 flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-2">
            {cart.length > 0 && (
              <button
                onClick={onClearCart}
                className="px-3 py-2 text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 rounded-lg text-xs font-medium transition-colors"
              >
                전체 비우기
              </button>
            )}
            <button
              onClick={handleCopyPo}
              disabled={cart.length === 0}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '발주서 클립보드 복사됨' : '발주서 텍스트 복사'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handlePrint}
              disabled={cart.length === 0}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 rounded-lg text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>발주서 인쇄 / PDF 출력</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
