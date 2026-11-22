export type InventoryCategory = 
  | '욕실 어메니티'
  | '객실 소모품'
  | '침구 및 린넨'
  | '위생 & 하우스키핑'
  | '식음료 & 미니바'
  | '기타 비품';

export type SafetyStatus = '안전' | '주의' | '위험';

export type AppView = 'home' | 'inventory' | 'log' | 'order' | 'scenario';

export interface StockLog {
  id: string;
  date: string; // YYYY-MM-DD
  type: '사용(소진)' | '신규 입고' | '폐기/불량' | '재고 실사 조정';
  quantity: number;
  reason?: string;
  recordedBy: string;
}

export interface InventoryItem {
  id: string;
  itemName: string;
  category: InventoryCategory;
  currentStock: number;
  dailyConsumptionRate: number;
  weeklyConsumptionRate?: number;
  safetyStockLevel: number;
  unit: string;
  unitCost: number; // KRW
  leadTimeDays: number;
  recentDisposal: number;
  notes: string;
  supplier?: string;
  location?: string;
  lastRestockedDate?: string;
  logs: StockLog[];
  lastAiAnalysis?: AiAnalysisResult;
  lastAnalysisTimestamp?: string;
}

export interface AiStatusAssessment {
  safetyStatus: SafetyStatus;
  estimatedDaysRemaining: number;
  summary: string;
}

export interface AiConsumptionAnalysis {
  trendAnalysis: string;
  excessiveOrSpikeDetected: boolean;
  details: string;
}

export interface AiRestockRecommendation {
  isNeeded: boolean;
  recommendedQuantity: number;
  recommendedTiming: string;
  keyReason: string;
}

export interface AiAnalysisResult {
  itemName: string;
  statusAssessment: AiStatusAssessment;
  consumptionAnalysis: AiConsumptionAnalysis;
  restockRecommendation: AiRestockRecommendation;
  formattedReport?: string;
  lastAnalysisTimestamp?: string;
}

export interface BatchAuditResult {
  executiveSummary: string;
  riskLevel: '낮음' | '중간' | '높음' | '심각';
  urgentItemsToOrder: Array<{
    itemName: string;
    recommendedQty: number;
    urgency: '긴급' | '보통';
    reason: string;
  }>;
  strategicAdvice: string[];
  estimatedTotalBudget: number;
}

export interface ScenarioForecastItem {
  itemName: string;
  unit: string;
  currentStock: number;
  expectedNeedQty: number;
  recommendedOrderQty: number;
  urgency: '긴급' | '권장' | '여유';
  reason: string;
}

export interface ScenarioForecastResult {
  situationSummary: string;
  demandChangeLabel: string;
  forecastPeriodDays: number;
  items: ScenarioForecastItem[];
  actionTips: string[];
  estimatedTotalBudget: number;
}
