import { Platform } from 'react-native';
import notifee, {
  AndroidImportance,
  RepeatFrequency,
  TimestampTrigger,
  TriggerType,
} from '@notifee/react-native';

export const REMINDER_CHANNEL_ID = 'skin-reminders';

const compliments = [
  'Ты сегодня особенно красива!',
  'Твоя кожа сияет — как и ты.',
  'Ты выглядишь потрясающе сегодня.',
  'Нежное напоминание: ты прекрасна.',
  'Ты светишься. Сохрани этот момент.',
  'Сегодня твоя красота особенно заметна.',
  'Ты выглядишь свежо и уверенно — именно так, как тебе идет.',
  'Пара минут для себя, и твоя красота засияет еще ярче.',
  'Ты умеешь создавать настроение — и сегодня оно особенно теплое.',
  'Твоя естественная красота — это лучшая подсветка дня.',
  'Сегодня ты будто светишься изнутри — это очень красиво.',
  'Твоя улыбка способна сделать день мягче и уютнее.',
  'Ты в отличной форме, а твоя кожа это подтверждает.',
  'Ты нежная и сильная одновременно — это редкое сочетание.',
  'Сегодня твоё лицо особенно выразительно и гармонично.',
  'Пусть этот день будет лёгким, а ты — сияющей.',
  'Твоя уверенность заметна сразу — и она тебя украшает.',
  'Ты умеешь быть разной, и в каждом образе ты прекрасна.',
  'Ты выглядишь ухоженно и естественно — идеальный баланс.',
  'Твоя красота не требует лишнего — она уже здесь.',
  'Ты достойна заботы о себе, и это чувствуется.',
  'Твой стиль и настроение — как нежный акцент дня.',
  'Ты умеешь держать баланс, и это видно в твоём образе.',
  'Ты очень гармонична сегодня — от взгляда до улыбки.',
  'Ты великолепна, когда выбираешь себя и свой ритм.',
];

const careTips = [
  'Пора на мягкий уход: очищение, увлажнение и спокойный ритм.',
  'Пять минут для кожи сейчас дадут больше, чем редкий интенсивный уход.',
  'Если был активный день, сделай упор на восстановление барьера сегодня вечером.',
  'Небольшой чек-ин: отметь сон, стресс и состояние кожи.',
  'SPF и увлажнение сегодня — это вклад в кожу через год.',
  'Сейчас хороший момент оценить, как кожа реагирует на текущий уход.',
];

type ReminderMessageType = 'compliment' | 'care' | 'mixed';

export type ReminderSchedule = {
  time: string;
  messageType?: ReminderMessageType;
};

export type ReminderScheduleOptions = {
  quietStart?: string;
  quietEnd?: string;
};

function pickRandomCompliment() {
  const index = Math.floor(Math.random() * compliments.length);
  return compliments[index];
}

function pickRandomCareTip() {
  const index = Math.floor(Math.random() * careTips.length);
  return careTips[index];
}

export async function requestNotificationPermissions() {
  try {
    await notifee.requestPermission();
    return true;
  } catch (error) {
    console.warn('Notification permission error', error);
    return false;
  }
}

export async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') {
    return;
  }
  try {
    await notifee.createChannel({
      id: REMINDER_CHANNEL_ID,
      name: 'Skin reminders',
      importance: AndroidImportance.DEFAULT,
    });
  } catch (error) {
    console.warn('Notification channel error', error);
  }
}

function parseTime(value: string) {
  const [hourText, minuteText] = value.split(':');
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
    return null;
  }

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }

  return { hour, minute };
}

function nextTimestampForTime(time: string) {
  const parsed = parseTime(time);
  if (!parsed) {
    return null;
  }

  const now = new Date();
  const next = new Date();
  next.setHours(parsed.hour, parsed.minute, 0, 0);

  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }

  return next.getTime();
}

function isInQuietWindow(hour: number, minute: number, quietStart: string, quietEnd: string) {
  const start = parseTime(quietStart);
  const end = parseTime(quietEnd);
  if (!start || !end) {
    return false;
  }

  const value = hour * 60 + minute;
  const startValue = start.hour * 60 + start.minute;
  const endValue = end.hour * 60 + end.minute;

  if (startValue < endValue) {
    return value >= startValue && value < endValue;
  }

  // Quiet window across midnight.
  return value >= startValue || value < endValue;
}

function adjustToQuietEnd(timestamp: number, quietStart: string, quietEnd: string) {
  const date = new Date(timestamp);
  if (!isInQuietWindow(date.getHours(), date.getMinutes(), quietStart, quietEnd)) {
    return timestamp;
  }

  const end = parseTime(quietEnd);
  if (!end) {
    return timestamp;
  }

  const adjusted = new Date(timestamp);
  adjusted.setHours(end.hour, end.minute, 0, 0);
  if (adjusted.getTime() <= timestamp) {
    adjusted.setDate(adjusted.getDate() + 1);
  }
  return adjusted.getTime();
}

function pickTitleByType(messageType: ReminderMessageType) {
  if (messageType === 'compliment') {
    return pickRandomCompliment();
  }
  if (messageType === 'care') {
    return pickRandomCareTip();
  }

  return Math.random() > 0.5 ? pickRandomCompliment() : pickRandomCareTip();
}

export async function rescheduleDailyReminders(
  reminders: ReminderSchedule[],
  options?: ReminderScheduleOptions,
) {
  try {
    await ensureAndroidChannel();
    await notifee.cancelTriggerNotifications();

    const quietStart = options?.quietStart;
    const quietEnd = options?.quietEnd;

    for (let index = 0; index < reminders.length; index += 1) {
      const reminder = reminders[index];
      const messageType = reminder.messageType ?? 'mixed';
      const baseTimestamp = nextTimestampForTime(reminder.time);
      if (!baseTimestamp) {
        continue;
      }
      const timestamp =
        quietStart && quietEnd
          ? adjustToQuietEnd(baseTimestamp, quietStart, quietEnd)
          : baseTimestamp;

      if (!timestamp) {
        continue;
      }

      const trigger: TimestampTrigger = {
        type: TriggerType.TIMESTAMP,
        timestamp,
        repeatFrequency: RepeatFrequency.DAILY,
      };

      const title = pickTitleByType(messageType);
      await notifee.createTriggerNotification(
        {
          id: `reminder-${index + 1}`,
          title,
          body:
            messageType === 'care'
              ? 'Проверь рутину: как кожа, сон и стресс сегодня?'
              : 'Займет минуту — отметь состояние кожи и заметку.',
          android: {
            channelId: REMINDER_CHANNEL_ID,
            pressAction: { id: 'default' },
            smallIcon: 'ic_launcher',
          },
          ios: {
            sound: 'default',
          },
        },
        trigger,
      );
    }
  } catch (error) {
    console.warn('Reschedule reminders error', error);
  }
}
