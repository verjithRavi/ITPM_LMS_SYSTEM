export function isWithinReminderWindow(startsAt: string) {
  const now = Date.now();
  const eventTime = new Date(startsAt).getTime();
  const oneHour = 60 * 60 * 1000;
  return now >= eventTime - oneHour && now <= eventTime + oneHour;
}

export async function playReminderAlarm() {
  if (typeof window === "undefined") return;

  const AudioContextCtor =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextCtor) return;

  try {
    const ctx = new AudioContextCtor();
    const now = ctx.currentTime;

    for (let i = 0; i < 4; i += 1) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "square";
      osc.frequency.setValueAtTime(880, now + i * 0.45);
      gain.gain.setValueAtTime(0.0001, now + i * 0.45);
      gain.gain.exponentialRampToValueAtTime(0.35, now + i * 0.45 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.45 + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.45);
      osc.stop(now + i * 0.45 + 0.36);
    }
  } catch {
    // Browsers may block autoplay audio without prior user interaction.
  }
}
