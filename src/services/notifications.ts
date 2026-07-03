import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

const isMockMode = () =>
  !import.meta.env.VITE_FIREBASE_API_KEY ||
  import.meta.env.VITE_FIREBASE_API_KEY === 'dummy_api_key';

export interface NotificationConfig {
  enabled: boolean;
  telegramBotToken: string;
  telegramChatId: string;
}

export const getNotificationConfig = async (): Promise<NotificationConfig> => {
  if (isMockMode()) {
    const stored = localStorage.getItem('config-notifications');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {}
    }
    return { enabled: false, telegramBotToken: '', telegramChatId: '' };
  }

  try {
    const docSnap = await getDoc(doc(db, 'config', 'notifications'));
    if (docSnap.exists()) {
      return docSnap.data() as NotificationConfig;
    }
  } catch (e) {
    console.error('Error reading notifications config:', e);
  }
  return { enabled: false, telegramBotToken: '', telegramChatId: '' };
};

export const saveNotificationConfig = async (config: NotificationConfig): Promise<void> => {
  if (isMockMode()) {
    localStorage.setItem('config-notifications', JSON.stringify(config));
    return;
  }

  try {
    await setDoc(doc(db, 'config', 'notifications'), config);
  } catch (e) {
    console.error('Error saving notifications config:', e);
  }
};

export const sendTelegramMessage = async (message: string, overrideConfig?: Partial<NotificationConfig>): Promise<boolean> => {
  const config = await getNotificationConfig();
  const token = overrideConfig?.telegramBotToken || config.telegramBotToken;
  const chatId = overrideConfig?.telegramChatId || config.telegramChatId;
  const enabled = overrideConfig?.enabled ?? config.enabled;

  if (!enabled || !token || !chatId) {
    return false;
  }

  if (isMockMode() && !overrideConfig) {
    console.log(`[MOCK TELEGRAM NOTIFICATION] To: ${chatId}. Message: ${message}`);
    return true;
  }

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });
    return response.ok;
  } catch (e) {
    console.error('Error sending Telegram message:', e);
    return false;
  }
};
