import { DailyEntry } from '../data/db/models/DailyEntry';
import { LabResult } from '../data/db/models/LabResult';
import { RoutineProfile } from '../data/db/models/RoutineProfile';
import { SkinDiagnostic } from '../data/db/models/SkinDiagnostic';
import { WellnessEntry } from '../data/db/models/WellnessEntry';
import { classifyLab } from '../data/repos/labsRepo';
import { computeRoutineLoad } from '../data/repos/routineRepo';

export type SkinFactor = {
  title: string;
  impact: number;
  reason: string;
};

export type SkinSummary = {
  index: number;
  trend30: number;
  risk: 'low' | 'medium' | 'high';
  factors: SkinFactor[];
  plan7: string[];
  plan30: string[];
  forecast: {
    withoutPlan: number;
    withPlan: number;
  };
};

const DAY = 24 * 60 * 60 * 1000;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function findLab(labs: LabResult[], keyword: string) {
  const key = keyword.toLowerCase();
  return labs.find(item => item.name.toLowerCase().includes(key));
}

function scoreDaily(entry?: DailyEntry | null) {
  if (!entry) {
    return 50;
  }

  const dryness = entry.dryness ?? 2;
  const oiliness = entry.oiliness ?? 2;
  const acne = entry.acneLevel ?? 2;
  const stress = entry.stress ?? 2;
  const sleep = entry.sleepHours ?? 7;
  const water = entry.waterIntake ?? 6;

  let score = 72;
  score -= dryness * 2.3;
  score -= oiliness * 1.6;
  score -= acne * 3.2;
  score -= stress * 2.1;
  score += (clamp(sleep, 0, 10) - 6) * 1.8;
  score += (clamp(water, 0, 10) - 5) * 1.3;

  return clamp(score, 0, 100);
}

function scoreDiagnostics(diagnostic?: SkinDiagnostic | null) {
  if (!diagnostic) {
    return 0;
  }

  const density = diagnostic.density ?? 5;
  const pigmentation = diagnostic.pigmentation ?? 5;
  const vascular = diagnostic.vascular ?? 5;
  const wrinkles = diagnostic.wrinkles ?? 5;
  const photoaging = diagnostic.photoaging ?? 5;

  let delta = 0;
  delta += (density - 5) * 1.6;
  delta -= (pigmentation - 5) * 1.4;
  delta -= (vascular - 5) * 1.2;
  delta -= (wrinkles - 5) * 1.5;
  delta -= (photoaging - 5) * 1.6;

  return delta;
}

function scoreWellness(wellness?: WellnessEntry | null) {
  if (!wellness) {
    return 0;
  }

  let delta = 0;

  if ((wellness.sleepHours ?? 7) < 6) {
    delta -= 4;
  }
  if ((wellness.sleepQuality ?? 3) <= 2) {
    delta -= 3;
  }
  if ((wellness.stressLevel ?? 2) >= 4) {
    delta -= 4;
  }
  if ((wellness.energy ?? 3) >= 4) {
    delta += 2;
  }
  if ((wellness.proteinScore ?? 3) <= 2) {
    delta -= 2;
  }
  if ((wellness.strengthSession ?? 0) >= 1) {
    delta += 2;
  }

  return delta;
}

function scoreLabs(labs: LabResult[]) {
  let delta = 0;

  const ferritin = findLab(labs, 'ферритин');
  if (ferritin && classifyLab(ferritin.value, ferritin.refLow, ferritin.refHigh) === 'low') {
    delta -= 4;
  }

  const vitaminD = findLab(labs, 'витамин d');
  if (vitaminD && classifyLab(vitaminD.value, vitaminD.refLow, vitaminD.refHigh) === 'low') {
    delta -= 3;
  }

  const tsh = findLab(labs, 'ттг');
  if (tsh) {
    const status = classifyLab(tsh.value, tsh.refLow, tsh.refHigh);
    if (status === 'high' || status === 'low') {
      delta -= 2;
    }
  }

  return delta;
}

function scoreRoutine(routine?: RoutineProfile | null) {
  if (!routine) {
    return 0;
  }

  const load = computeRoutineLoad(routine);
  if (load === 'high') {
    return -4;
  }
  if (load === 'medium') {
    return -1;
  }

  return 2;
}

function computeRisk(index: number): 'low' | 'medium' | 'high' {
  if (index < 45) {
    return 'high';
  }
  if (index < 70) {
    return 'medium';
  }
  return 'low';
}

function computeTrend30(entries: DailyEntry[]) {
  if (entries.length < 4) {
    return 0;
  }

  const now = Date.now();
  const recent = entries
    .filter(entry => entry.entryDate >= now - 30 * DAY)
    .sort((a, b) => b.entryDate - a.entryDate);

  if (recent.length < 4) {
    return 0;
  }

  const currentSlice = recent.slice(0, Math.min(4, recent.length));
  const previousSlice = recent.slice(4, Math.min(8, recent.length));

  if (previousSlice.length === 0) {
    return 0;
  }

  const currentAvg = currentSlice.reduce((sum, entry) => sum + scoreDaily(entry), 0) / currentSlice.length;
  const previousAvg = previousSlice.reduce((sum, entry) => sum + scoreDaily(entry), 0) / previousSlice.length;

  const delta = ((currentAvg - previousAvg) / Math.max(1, previousAvg)) * 100;
  return round1(delta);
}

function buildFactors(input: {
  latestEntry?: DailyEntry | null;
  latestDiagnostic?: SkinDiagnostic | null;
  latestWellness?: WellnessEntry | null;
  routine?: RoutineProfile | null;
  labs: LabResult[];
}) {
  const factors: SkinFactor[] = [];
  const { latestEntry, latestDiagnostic, latestWellness, routine, labs } = input;

  if ((latestEntry?.acneLevel ?? 0) >= 3) {
    factors.push({
      title: 'Воспаления',
      impact: -8,
      reason: 'Текущий уровень высыпаний повышен, это напрямую снижает индекс кожи.',
    });
  }

  if ((latestEntry?.waterIntake ?? 0) <= 3) {
    factors.push({
      title: 'Недостаток воды',
      impact: -5,
      reason: 'Низкая гидратация часто усиливает реактивность и тусклость кожи.',
    });
  }

  if ((latestEntry?.sleepHours ?? 7) < 6 || (latestWellness?.sleepQuality ?? 3) <= 2) {
    factors.push({
      title: 'Качество сна',
      impact: -7,
      reason: 'Короткий или поверхностный сон ускоряет потерю восстановления кожи.',
    });
  }

  if ((latestWellness?.stressLevel ?? 0) >= 4) {
    factors.push({
      title: 'Высокий стресс',
      impact: -6,
      reason: 'Стресс коррелирует с повышенной чувствительностью и высыпаниями.',
    });
  }

  if ((latestDiagnostic?.photoaging ?? 0) >= 6) {
    factors.push({
      title: 'Фотостарение',
      impact: -6,
      reason: 'Высокий показатель фотостарения требует строгой защиты от солнца.',
    });
  }

  if ((latestDiagnostic?.density ?? 10) <= 3) {
    factors.push({
      title: 'Снижение плотности',
      impact: -6,
      reason: 'Плотность кожи ниже целевого уровня, нужен фокус на барьер и питание.',
    });
  }

  const ferritin = findLab(labs, 'ферритин');
  if (ferritin && classifyLab(ferritin.value, ferritin.refLow, ferritin.refHigh) === 'low') {
    factors.push({
      title: 'Низкий ферритин',
      impact: -5,
      reason: 'Низкий ферритин может усиливать сухость и тусклость кожи.',
    });
  }

  const vitaminD = findLab(labs, 'витамин d');
  if (vitaminD && classifyLab(vitaminD.value, vitaminD.refLow, vitaminD.refHigh) === 'low') {
    factors.push({
      title: 'Низкий витамин D',
      impact: -4,
      reason: 'Дефицит может ухудшать восстановление и общий тонус кожи.',
    });
  }

  if (routine) {
    const routineLoad = computeRoutineLoad(routine);
    if (routineLoad === 'high') {
      factors.push({
        title: 'Перегруз активами',
        impact: -7,
        reason: 'Текущая комбинация ретинола и кислот может быть слишком интенсивной.',
      });
    }
    if (routineLoad === 'low') {
      factors.push({
        title: 'Стабильный уход',
        impact: 3,
        reason: 'Нагрузка ухода мягкая и поддерживающая, это плюс для барьера.',
      });
    }
  }

  return factors.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact)).slice(0, 4);
}

function buildPlan7(input: {
  latestEntry?: DailyEntry | null;
  latestWellness?: WellnessEntry | null;
  routine?: RoutineProfile | null;
  factors: SkinFactor[];
}) {
  const items: string[] = [];
  const { latestEntry, latestWellness, routine, factors } = input;

  if ((latestEntry?.waterIntake ?? 0) <= 5) {
    items.push('Поднять воду до 6-8 стаканов ежедневно и фиксировать каждый день.');
  }

  if ((latestEntry?.sleepHours ?? 7) < 7) {
    items.push('Сделать 3 ночи подряд по 7-8 часов сна без экранов за 60 минут до сна.');
  }

  if ((latestWellness?.stressLevel ?? 0) >= 3) {
    items.push('Добавить короткий антистресс-ритуал 10 минут ежедневно (ходьба, дыхание, растяжка).');
  }

  if (routine && computeRoutineLoad(routine) === 'high') {
    items.push('Снизить частоту активов на 1 шаг и добавить 2 вечера восстановления без кислот/ретинола.');
  }

  if ((latestEntry?.acneLevel ?? 0) >= 3) {
    items.push('Исключить механическое раздражение кожи и оставить только мягкое очищение + базовое увлажнение.');
  }

  if (items.length < 3 && factors.length > 0) {
    items.push('Сфокусироваться на двух главных факторах из блока "Почему изменилось" и проверить динамику через 7 дней.');
  }

  return items.slice(0, 4);
}

function buildPlan30(input: {
  latestWellness?: WellnessEntry | null;
  labs: LabResult[];
}) {
  const items: string[] = [
    'Заполнять трекер не менее 5 дней в неделю, чтобы повысить точность рекомендаций.',
    'Сделать повторную диагностику кожи через 30 дней в сопоставимых условиях.',
  ];

  if ((input.latestWellness?.strengthSession ?? 0) === 0) {
    items.push('Добавить 2 умеренные силовые тренировки в неделю для поддержки метаболизма и тонуса кожи.');
  }

  const ferritin = findLab(input.labs, 'ферритин');
  const vitaminD = findLab(input.labs, 'витамин d');
  if (ferritin || vitaminD) {
    items.push('Перепроверить ключевые анализы в плановый срок и сравнить с динамикой кожи.');
  }

  items.push('Соблюдать стабильный SPF ежедневно и оценить изменения пигментации/фотостарения через месяц.');

  return items.slice(0, 5);
}

function buildForecast(index: number, factors: SkinFactor[], plan7: string[], plan30: string[]) {
  const negativeLoad = factors.filter(item => item.impact < 0).reduce((sum, item) => sum + Math.abs(item.impact), 0);
  const positiveLoad = factors.filter(item => item.impact > 0).reduce((sum, item) => sum + item.impact, 0);

  const withoutPlan = clamp(round1(index - negativeLoad * 0.5 + positiveLoad * 0.2), 0, 100);
  const withPlanGain = plan7.length * 1.8 + plan30.length * 1.2;
  const withPlan = clamp(round1(index + withPlanGain - negativeLoad * 0.15), 0, 100);

  return { withoutPlan, withPlan };
}

export function buildSkinSummary(input: {
  entries: DailyEntry[];
  diagnostics: SkinDiagnostic[];
  labs: LabResult[];
  latestWellness?: WellnessEntry | null;
  routine?: RoutineProfile | null;
}): SkinSummary {
  const entries = [...input.entries].sort((a, b) => b.entryDate - a.entryDate);
  const diagnostics = [...input.diagnostics].sort((a, b) => b.entryDate - a.entryDate);

  const latestEntry = entries[0] ?? null;
  const latestDiagnostic = diagnostics[0] ?? null;

  const indexRaw =
    scoreDaily(latestEntry) +
    scoreDiagnostics(latestDiagnostic) +
    scoreWellness(input.latestWellness) +
    scoreLabs(input.labs) +
    scoreRoutine(input.routine);

  const index = clamp(round1(indexRaw), 0, 100);
  const trend30 = computeTrend30(entries);
  const factors = buildFactors({
    latestEntry,
    latestDiagnostic,
    latestWellness: input.latestWellness,
    routine: input.routine,
    labs: input.labs,
  });
  const plan7 = buildPlan7({
    latestEntry,
    latestWellness: input.latestWellness,
    routine: input.routine,
    factors,
  });
  const plan30 = buildPlan30({
    latestWellness: input.latestWellness,
    labs: input.labs,
  });
  const forecast = buildForecast(index, factors, plan7, plan30);

  return {
    index,
    trend30,
    risk: computeRisk(index),
    factors,
    plan7,
    plan30,
    forecast,
  };
}
