import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Server-side Gemini AI initialization
const rawApiKey = process.env.GEMINI_API_KEY || '';
const apiKey = rawApiKey && rawApiKey !== 'MY_GEMINI_API_KEY' ? rawApiKey : '';
const ai = new GoogleGenAI({
  apiKey: apiKey || 'dummy-key',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

export interface ItemAnalysisRequest {
  itemName: string;
  category?: string;
  currentStock: number;
  dailyConsumptionRate: number;
  weeklyConsumptionRate?: number;
  safetyStockLevel: number;
  unit?: string;
  unitCost?: number;
  leadTimeDays?: number;
  recentDisposal?: number;
  notes?: string;
  history?: Array<{
    date: string;
    used: number;
    disposed: number;
    restocked: number;
    reason?: string;
  }>;
}

// Single Item Analysis Endpoint
app.post('/api/gemini/analyze-item', async (req, res) => {
  const data: ItemAnalysisRequest = req.body;

  if (!data?.itemName) {
    return res.status(400).json({ error: '품목명(itemName)은 필수 입력 항목입니다.' });
  }

  const currentStock = Number(data.currentStock) || 0;
  const dailyRate =
    Number(data.dailyConsumptionRate) ||
    (Number(data.weeklyConsumptionRate) ? Number(data.weeklyConsumptionRate) / 7 : 1);
  const safetyStock = Number(data.safetyStockLevel) || 0;
  const unit = data.unit || '개';
  const leadTime = Number(data.leadTimeDays) || 3;
  const recentDisposal = Number(data.recentDisposal) || 0;
  const notes = data.notes || '특이사항 없음';

  const daysRemaining = dailyRate > 0 ? Math.max(0, Math.round((currentStock / dailyRate) * 10) / 10) : 999;
  let fallbackStatus: '안전' | '주의' | '위험' = '안전';
  if (currentStock <= safetyStock || daysRemaining <= leadTime) {
    fallbackStatus = '위험';
  } else if (currentStock <= safetyStock * 1.4 || daysRemaining <= leadTime * 2) {
    fallbackStatus = '주의';
  }

  const leadTimeDemand = dailyRate * leadTime;
  const reorderPoint = safetyStock + leadTimeDemand;
  const isRestockNeeded = currentStock <= reorderPoint;
  const targetStock = safetyStock * 1.5 + dailyRate * 14;
  const recommendedQty = isRestockNeeded ? Math.max(0, Math.ceil(targetStock - currentStock)) : 0;

  let orderTiming = '즉시 발주 필요';
  if (!isRestockNeeded) {
    const bufferUnits = currentStock - reorderPoint;
    const daysUntilOrder = Math.max(1, Math.floor(bufferUnits / (dailyRate || 1)));
    const futureDate = new Date();
    futureDate.setDate(new Date().getDate() + daysUntilOrder);
    orderTiming = `${futureDate.toISOString().slice(0, 10)} (약 ${daysUntilOrder}일 후)`;
  }

  const excessiveOrSpike = recentDisposal > dailyRate * 0.4 || dailyRate > safetyStock * 0.35;

  const fallbackResult = {
    itemName: data.itemName,
    statusAssessment: {
      safetyStatus: fallbackStatus,
      estimatedDaysRemaining: daysRemaining,
      summary: `현재 재고 ${currentStock.toLocaleString()}${unit}는 하루 ${dailyRate}${unit} 기준 약 ${daysRemaining}일 사용 가능하며 [${fallbackStatus}] 상태입니다.`,
    },
    consumptionAnalysis: {
      trendAnalysis: `하루 평균 ${dailyRate}${unit}(주간 약 ${Math.round(dailyRate * 7)}${unit}) 소진 중이며 최근 폐기는 ${recentDisposal}${unit}입니다.`,
      excessiveOrSpikeDetected: excessiveOrSpike,
      details: `${notes}. ${recentDisposal > 0 ? `폐기량(${recentDisposal}${unit}) 관리가 필요합니다.` : '특이 손실은 없습니다.'}`,
    },
    restockRecommendation: {
      isNeeded: isRestockNeeded,
      recommendedQuantity: recommendedQty,
      recommendedTiming: orderTiming,
      keyReason: isRestockNeeded
        ? `현재 재고(${currentStock}${unit})가 배송 기간(${leadTime}일) 동안 필요한 수량과 안전 재고 합계(${Math.round(reorderPoint)}${unit})보다 적습니다.`
        : `안전 재고 대비 여유가 있어 당장 주문하지 않아도 됩니다.`,
    },
    formattedReport: `[${data.itemName}] ${fallbackStatus} · 잔여 약 ${daysRemaining}일 · ${
      isRestockNeeded ? `추천 발주 ${recommendedQty}${unit} (${orderTiming})` : '발주 불필요'
    }`,
  };

  if (!apiKey) {
    return res.json(fallbackResult);
  }

  try {
    const systemInstruction = `너는 소규모 숙소(펜션, 게스트하우스, 부티크 스테이) 사장님을 돕는 실용적인 비품 재고 도우미다.
어려운 전문 용어를 쓰지 말고 쉽고 간결한 한국어로 현재 상태와 발주 필요 여부를 알려주어라.`;

    const promptText = `
비품 데이터:
- 품목명: ${data.itemName}
- 카테고리: ${data.category || '일반 비품'}
- 현재 재고: ${currentStock} ${unit}
- 하루 평균 사용량: ${dailyRate} ${unit}
- 안전 재고 기준: ${safetyStock} ${unit}
- 배송 소요 일수: ${leadTime}일
- 최근 폐기량: ${recentDisposal} ${unit}
- 단가: ${data.unitCost || 0}원
- 메모: ${notes}

위 데이터를 분석해 JSON으로 응답해라.`;

    const callPromise = ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: promptText,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            itemName: { type: Type.STRING },
            statusAssessment: {
              type: Type.OBJECT,
              properties: {
                safetyStatus: { type: Type.STRING, description: '안전, 주의, 위험 중 하나' },
                estimatedDaysRemaining: { type: Type.NUMBER },
                summary: { type: Type.STRING },
              },
              required: ['safetyStatus', 'estimatedDaysRemaining', 'summary'],
            },
            consumptionAnalysis: {
              type: Type.OBJECT,
              properties: {
                trendAnalysis: { type: Type.STRING },
                excessiveOrSpikeDetected: { type: Type.BOOLEAN },
                details: { type: Type.STRING },
              },
              required: ['trendAnalysis', 'excessiveOrSpikeDetected', 'details'],
            },
            restockRecommendation: {
              type: Type.OBJECT,
              properties: {
                isNeeded: { type: Type.BOOLEAN },
                recommendedQuantity: { type: Type.INTEGER },
                recommendedTiming: { type: Type.STRING },
                keyReason: { type: Type.STRING },
              },
              required: ['isNeeded', 'recommendedQuantity', 'recommendedTiming', 'keyReason'],
            },
            formattedReport: { type: Type.STRING },
          },
          required: ['itemName', 'statusAssessment', 'consumptionAnalysis', 'restockRecommendation', 'formattedReport'],
        },
      },
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('AI_TIMEOUT_FALLBACK')), 8000)
    );

    const response: any = await Promise.race([callPromise, timeoutPromise]);
    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.warn('Gemini item analysis fallback:', error?.message);
    return res.json(fallbackResult);
  }
});

// Scenario Forecast Endpoint (Free-text story -> expected stock & purchase recommendations)
app.post('/api/gemini/scenario-forecast', async (req, res) => {
  const { items, story } = req.body;
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: '비품 목록이 없습니다.' });
  }
  const cleanStory = typeof story === 'string' && story.trim() ? story.trim() : '평소와 같은 주말 예약 상황';

  // Keyword-aware deterministic fallback
  const lower = cleanStory.toLowerCase();
  let multiplier = 1.0;
  let demandLabel = '평소 수준 (변동 없음)';
  let periodDays = 7;

  if (/(비수기|한산|적음|줄어|취소|감소)/.test(lower)) {
    multiplier = 0.7;
    demandLabel = '평소 대비 약 -30% 감소 예상';
  } else if (/(축제|만실|연휴|성수기|단체|행사|풀부킹|100%|폭증)/.test(lower)) {
    multiplier = 1.45;
    demandLabel = '평소 대비 약 +45% 증가 예상';
  } else if (/(주말|예약 많|증가|연박)/.test(lower)) {
    multiplier = 1.25;
    demandLabel = '평소 대비 약 +25% 증가 예상';
  }

  if (/(2주|보름|14일|한달|월)/.test(lower)) {
    periodDays = 14;
  }

  const leadBonus = /(지연|태풍|명절|폭설|배송)/.test(lower) ? 2 : 0;

  const fallbackItems = items.map((it: any) => {
    const daily = Number(it.dailyConsumptionRate) || 1;
    const stock = Number(it.currentStock) || 0;
    const safety = Number(it.safetyStockLevel) || 0;
    const lead = (Number(it.leadTimeDays) || 3) + leadBonus;
    const expectedNeed = Math.ceil(daily * multiplier * periodDays);
    const neededBuffer = expectedNeed + safety * 0.5 + daily * multiplier * lead;
    const recOrder = Math.max(0, Math.ceil(neededBuffer - stock));

    let urgency: '긴급' | '권장' | '여유' = '여유';
    if (stock < expectedNeed * 0.6 || stock <= safety) {
      urgency = '긴급';
    } else if (recOrder > 0) {
      urgency = '권장';
    }

    return {
      itemName: it.itemName,
      unit: it.unit || '개',
      currentStock: stock,
      expectedNeedQty: expectedNeed,
      recommendedOrderQty: recOrder,
      urgency,
      reason:
        recOrder > 0
          ? `${periodDays}일간 예상 필요량(${expectedNeed}${it.unit || '개'})과 안전 여유분을 고려해 ${recOrder}${it.unit || '개'} 발주를 권장합니다.`
          : `현재 보유 재고(${stock}${it.unit || '개'})로 예상 필요량(${expectedNeed}${it.unit || '개'})을 충분히 감당합니다.`,
    };
  });

  // Sort: 긴급 -> 권장 -> 여유
  const rank: Record<string, number> = { 긴급: 0, 권장: 1, 여유: 2 };
  fallbackItems.sort((a: any, b: any) => rank[a.urgency] - rank[b.urgency]);

  const fallbackTotalBudget = fallbackItems.reduce((sum: number, fi: any) => {
    const matched = items.find((i: any) => i.itemName === fi.itemName);
    return sum + fi.recommendedOrderQty * (Number(matched?.unitCost) || 0);
  }, 0);

  const fallbackResult = {
    situationSummary: `"${cleanStory}" 상황을 기준으로 향후 ${periodDays}일간의 예상 소모량과 필요 발주 수량을 계산했습니다.`,
    demandChangeLabel: demandLabel,
    forecastPeriodDays: periodDays,
    items: fallbackItems,
    actionTips: [
      fallbackItems.some((i: any) => i.urgency === '긴급')
        ? '긴급 표시된 품목은 오늘 바로 발주 장바구니에 담아 주문하세요.'
        : '전체 재고가 비교적 안정적입니다. 필요 품목만 선별 주문하세요.',
      multiplier > 1.1
        ? '체크인 피크 전 객실·린넨 보관함 여분을 미리 채워두세요.'
        : '소모량이 줄어드는 시기이므로 과잉 발주를 피하고 유통기한 품목을 우선 확인하세요.',
    ],
    estimatedTotalBudget: fallbackTotalBudget,
  };

  if (!apiKey) {
    return res.json(fallbackResult);
  }

  try {
    const systemInstruction = `너는 소규모 숙소(펜션, 게스트하우스, 중소형 호텔) 사장님을 돕는 실용적인 재고·발주 플래너다.
사용자가 적은 현재 상황(예약 현황, 비수기, 주변 축제, 단체 손님, 연휴, 배송 지연 등)을 읽고, 현재 보유 중인 모든 품목에 대해:
1) 앞으로의 예상 필요 재고 수량
2) 추가로 발주해야 할 추천 수량 (충분하면 0)
3) 시급도 ('긴급' | '권장' | '여유')
4) 짧고 이해하기 쉬운 이유 (1문장)
를 계산해 JSON으로 응답해라. 어려운 경영 용어는 쓰지 말고 직관적인 한국어로 작성해라.`;

    const promptText = `
사장님이 입력한 현재 상황:
"${cleanStory}"

현재 보유 품목 목록:
${JSON.stringify(
  items.map((i: any) => ({
    itemName: i.itemName,
    category: i.category,
    unit: i.unit || '개',
    currentStock: i.currentStock,
    dailyConsumptionRate: i.dailyConsumptionRate,
    safetyStockLevel: i.safetyStockLevel,
    leadTimeDays: i.leadTimeDays,
    unitCost: i.unitCost,
    notes: i.notes,
  }))
)}

위 상황을 반영해 각 품목별 예상 필요 재고와 추천 발주량을 계산하고, 전체 예상 발주 금액(estimatedTotalBudget)을 합산해 응답해라.`;

    const callPromise = ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: promptText,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            situationSummary: { type: Type.STRING },
            demandChangeLabel: { type: Type.STRING },
            forecastPeriodDays: { type: Type.INTEGER },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  itemName: { type: Type.STRING },
                  unit: { type: Type.STRING },
                  currentStock: { type: Type.NUMBER },
                  expectedNeedQty: { type: Type.INTEGER },
                  recommendedOrderQty: { type: Type.INTEGER },
                  urgency: { type: Type.STRING, description: '긴급 | 권장 | 여유 중 하나' },
                  reason: { type: Type.STRING },
                },
                required: [
                  'itemName',
                  'unit',
                  'currentStock',
                  'expectedNeedQty',
                  'recommendedOrderQty',
                  'urgency',
                  'reason',
                ],
              },
            },
            actionTips: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            estimatedTotalBudget: { type: Type.NUMBER },
          },
          required: [
            'situationSummary',
            'demandChangeLabel',
            'forecastPeriodDays',
            'items',
            'actionTips',
            'estimatedTotalBudget',
          ],
        },
      },
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('AI_TIMEOUT_FALLBACK')), 10000)
    );

    const response: any = await Promise.race([callPromise, timeoutPromise]);
    const parsed = JSON.parse(response.text || '{}');
    if (Array.isArray(parsed.items)) {
      parsed.items.sort((a: any, b: any) => (rank[a.urgency] ?? 2) - (rank[b.urgency] ?? 2));
    }
    return res.json(parsed);
  } catch (err: any) {
    console.warn('Scenario forecast fallback served:', err?.message);
    return res.json(fallbackResult);
  }
});

// Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Inventory AI server listening on port ${PORT}`);
  });
}

startServer();
