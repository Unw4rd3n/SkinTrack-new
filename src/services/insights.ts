import { LabResult } from '../data/db/models/LabResult';
import { SkinDiagnostic } from '../data/db/models/SkinDiagnostic';
import { RoutineProfile } from '../data/db/models/RoutineProfile';
import { WellnessEntry } from '../data/db/models/WellnessEntry';
import { DailyEntry } from '../data/db/models/DailyEntry';
import { classifyLab } from '../data/repos/labsRepo';

type Insight = {
  title: string;
  text: string;
};

export type ProgressInsight = {
  title: string;
  text: string;
  direction: 'up' | 'down' | 'flat';
};

export type ActionRecommendation = {
  title: string;
  text: string;
  priority: 'high' | 'medium';
};

function normalize(text: string) {
  return text.toLowerCase();
}

function findLab(labs: LabResult[], keyword: string) {
  const key = normalize(keyword);
  return labs.find(item => normalize(item.name).includes(key));
}

export function buildInsights(input: {
  labs: LabResult[];
  wellness?: WellnessEntry | null;
  diagnostics?: SkinDiagnostic | null;
  routine?: RoutineProfile | null;
}): Insight[] {
  const insights: Insight[] = [];

  const { labs, wellness, diagnostics, routine } = input;

  if (wellness) {
    if ((wellness.sleepHours ?? 0) > 0 && (wellness.sleepHours ?? 0) < 6) {
      insights.push({
        title: 'Недосып',
        text: 'Короткий сон часто отражается на барьере кожи и уровне воспалений. Постарайся дать себе хотя бы одну восстановительную ночь.',
      });
    }
    if ((wellness.stressLevel ?? 0) >= 4) {
      insights.push({
        title: 'Высокий стресс',
        text: 'При высоком стрессе кожа быстрее теряет влагу и может становиться более чувствительной. Мягкий уход и спокойный ритм сейчас особенно важны.',
      });
    }
    if ((wellness.pmsLevel ?? 0) >= 3) {
      insights.push({
        title: 'ПМС и чувствительность',
        text: 'В период ПМС кожа чаще реагирует на активы. Можно временно снизить частоту сильных средств и добавить больше восстановления.',
      });
    }
    if ((wellness.cycleDay ?? 0) >= 20 && (wellness.cycleDay ?? 0) <= 28) {
      insights.push({
        title: 'Вторая фаза цикла',
        text: 'Во второй фазе цикла кожа может быть более жирной и реактивной — это нормально. Старайся не перегружать рутину.',
      });
    }
    if ((wellness.proteinScore ?? 0) <= 2) {
      insights.push({
        title: 'Белок в рационе',
        text: 'Кожа и соединительная ткань любят стабильный белок. Это базовая поддержка, особенно если цель — плотность и упругость.',
      });
    }
    if ((wellness.strengthSession ?? 0) === 0) {
      insights.push({
        title: 'Силовая нагрузка',
        text: 'Умеренные силовые тренировки 2 раза в неделю часто помогают поддерживать тонус и качество кожи.',
      });
    }
  }

  if (routine) {
    const strength = routine.retinolStrength ?? 0;
    const retinol = routine.retinolFrequency ?? 0;
    const acids = routine.acidFrequency ?? 0;
    const sensitivity = routine.sensitivity ?? 0;
    const score = strength * retinol + acids * 1.5;
    if (score >= 12 && sensitivity >= 3) {
      insights.push({
        title: 'Активы и чувствительность',
        text: 'Комбинация ретинола и кислот может быть жесткой для чувствительной кожи. Возможно, стоит снизить частоту или добавить паузы восстановления.',
      });
    }
  }

  if (diagnostics) {
    if ((diagnostics.photoaging ?? 0) >= 6) {
      insights.push({
        title: 'Фотостарение',
        text: 'Повышенный уровень фотостарения обычно требует стабильного SPF и мягкого восстановления. Это даёт самую заметную долгосрочную разницу.',
      });
    }
    if ((diagnostics.density ?? 0) <= 3) {
      insights.push({
        title: 'Плотность кожи',
        text: 'Если плотность снижается, полезно делать ставку на барьер и питание кожи, а не на агрессивные активы.',
      });
    }
  }

  const ferritin = findLab(labs, 'ферритин');
  if (ferritin) {
    const status = classifyLab(ferritin.value, ferritin.refLow, ferritin.refHigh);
    if (status === 'low') {
      insights.push({
        title: 'Низкий ферритин',
        text: 'Низкий ферритин иногда сопровождается тусклостью и сухостью кожи. Это повод обсудить результат с врачом.',
      });
    }
  }

  const vitaminD = findLab(labs, 'витамин d');
  if (vitaminD) {
    const status = classifyLab(vitaminD.value, vitaminD.refLow, vitaminD.refHigh);
    if (status === 'low') {
      insights.push({
        title: 'Витамин D ниже нормы',
        text: 'Низкий витамин D может быть связан со снижением защитных функций кожи. Лучше обсудить это со специалистом.',
      });
    }
  }

  const tsh = findLab(labs, 'ттг');
  if (tsh) {
    const status = classifyLab(tsh.value, tsh.refLow, tsh.refHigh);
    if (status === 'high' || status === 'low') {
      insights.push({
        title: 'Гормоны щитовидной железы',
        text: 'Изменения ТТГ могут влиять на кожу, волосы и энергию. Это стоит обсудить с врачом.',
      });
    }
  }

  const testosterone = findLab(labs, 'тестостерон');
  if (testosterone) {
    const status = classifyLab(testosterone.value, testosterone.refLow, testosterone.refHigh);
    if (status === 'high') {
      insights.push({
        title: 'Тестостерон выше нормы',
        text: 'Повышенный тестостерон может усиливать склонность к воспалениям. Важно наблюдать динамику и обсуждать результаты со специалистом.',
      });
    }
  }

  return insights.slice(0, 6);
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}

function average(values: number[]) {
  if (values.length === 0) {
    return null;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function calcPercentDelta(current: number, previous: number) {
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function build30DayProgress(input: {
  entries: DailyEntry[];
  diagnostics: SkinDiagnostic[];
}): ProgressInsight[] {
  const result: ProgressInsight[] = [];
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  const currentEntries = input.entries.filter(item => item.entryDate >= now - 30 * day);
  const previousEntries = input.entries.filter(
    item => item.entryDate < now - 30 * day && item.entryDate >= now - 60 * day,
  );
  if (currentEntries.length >= 4 && previousEntries.length >= 4) {
    const currentSleepAvg = average(
      currentEntries.map(item => item.sleepHours).filter((value): value is number => value !== undefined),
    );
    const previousSleepAvg = average(
      previousEntries.map(item => item.sleepHours).filter((value): value is number => value !== undefined),
    );
    if (currentSleepAvg !== null && previousSleepAvg !== null) {
      const delta = calcPercentDelta(currentSleepAvg, previousSleepAvg);
      result.push({
        title: 'Сон',
        text:
          delta >= 0
            ? `Средняя длительность сна выросла на ${round(Math.abs(delta))}%.`
            : `Средняя длительность сна снизилась на ${round(Math.abs(delta))}%.`,
        direction: delta > 1 ? 'up' : delta < -1 ? 'down' : 'flat',
      });
    }

    const currentStress = average(
      currentEntries.map(item => item.stress).filter((value): value is number => value !== undefined),
    );
    const previousStress = average(
      previousEntries.map(item => item.stress).filter((value): value is number => value !== undefined),
    );
    if (currentStress !== null && previousStress !== null) {
      const delta = calcPercentDelta(currentStress, previousStress);
      result.push({
        title: 'Стресс',
        text:
          delta <= 0
            ? `Средний стресс уменьшился на ${round(Math.abs(delta))}%.`
            : `Средний стресс вырос на ${round(Math.abs(delta))}%.`,
        direction: delta < -1 ? 'up' : delta > 1 ? 'down' : 'flat',
      });
    }
  }

  const sortedDiagnostics = [...input.diagnostics].sort((a, b) => b.entryDate - a.entryDate);
  const latest = sortedDiagnostics[0];
  const previous = sortedDiagnostics.find(item => item.entryDate <= (latest?.entryDate ?? 0) - 25 * day);
  if (latest && previous) {
    const pairs: {
      label: string;
      current?: number;
      prev?: number;
      better: 'higher' | 'lower';
    }[] = [
      { label: 'Плотность кожи', current: latest.density ?? undefined, prev: previous.density ?? undefined, better: 'higher' },
      { label: 'Пигментация', current: latest.pigmentation ?? undefined, prev: previous.pigmentation ?? undefined, better: 'lower' },
      { label: 'Фотостарение', current: latest.photoaging ?? undefined, prev: previous.photoaging ?? undefined, better: 'lower' },
    ];

    for (const pair of pairs) {
      if (pair.current === undefined || pair.prev === undefined) {
        continue;
      }
      const delta = calcPercentDelta(pair.current, pair.prev);
      const improved = pair.better === 'higher' ? delta > 0 : delta < 0;
      result.push({
        title: pair.label,
        text: improved
          ? `Показатель улучшился на ${round(Math.abs(delta))}%.`
          : `Показатель ухудшился на ${round(Math.abs(delta))}%.`,
        direction: improved ? 'up' : 'down',
      });
    }
  }

  return result.slice(0, 4);
}

export function buildActionRecommendations(input: {
  labs: LabResult[];
  wellness?: WellnessEntry | null;
  routine?: RoutineProfile | null;
}): ActionRecommendation[] {
  const items: ActionRecommendation[] = [];

  if ((input.wellness?.sleepHours ?? 7) < 6.5) {
    items.push({
      title: 'Сон и восстановление',
      text: 'На ближайшие 7 дней цель: минимум 3 ночи по 7-8 часов. Это снизит реактивность и сухость кожи.',
      priority: 'high',
    });
  }

  if ((input.wellness?.stressLevel ?? 0) >= 4) {
    items.push({
      title: 'Контроль стресса',
      text: 'Добавь 10-15 минут антистресс-ритуала ежедневно: дыхание, прогулка, мягкая растяжка.',
      priority: 'high',
    });
  }

  if ((input.wellness?.cycleDay ?? 0) >= 20 || (input.wellness?.pmsLevel ?? 0) >= 3) {
    items.push({
      title: 'Цикл и ПМС',
      text: 'Во второй фазе цикла снизь агрессивные активы и сделай акцент на барьерном уходе.',
      priority: 'medium',
    });
  }

  const ferritin = findLab(input.labs, 'ферритин');
  if (ferritin && classifyLab(ferritin.value, ferritin.refLow, ferritin.refHigh) === 'low') {
    items.push({
      title: 'Ферритин',
      text: 'Обсуди дефицит ферритина со специалистом и отметь динамику сухости/тусклости кожи через 4-8 недель.',
      priority: 'high',
    });
  }

  const vitaminD = findLab(input.labs, 'витамин d');
  if (vitaminD && classifyLab(vitaminD.value, vitaminD.refLow, vitaminD.refHigh) === 'low') {
    items.push({
      title: 'Витамин D',
      text: 'При дефиците витамина D чаще падает восстановление кожи: проверь коррекцию и отслеживай прогресс.',
      priority: 'high',
    });
  }

  if (input.routine) {
    const strength = input.routine.retinolStrength ?? 0;
    const retinol = input.routine.retinolFrequency ?? 0;
    const acids = input.routine.acidFrequency ?? 0;
    const sensitivity = input.routine.sensitivity ?? 0;
    if (strength * retinol + acids * 1.4 >= 12 && sensitivity >= 3) {
      items.push({
        title: 'Активы',
        text: 'Текущая нагрузка активами высокая: сократи частоту на 1 шаг и добавь 2 вечера восстановления.',
        priority: 'high',
      });
    }
  }

  if (items.length < 3) {
    items.push({
      title: 'База ухода',
      text: 'Стабильный SPF, мягкое очищение и регулярные отметки в трекере дадут самый надежный прирост в динамике.',
      priority: 'medium',
    });
  }

  return items.slice(0, 5);
}
