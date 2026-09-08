/**
 * Tiện ích âm thanh thông báo qua Web Audio API
 */

export const playSuccessBeep = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Two-tone cheerful chime: 880Hz (A5) ramping to 1760Hz (A6)
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.25);

    // Clean up audio context
    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 300);
  } catch (e) {
    // Ignore if audio is not permitted or fails
  }
};
