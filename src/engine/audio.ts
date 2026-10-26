/**
 * Blackfree: Anomaly Protocol - Procedural Web Audio Engine
 * Zero-asset real-time synthesis for ultra-responsive sound effects and dynamic atmospheric drone.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private isMuted: boolean = false;
  private droneOscs: OscillatorNode[] = [];
  private droneFilter: BiquadFilterNode | null = null;
  private isDroneActive: boolean = false;

  public init(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }

    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    this.ctx = new AudioContextClass();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
    this.sfxGain.connect(this.masterGain);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
    this.musicGain.connect(this.masterGain);

    this.startAmbientDrone();
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : 0.7, this.ctx.currentTime, 0.05);
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  private startAmbientDrone(): void {
    if (!this.ctx || !this.musicGain || this.isDroneActive) return;
    this.isDroneActive = true;

    this.droneFilter = this.ctx.createBiquadFilter();
    this.droneFilter.type = 'lowpass';
    this.droneFilter.frequency.setValueAtTime(280, this.ctx.currentTime);
    this.droneFilter.connect(this.musicGain);

    // Deep dark synth drone (D minor / A / F bass layers)
    const freqs = [55, 73.42, 110, 146.83];
    freqs.forEach((freq, idx) => {
      if (!this.ctx || !this.droneFilter) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = idx % 2 === 0 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      // Subtle detune for organic chorus
      osc.detune.setValueAtTime((idx - 1.5) * 6, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.12 / freqs.length, this.ctx.currentTime);
      osc.connect(gain);
      gain.connect(this.droneFilter);

      osc.start();
      this.droneOscs.push(osc);
    });
  }

  /** Time Dilation effect (drops music cutoff and pitches down) */
  public setTimeDilation(active: boolean): void {
    if (!this.ctx || !this.droneFilter) return;
    const targetFreq = active ? 110 : 320;
    this.droneFilter.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.08);
  }

  /** Katana Swing */
  public playKatanaSwing(): void {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(450, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.16);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(900, now);
    filter.Q.setValueAtTime(3, now);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.17);
  }

  /** Katana Slash Hit / Flesh impact */
  public playKatanaHit(): void {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Noise crack
    const bufferSize = this.ctx.sampleRate * 0.08;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1200, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start(now);
  }

  /** ULTRAKILL-style Projectile Parry Ding! High-frequency crystalline impact */
  public playParryDing(): void {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const freqs = [1760, 2637, 3520]; // A6, E7, A7 bright harmonic triad
    freqs.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.3 / (idx + 1), now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.46);
    });
  }

  /** Tactical Assault Carbine Shot */
  public playRifleShot(): void {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Sharp punch oscillator
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.06);
    oscGain.gain.setValueAtTime(0.4, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    // Noise burst
    const bufferSize = this.ctx.sampleRate * 0.09;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2200, now);
    filter.Q.setValueAtTime(1.5, now);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.5, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.09);

    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.08);
    noise.start(now);
  }

  /** Heavy Kinetic Revolver Shot */
  public playRevolverShot(): void {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.18);
    oscGain.gain.setValueAtTime(0.7, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    const bufferSize = this.ctx.sampleRate * 0.18;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.35));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.65, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);
    noise.connect(noiseGain);
    noiseGain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.19);
    noise.start(now);
  }

  /** Scatter Shotgun Blast */
  public playShotgunShot(): void {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(25, now + 0.22);
    oscGain.gain.setValueAtTime(0.85, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    const bufferSize = this.ctx.sampleRate * 0.24;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1800, now);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.8, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.24);

    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.23);
    noise.start(now);
  }

  /** Player Jump / Wall-Kick */
  public playJump(): void {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.12);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.13);
  }

  /** Slide / Dash swoosh */
  public playDash(): void {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const bufferSize = this.ctx.sampleRate * 0.14;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.sin((i / bufferSize) * Math.PI);
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(2400, now + 0.14);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start(now);
  }

  /** Vector Origin: Gravity Well activation / Vortex */
  public playGravityWell(): void {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(60, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.25);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.5);

    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.51);
  }

  /** Hitmarker tick */
  public playHitMarker(): void {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(2400, now);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.035);
  }

  /** Mutation Trigger chime (sentient mutation autonomous alert) */
  public playMutationChime(): void {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 arpeggio
    notes.forEach((freq, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.06);

      gain.gain.setValueAtTime(0.2, now + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.25);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.26);
    });
  }

  /** Weapon Switch Mechanical Click */
  public playWeaponSwitch(): void {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.05);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.06);
  }

  /** System Instability / Anomaly siren pulse */
  public playAnomalyWarning(): void {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.linearRampToValueAtTime(880, now + 0.3);
    osc.frequency.linearRampToValueAtTime(440, now + 0.6);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.61);
  }
}

export const sound = new SoundEngine();
