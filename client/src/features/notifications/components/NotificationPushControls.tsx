import { useState } from 'react';

import {
  isNotificationSoundEnabled,
  prepareNotificationSound,
  setNotificationSoundEnabled,
} from '@/features/notifications/services/notificationSound';
import { registerPushNotifications } from '@/features/notifications/services/pushNotificationService';

export function NotificationPushControls() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(
    isNotificationSoundEnabled
  );

  async function handleEnablePush() {
    setIsRegistering(true);
    setMessage(null);

    if (soundEnabled) {
      prepareNotificationSound();
    }

    try {
      await registerPushNotifications();
      setMessage('Push notifications are enabled for this browser.');
    } catch (error: unknown) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Unable to enable push notifications.'
      );
    } finally {
      setIsRegistering(false);
    }
  }

  function handleSoundChange(enabled: boolean) {
    setSoundEnabled(enabled);
    setNotificationSoundEnabled(enabled);
  }

  return (
    <div className="space-y-2">
      <button
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        disabled={isRegistering}
        onClick={() => void handleEnablePush()}
        type="button"
      >
        {isRegistering ? 'Enabling...' : 'Enable Push Notifications'}
      </button>

      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input
          checked={soundEnabled}
          onChange={(event) => handleSoundChange(event.target.checked)}
          type="checkbox"
        />
        Play a sound for notifications while the app is open
      </label>

      {message ? (
        <p className="text-sm text-slate-600" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
