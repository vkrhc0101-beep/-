import React, { useState, useEffect } from 'react';
import {
  Boxes,
  ClipboardEdit,
  ShoppingCart,
  Sparkles,
  Home,
  RotateCcw,
} from 'lucide-react';
import { INITIAL_INVENTORY_ITEMS } from './data/mockItems';
import { AppView, InventoryItem, StockLog, AiAnalysisResult } from './types/inventory';
import {
  loadStoredItems,
  saveStoredItems,
  computeRuleBasedRecommendation,
} from './utils/inventoryCalculations';
import { HomeHub } from './components/HomeHub';
import { InventoryCheckView } from './components/InventoryCheckView';
import { StockLogView } from './components/StockLogView';
import { PurchaseOrderView } from './components/PurchaseOrderView';
import { ScenarioView } from './components/ScenarioView';
import { ItemAnalysisModal } from './components/ItemAnalysisModal';
import { AddItemModal } from './components/AddItemModal';
import { PoItemEntry } from './components/PurchaseOrderModal';
import { OfflineBanner } from './components/OfflineBanner';

export default function App() {
  const [items, setItems] = useState<InventoryItem[]>(() =>
    loadStoredItems(INITIAL_INVENTORY_ITEMS)
  );
  const [activeView, setActiveView] = useState<AppView>(() => {
    if (typeof window === 'undefined') return 'home';
    const param = new URLSearchParams(window.location.search).get('view');
    if (param === 'inventory' || param === 'log' || param === 'order' || param === 'scenario') {
      return param;
    }
    return 'home';
  });
  const [activeStatusFilter, setActiveStatusFilter] = useState<'전체' | '위험' | '주의' | '안전'>('전체');

  // Contextual selections & modals
  const [selectedItemForAi, setSelectedItemForAi] = useState<InventoryItem | null>(null);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [quickLogPreselectId, setQuickLogPreselectId] = useState<string | null>(null);
  const [cart, setCart] = useState<PoItemEntry[]>([]);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    saveStoredItems(items);
  }, [items]);

  useEffect(() => {
    if (selectedItemForAi) {
      const refreshed = items.find((i) => i.id === selectedItemForAi.id);
      if (refreshed) setSelectedItemForAi(refreshed);
    }
  }, [items]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2200);
  };

  const handleSaveItem = (itemData: Partial<InventoryItem>) => {
    if (editingItem) {
      setItems((prev) =>
        prev.map((it) => {
          if (it.id === editingItem.id) {
            const updated = { ...it, ...itemData };
            updated.lastAiAnalysis = computeRuleBasedRecommendation(updated);
            return updated;
          }
          return it;
        })
      );
      setEditingItem(null);
      showToast('품목 정보가 수정되었습니다.');
    } else {
      const newItem: InventoryItem = {
        id: `item-${Date.now()}`,
        itemName: itemData.itemName || '새 비품',
        category: itemData.category || '기타 비품',
        currentStock: itemData.currentStock ?? 100,
        dailyConsumptionRate: itemData.dailyConsumptionRate ?? 10,
        weeklyConsumptionRate: itemData.weeklyConsumptionRate ?? 70,
        safetyStockLevel: itemData.safetyStockLevel ?? 50,
        unit: itemData.unit || '개',
        unitCost: itemData.unitCost ?? 1000,
        leadTimeDays: itemData.leadTimeDays ?? 3,
        recentDisposal: 0,
        notes: itemData.notes || '',
        supplier: itemData.supplier || '',
        location: itemData.location || '',
        logs: [
          {
            id: `log-${Date.now()}`,
            date: new Date().toISOString().slice(0, 10),
            type: '신규 입고',
            quantity: itemData.currentStock ?? 100,
            reason: '초기 재고 등록',
            recordedBy: '매니저',
          },
        ],
      };
      newItem.lastAiAnalysis = computeRuleBasedRecommendation(newItem);
      setItems((prev) => [newItem, ...prev]);
      showToast('새 품목이 등록되었습니다.');
    }
  };

  const handleDeleteItem = (itemId: string) => {
    const target = items.find((i) => i.id === itemId);
    if (!target) return;
    if (window.confirm(`'${target.itemName}' 품목을 삭제할까요?`)) {
      setItems((prev) => prev.filter((i) => i.id !== itemId));
      setCart((prev) => prev.filter((c) => c.item.id !== itemId));
    }
  };

  const handleAddLog = (
    itemId: string,
    logData: Omit<StockLog, 'id'>,
    stockAdjustment: number
  ) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id === itemId) {
          const newStock = Math.max(0, it.currentStock + stockAdjustment);
          const newRecentDisposal = logData.type.includes('폐기')
            ? it.recentDisposal + logData.quantity
            : it.recentDisposal;

          const updated: InventoryItem = {
            ...it,
            currentStock: newStock,
            recentDisposal: newRecentDisposal,
            logs: [
              ...(it.logs || []),
              {
                id: `log-${Date.now()}`,
                ...logData,
              },
            ],
          };
          updated.lastAiAnalysis = computeRuleBasedRecommendation(updated);
          return updated;
        }
        return it;
      })
    );
  };

  const handleUpdateItemAi = (itemId: string, result: AiAnalysisResult) => {
    setItems((prev) =>
      prev.map((it) =>
        it.id === itemId
          ? {
              ...it,
              lastAiAnalysis: result,
              lastAnalysisTimestamp: new Date().toLocaleTimeString('ko-KR', {
                hour: '2-digit',
                minute: '2-digit',
              }),
            }
          : it
      )
    );
  };

  const handleAddToPo = (item: InventoryItem, qty: number) => {
    setCart((prev) => {
      const existing = prev.find((entry) => entry.item.id === item.id);
      if (existing) {
        return prev.map((entry) =>
          entry.item.id === item.id ? { ...entry, quantity: entry.quantity + qty } : entry
        );
      }
      return [...prev, { item, quantity: Math.max(1, qty) }];
    });
    showToast(`${item.itemName} 발주 장바구니에 담았습니다.`);
  };

  const handleAddManyToPo = (entries: Array<{ item: InventoryItem; qty: number }>) => {
    setCart((prev) => {
      const updated = [...prev];
      entries.forEach(({ item, qty }) => {
        const idx = updated.findIndex((entry) => entry.item.id === item.id);
        if (idx >= 0) {
          updated[idx] = { ...updated[idx], quantity: Math.max(updated[idx].quantity, qty) };
        } else {
          updated.push({ item, quantity: Math.max(1, qty) });
        }
      });
      return updated;
    });
    showToast(`${entries.length}개 품목을 발주 장바구니에 담았습니다.`);
  };

  const handleUpdateCartQty = (itemId: string, newQty: number) => {
    setCart((prev) =>
      prev.map((entry) => (entry.item.id === itemId ? { ...entry, quantity: newQty } : entry))
    );
  };

  const handleRemoveFromCart = (itemId: string) => {
    setCart((prev) => prev.filter((entry) => entry.item.id !== itemId));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  const handleResetData = () => {
    if (window.confirm('샘플 데이터로 초기화할까요?')) {
      setItems(INITIAL_INVENTORY_ITEMS);
      saveStoredItems(INITIAL_INVENTORY_ITEMS);
      setCart([]);
      showToast('초기 샘플로 복원되었습니다.');
    }
  };

  const handleImportItems = (imported: InventoryItem[]) => {
    setItems(imported);
    saveStoredItems(imported);
    showToast(`${imported.length}개 품목 데이터를 복원했습니다.`);
  };

  const navTabs: Array<{
    id: AppView;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'inventory', label: '재고확인', icon: Boxes },
    { id: 'log', label: '재고기록', icon: ClipboardEdit },
    { id: 'order', label: '발주', icon: ShoppingCart },
    { id: 'scenario', label: '시나리오', icon: Sparkles },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Top Bar: Clean 3-Zone Contract */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 pt-[env(safe-area-inset-top)] no-print">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-8">
          <button
            type="button"
            onClick={() => setActiveView('home')}
            className="text-base sm:text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 rounded-lg"
          >
            비품 인벤토리
          </button>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            {navTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveView(tab.id)}
                className={`py-1 whitespace-nowrap shrink-0 transition-colors border-b-2 ${
                  activeView === tab.id
                    ? 'text-slate-900 font-bold border-slate-900'
                    : 'text-slate-500 hover:text-slate-900 border-transparent'
                }`}
              >
                {tab.label}
                {tab.id === 'order' && cart.length > 0 ? ` (${cart.length})` : ''}
              </button>
            ))}
          </nav>

          <div className="shrink-0">
            {activeView === 'home' ? (
              <button
                type="button"
                onClick={handleResetData}
                className="min-h-[40px] px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>초기화</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActiveView('home')}
                className="min-h-[40px] px-3 py-1.5 text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Home className="w-4 h-4" />
                <span>처음으로</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main
        className={`flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-5 sm:py-8 ${
          activeView !== 'home' ? 'pb-24 md:pb-10' : ''
        }`}
      >
        {activeView === 'home' && (
          <HomeHub items={items} cartCount={cart.length} onNavigate={setActiveView} />
        )}

        {activeView === 'inventory' && (
          <InventoryCheckView
            items={items}
            activeStatusFilter={activeStatusFilter}
            onFilterStatus={setActiveStatusFilter}
            onSelectItemForAi={(item) => setSelectedItemForAi(item)}
            onQuickLogItem={(item) => {
              setQuickLogPreselectId(item.id);
              setActiveView('log');
            }}
            onAddItem={() => {
              setEditingItem(null);
              setIsAddItemOpen(true);
            }}
            onEditItem={(item) => {
              setEditingItem(item);
              setIsAddItemOpen(true);
            }}
            onDeleteItem={handleDeleteItem}
            onAddToPo={handleAddToPo}
            onImportItems={handleImportItems}
          />
        )}

        {activeView === 'log' && (
          <StockLogView
            items={items}
            preselectedItemId={quickLogPreselectId}
            onAddLog={handleAddLog}
          />
        )}

        {activeView === 'order' && (
          <PurchaseOrderView
            items={items}
            cart={cart}
            onAddToPo={handleAddToPo}
            onAddManyToPo={handleAddManyToPo}
            onUpdateQty={handleUpdateCartQty}
            onRemoveItem={handleRemoveFromCart}
            onClearCart={handleClearCart}
          />
        )}

        {activeView === 'scenario' && (
          <ScenarioView
            items={items}
            onAddToPo={handleAddToPo}
            onAddManyToPo={handleAddManyToPo}
          />
        )}
      </main>

      {/* Mobile / Tablet Bottom Tab Bar (Compact h-16, shown inside sub-pages) */}
      {activeView !== 'home' && (
        <nav
          aria-label="하단 메뉴"
          className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 grid grid-cols-4 h-16 pb-[env(safe-area-inset-bottom)] no-print"
        >
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeView === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveView(tab.id)}
                className={`flex flex-col items-center justify-center gap-0.5 min-h-[44px] relative ${
                  active ? 'text-slate-900 font-bold' : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[11px] leading-tight whitespace-nowrap">
                  {tab.label}
                </span>
                {tab.id === 'order' && cart.length > 0 && (
                  <span className="absolute top-1.5 right-4 text-[10px] font-bold text-amber-600 tabular-nums">
                    {cart.length}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      )}

      {/* Subtle Toast */}
      {toastMsg && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-3 no-print">
          <span>{toastMsg}</span>
          {activeView !== 'order' && cart.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setToastMsg(null);
                setActiveView('order');
              }}
              className="text-amber-400 hover:text-amber-300 underline whitespace-nowrap"
            >
              발주 보기
            </button>
          )}
        </div>
      )}

      {/* Modals */}
      {selectedItemForAi && (
        <ItemAnalysisModal
          item={selectedItemForAi}
          onClose={() => setSelectedItemForAi(null)}
          onUpdateItemAi={handleUpdateItemAi}
          onAddToPo={handleAddToPo}
        />
      )}

      {isAddItemOpen && (
        <AddItemModal
          isOpen={isAddItemOpen}
          onClose={() => {
            setIsAddItemOpen(false);
            setEditingItem(null);
          }}
          onSave={handleSaveItem}
          editingItem={editingItem}
        />
      )}
      <OfflineBanner />
    </div>
  );
}
