import React from 'react';
import { 
  Building2, 
  Sparkles, 
  PlusCircle, 
  ClipboardList, 
  FileText, 
  RotateCcw,
  Bot
} from 'lucide-react';

interface HeaderProps {
  onOpenAddItem: () => void;
  onOpenQuickLog: () => void;
  onOpenBatchAudit: () => void;
  onOpenPurchaseOrder: () => void;
  onResetData: () => void;
  cartCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenAddItem,
  onOpenQuickLog,
  onOpenBatchAudit,
  onOpenPurchaseOrder,
  onResetData,
  cartCount,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo & Hotel Brand */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-400 p-0.5 shadow-lg shadow-amber-500/20">
              <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
                <Building2 className="w-6 h-6 text-amber-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-widest font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  GRAND HOTEL RESORT
                </span>
                <span className="text-xs text-slate-400">하우스키핑 & 구매팀</span>
              </div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                호텔 비품·어메니티 AI 재고관리 & 발주 의사결정 시스템
              </h1>
            </div>
          </div>

          {/* Action Navigation */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onResetData}
              title="초기 샘플 데이터로 복원"
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors text-xs flex items-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden lg:inline">초기화</span>
            </button>

            <button
              onClick={onOpenQuickLog}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 border border-slate-700"
            >
              <ClipboardList className="w-4 h-4 text-emerald-400" />
              <span>수불/폐기 기록</span>
            </button>

            <button
              onClick={onOpenAddItem}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 border border-slate-700"
            >
              <PlusCircle className="w-4 h-4 text-amber-400" />
              <span>신규 품목 등록</span>
            </button>

            <button
              onClick={onOpenBatchAudit}
              className="px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-lg text-xs sm:text-sm font-semibold shadow-md shadow-indigo-600/30 transition-all flex items-center gap-1.5"
            >
              <Bot className="w-4 h-4" />
              <span>AI 종합 발주 감사</span>
            </button>

            <button
              onClick={onOpenPurchaseOrder}
              className="relative px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs sm:text-sm font-bold shadow-md shadow-amber-500/20 transition-all flex items-center gap-1.5"
            >
              <FileText className="w-4 h-4" />
              <span>발주서(PO) 발행</span>
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
