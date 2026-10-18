/**
 * Web Audio Ringtone Generator
 * Plays lightweight, pleasant synthesized tones for outgoing and incoming calls.
 */

class SoundEffectsManager {
  private ctx: AudioContext | null = null;
  private ringtoneInterval: ReturnType<typeof setInterval> | null = null;

  private getContext(): AudioContext | null {
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  startOutgoingRingtone() {
    this.stopRingtone();

    const playTelephoneRing = () => {
      const ctx = this.getContext();
      if (!ctx) return;

      const playBurst = (startTime: number, duration: number) => {
        [400, 450].forEach((freq) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, startTime);

          gain.gain.setValueAtTime(0.0001, startTime);
          gain.gain.linearRampToValueAtTime(0.08, startTime + 0.02);
          gain.gain.setValueAtTime(0.08, startTime + duration - 0.02);
          gain.gain.linearRampToValueAtTime(0.0001, startTime + duration);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(startTime);
          osc.stop(startTime + duration);
        });
      };

      const now = ctx.currentTime;
      // Pulse 1: "Truu..." (400ms)
      playBurst(now, 0.4);
      // Pulse 2: "...Truu" (400ms after 200ms gap)
      playBurst(now + 0.6, 0.4);
    };

    playTelephoneRing();
    this.ringtoneInterval = setInterval(playTelephoneRing, 3000);
  }

  startIncomingRingtone() {
    this.stopRingtone();

    // In native Android APK, native MediaPlayer handles the system ringtone. Do not play duplicate web chime.
    if (typeof window !== 'undefined' && !!(window as unknown as { AndroidBridge?: { isNativeApp?: () => boolean } }).AndroidBridge?.isNativeApp?.()) {
      return;
    }

    const playChime = () => {
      const ctx = this.getContext();
      if (!ctx) return;

      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.15);

        gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + i * 0.15);
        osc.stop(ctx.currentTime + i * 0.15 + 0.4);
      });
    };

    playChime();
    this.ringtoneInterval = setInterval(playChime, 2500);
  }

  stopRingtone() {
    if (this.ringtoneInterval) {
      clearInterval(this.ringtoneInterval);
      this.ringtoneInterval = null;
    }
  }
}

export const soundEffects = new SoundEffectsManager();
