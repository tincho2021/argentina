/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private crowdNode: AudioWorkletNode | ScriptProcessorNode | null = null;
  private crowdGain: GainNode | null = null;

  constructor() {
    // Lazy initialisation on user interaction
  }

  private initContext() {
    if (this.ctx) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    } catch (e) {
      console.warn("Web Audio API not supported", e);
    }
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
    if (this.crowdGain) {
      this.crowdGain.gain.setValueAtTime(muted ? 0 : 0.05, this.ctx?.currentTime || 0);
    }
  }

  public toggleMute(): boolean {
    this.setMute(!this.isMuted);
    return this.isMuted;
  }

  public getMutedStatus(): boolean {
    return this.isMuted;
  }

  // Generate white noise for crowd and whistles
  private createNoiseBuffer(): AudioBuffer | null {
    if (!this.ctx) return null;
    const bufferSize = this.ctx.sampleRate * 2; // 2 seconds of noise
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  // Play a whistle blow (essential soccer sound)
  public playWhistle() {
    this.initContext();
    if (!this.ctx || this.isMuted) return;

    // Resuming context if suspended (browser security policy)
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }

    const playBlow = (delay: number, duration: number, freq: number) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + delay);
      // Add minor vibrato
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + delay);
      osc.frequency.linearRampToValueAtTime(freq + 50, this.ctx.currentTime + delay + duration);

      gain.gain.setValueAtTime(0, this.ctx.currentTime + delay);
      gain.gain.linearRampToValueAtTime(0.2, this.ctx.currentTime + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + delay + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(this.ctx.currentTime + delay);
      osc.stop(this.ctx.currentTime + delay + duration);
    };

    // Traditional whistle: double beep
    playBlow(0, 0.15, 1200);
    playBlow(0.2, 0.3, 1200);
  }

  // Play ball kick sound (deep thud)
  public playKick() {
    this.initContext();
    if (!this.ctx || this.isMuted) return;

    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    // Rapid sweep down from 150Hz to 30Hz
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

    // Filter to make it warmer
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(100, this.ctx.currentTime);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  // Play a swift gambeta swoosh
  public playDribble() {
    this.initContext();
    if (!this.ctx || this.isMuted) return;

    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }

    const noise = this.ctx.createBufferSource();
    const buffer = this.createNoiseBuffer();
    if (!buffer) return;
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(400, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.15);
    filter.Q.setValueAtTime(5, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.15, this.ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start();
    noise.stop(this.ctx.currentTime + 0.25);
  }

  // Play tackled/tackle thud
  public playTackled() {
    this.initContext();
    if (!this.ctx || this.isMuted) return;

    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(90, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(40, this.ctx.currentTime + 0.2);

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(120, this.ctx.currentTime);

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.25);
  }

  // Play a glorious goal cheer & stadium roar!
  public playGoal() {
    this.initContext();
    if (!this.ctx || this.isMuted) return;

    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }

    // Goal whistle first
    this.playWhistle();

    // Sudden swell of noise to simulate a massive crowd cheering
    const noise = this.ctx.createBufferSource();
    const buffer = this.createNoiseBuffer();
    if (!buffer) return;
    noise.buffer = buffer;
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(300, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.4);
    filter.Q.setValueAtTime(1.5, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.4, this.ctx.currentTime + 0.15);
    gain.gain.linearRampToValueAtTime(0.25, this.ctx.currentTime + 0.6);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 2.5);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start();
    noise.stop(this.ctx.currentTime + 2.5);

    // Synthesized fan horn "beeeep beep"
    const horn = (time: number, freq: number, dur: number) => {
      if (!this.ctx) return;
      const hOsc = this.ctx.createOscillator();
      const hGain = this.ctx.createGain();
      hOsc.type = "sawtooth";
      hOsc.frequency.value = freq;

      const hFilter = this.ctx.createBiquadFilter();
      hFilter.type = "lowpass";
      hFilter.frequency.value = freq * 1.5;

      hGain.gain.setValueAtTime(0, this.ctx.currentTime + time);
      hGain.gain.linearRampToValueAtTime(0.12, this.ctx.currentTime + time + 0.05);
      hGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + time + dur);

      hOsc.connect(hFilter);
      hFilter.connect(hGain);
      hGain.connect(this.ctx.destination);

      hOsc.start(this.ctx.currentTime + time);
      hOsc.stop(this.ctx.currentTime + time + dur);
    };

    horn(0.3, 330, 0.4); // E4
    horn(0.75, 330, 0.15);
    horn(0.95, 392, 0.5); // G4
  }

  // Play epic special ability activation (ovación + magical arpeggio)
  public playSpecialAbility() {
    this.initContext();
    if (!this.ctx || this.isMuted) return;

    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }

    // Play a magical ascending harp-like arpeggio
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // C major arpeggio
    notes.forEach((freq, index) => {
      setTimeout(() => {
        if (!this.ctx || this.isMuted) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const delay = index * 0.08;

        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(freq * 1.05, this.ctx.currentTime + 0.3);

        gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.4);
      }, index * 80);
    });

    // Stadium roar swell
    const noise = this.ctx.createBufferSource();
    const buffer = this.createNoiseBuffer();
    if (!buffer) return;
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(450, this.ctx.currentTime);
    filter.Q.value = 1.2;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.25, this.ctx.currentTime + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.8);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start();
    noise.stop(this.ctx.currentTime + 1.8);
  }

  // Background stadium hum (gentle white noise with a narrow lowpass filter)
  public startCrowdHum() {
    this.initContext();
    if (!this.ctx || this.crowdNode) return;

    try {
      if (this.ctx.state === "suspended") {
        this.ctx.resume();
      }

      const buffer = this.createNoiseBuffer();
      if (!buffer) return;

      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 220; // Soft low hum

      this.crowdGain = this.ctx.createGain();
      this.crowdGain.gain.value = this.isMuted ? 0 : 0.04;

      source.connect(filter);
      filter.connect(this.crowdGain);
      this.crowdGain.connect(this.ctx.destination);

      source.start();
      // Store to stop or alter later
      this.crowdNode = source as any; 
    } catch (e) {
      console.warn("Failed to play crowd hum", e);
    }
  }

  public stopCrowdHum() {
    if (this.crowdNode) {
      try {
        (this.crowdNode as any).stop();
      } catch (e) {}
      this.crowdNode = null;
    }
  }
}

export const sound = new SoundEngine();
