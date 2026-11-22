import { InventoryItem, AiAnalysisResult, SafetyStatus } from '../types/inventory';

const STORAGE_KEY = 'hotelier_ai_inventory_items_v1';

export function loadStoredItems(defaultItems: InventoryItem[]): InventoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultItems));
      return defaultItems;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : defaultItems;
  } catch (e) {
    console.error('Failed to load from localStorage:', e);
    return defaultItems;
  }
}

export function saveStoredItems(items: InventoryItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
}

/**
 * Deterministic calculation for days remaining
 */
export function calculateDaysRemaining(stock: number, dailyRate: number): number {
  if (dailyRate <= 0) return 999;
  return Math.max(0, Math.round((stock / dailyRate) * 10) / 10);
}

/**
 * Deterministic status determination based on safety stock and lead time
 */
export function determineSafetyStatus(stock: number, safety: number, dailyRate: number, leadTime: number): SafetyStatus {
  const days = calculateDaysRemaining(stock, dailyRate);
  if (stock <= safety || days <= leadTime) {
    return '위험';
  }
  if (stock <= safety * 1.4 || days <= leadTime * 2) {
    return '주의';
  }
  return '안전';
}

/**
 * Calculate deterministic restock recommendation when AI call is pending or offline
 */
export function computeRuleBasedRecommendation(item: InventoryItem): AiAnalysisResult {
  const days = calculateDaysRemaining(item.currentStock, item.dailyConsumptionRate);
  const status = determineSafetyStatus(item.currentStock, item.safetyStockLevel, item.dailyConsumptionRate, item.leadTimeDays);
  
  const leadTimeDemand = item.dailyConsumptionRate * item.leadTimeDays;
  const reorderPoint = item.safetyStockLevel + leadTimeDemand;
  const isNeeded = item.currentStock <= reorderPoint;
  
  // Target order up to: Safety stock + 14 days operational stock
  const targetInventory = item.safetyStockLevel + (item.dailyConsumptionRate * 14);
  const recommendedQty = isNeeded ? Math.max(0, Math.ceil(targetInventory - item.currentStock)) : 0;
  
  const now = new Date();
  let timing = '즉시 긴급 발주 (D-0)';
  if (!isNeeded) {
    const bufferUnits = item.currentStock - reorderPoint;
    const daysUntilReorder = Math.max(1, Math.floor(bufferUnits / (item.dailyConsumptionRate || 1)));
    const targetDate = new Date();
    targetDate.setDate(now.getDate() + daysUntilReorder);
    timing = `${targetDate.toISOString().slice(0, 10)} (약 ${daysUntilReorder}일 후 정기 발주)`;
  }

  const excessiveDisposal = item.recentDisposal > (item.dailyConsumptionRate * 0.4);
  const spikeUsage = item.dailyConsumptionRate > (item.safetyStockLevel * 0.35);

  return {
    itemName: item.itemName,
    statusAssessment: {
      safetyStatus: status,
      estimatedDaysRemaining: days,
      summary: `현재 보유 재고 ${item.currentStock}${item.unit}는 일평균 ${item.dailyConsumptionRate}${item.unit} 소진 시 ${days}일 후 소진될 예정이며, 최소 안전 재고(${item.safetyStockLevel}${item.unit}) 대비 ${status} 상태입니다.`,
    },
    consumptionAnalysis: {
      trendAnalysis: `일일 소진율 ${item.dailyConsumptionRate}${item.unit}(주간 ${Math.round(item.dailyConsumptionRate * 7)}${item.unit})로 운영 중이며, 최근 폐기량은 ${item.recentDisposal}${item.unit}입니다.`,
      excessiveOrSpikeDetected: excessiveDisposal || spikeUsage,
      details: `특이사항: "${item.notes || '특이사항 없음'}". ${excessiveDisposal ? `비정상적인 폐기(${item.recentDisposal}${item.unit})가 발생하여 재고 감모 점검이 필요합니다.` : '정규 운영 범위 내에서 소비되고 있습니다.'}`,
    },
    restockRecommendation: {
      isNeeded,
      recommendedQuantity: recommendedQty,
      recommendedTiming: timing,
      keyReason: isNeeded
        ? `현재 재고(${item.currentStock}${item.unit})가 재발주점(${Math.round(reorderPoint)}${item.unit} = 안전재고 ${item.safetyStockLevel} + 리드타임(${item.leadTimeDays}일) 소진량 ${Math.round(leadTimeDemand)}) 이하로 진입하여 품절 방지를 위한 선제적 발주가 불가피함.`
        : `현재 재고(${item.currentStock}${item.unit})가 재발주점(${Math.round(reorderPoint)}${item.unit})을 충분히 상회하여 즉각적인 추가 발주는 불필요하며, 과잉 재고 적재를 방지합니다.`,
    },
    formattedReport: `### 1. 재고 상태 평가 (Status Assessment)
- **현재 재고 안전성 여부**: **[${status}]**
- **예상 소진 가능 일수**: **${days}일**
- **평가 요약**: 현재 재고 ${item.currentStock}${item.unit}는 일일 ${item.dailyConsumptionRate}${item.unit} 소진 기준 약 ${days}일간 운영 가능합니다.

### 2. 데이터 기반 사용 패턴 분석 (Consumption Analysis)
- **최근 사용량 트렌드**: 일일 ${item.dailyConsumptionRate}${item.unit} (주간 환산: ${Math.round(item.dailyConsumptionRate * 7)}${item.unit})
- **과잉 사용 및 급격한 소진 발생 여부**: ${excessiveDisposal || spikeUsage ? '⚠️ [감지됨] 비정상적 소진/폐기 발생' : '✅ [정상] 안정적 소진 추세'}
- **특이사항 및 폐기 분석**: ${item.notes || '특이사항 없음'}. 최근 폐기량 ${item.recentDisposal}${item.unit}.

### 3. AI 발주 추천 (Restock Recommendation)
- **발주 필요 여부**: **${isNeeded ? '🚨 [발주 필요]' : '🟢 [발주 불필요]'}**
- **추천 발주 수량**: **${recommendedQty}${item.unit}** (예상 견적: ${(recommendedQty * (item.unitCost || 0)).toLocaleString()}원)
- **권장 발주 시점**: **${timing}**
- **발주 판단 사유**: ${isNeeded ? `리드타임 ${item.leadTimeDays}일 소요 감안 시 안전재고 고갈 위험이 발생하므로 즉시 발주를 권장합니다.` : `현재 완충 재고가 충분하여 과잉 발주 비용을 방지하기 위해 발주를 유보합니다.`}`,
  };
}

export function formatKRW(val: number): string {
  return new Intl.NumberFormat('ko-KR').format(val) + '원';
}
