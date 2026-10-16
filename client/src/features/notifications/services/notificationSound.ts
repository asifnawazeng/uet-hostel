const SOUND_SETTING_KEY = 'uet-notification-sound-enabled';

let audioContext: AudioContext | null = null;

export function isNotificationSoundEnabled(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.localStorage.getItem(SOUND_SETTING_KEY) !== 'false'
  );
}

export function setNotificationSoundEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(SOUND_SETTING_KEY, String(enabled));

  if (enabled) {
    prepareNotificationSound();
  }
}

export function prepareNotificationSound(): void {
  if (typeof window === 'undefined' || !window.AudioContext) {
    return;
  }

  audioContext ??= new window.AudioContext();

  if (audioContext.state !== 'running') {
    void audioContext.resume().catch((error: unknown) => {
      console.error('[notifications] Unable to enable notification sound:', error);
    });
  }
}

export function playNotificationSound(): void {
  if (!isNotificationSoundEnabled() || typeof window === 'undefined') {
    return;
  }

  prepareNotificationSound();
  if (!audioContext) {
    return;
  }

  if (audioContext.state !== 'running') {
    void audioContext
      .resume()
      .then(playTone)
      .catch((error: unknown) => {
        console.error(
          '[notifications] Unable to play notification sound:',
          error
        );
      });
    return;
  }

  playTone();
}

function playTone(): void {
  if (!audioContext) {
    return;
  }

  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const now = audioContext.currentTime;

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(880, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.12, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.19);
}
