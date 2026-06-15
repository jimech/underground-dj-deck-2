import { DrumInstrument } from '../types';

class AudioEngine {
  ctx: AudioContext | null = null;
  masterGain: GainNode | null = null;
  analyzer: AnalyserNode | null = null;
  delayNode: DelayNode | null = null;
  delayFeedback: GainNode | null = null;
  delayGainNode: GainNode | null = null;
  masterFilterNode: BiquadFilterNode | null = null;

  // EffectsRack Vinyl Crackle noise generator nodes & parameters
  effectsVinylCrackleActive: boolean = false;
  effectsVinylCrackleSource: AudioBufferSourceNode | null = null;
  effectsVinylCrackleFilter: BiquadFilterNode | null = null;
  effectsVinylCrackleGain: GainNode | null = null;
  effectsVinylCrackleVolume: number = 0.25; // default volume
  effectsVinylCrackleFreq: number = 1000;  // bandpass center frequency
  effectsVinylCrackleQ: number = 1.0;      // bandpass resonance Q

  // User Custom uploaded tracks & active loop nodes
  uploadedTracks: Array<{ id: string; name: string; buffer: AudioBuffer }> = [];
  activeCustomSources: { A: AudioBufferSourceNode | null; B: AudioBufferSourceNode | null } = { A: null, B: null };

  // Stutter Beat-Repeater parameters
  stutterActive: boolean = false;
  stutterRate: number = 4; // 1 = 1/4 note, 2 = 1/8 note, 4 = 1/16 note, 8 = 1/32 note
  stutterLockedStep: number = 0;
  stutterCounter: number = 0;

  // Custom noise buffer for hi-hats, vinyl crackle, and snares
  noiseBuffer: AudioBuffer | null = null;

  // Turntable channels
  decks: {
    A: {
      gain: GainNode | null;
      eqLow: BiquadFilterNode | null;
      eqMid: BiquadFilterNode | null;
      eqHigh: BiquadFilterNode | null;
      filter: BiquadFilterNode | null;
    };
    B: {
      gain: GainNode | null;
      eqLow: BiquadFilterNode | null;
      eqMid: BiquadFilterNode | null;
      eqHigh: BiquadFilterNode | null;
      filter: BiquadFilterNode | null;
    };
  } = {
    A: { gain: null, eqLow: null, eqMid: null, eqHigh: null, filter: null },
    B: { gain: null, eqLow: null, eqMid: null, eqHigh: null, filter: null },
  };

  // Vinyl Crackle generators
  vinylCrackleA: AudioWorkletNode | ScriptProcessorNode | null = null;
  vinylCrackleB: AudioWorkletNode | ScriptProcessorNode | null = null;
  vinylCrackleGainA: GainNode | null = null;
  vinylCrackleGainB: GainNode | null = null;
  
  // Custom analog wear level (0 = brand new pristine, 1 = heavily deteriorated)
  dustCrackleLevels: { A: number; B: number } = { A: 0.35, B: 0.35 };

  // Master ambient texture generators
  ambientMode: 'none' | 'subway' | 'rain' | 'crowd' | 'drone' = 'none';
  ambientGainNode: GainNode | null = null;
  ambientGenerator: ScriptProcessorNode | null = null;

  // Master DJ resonant flanger/phasor node
  masterFlangerNode: BiquadFilterNode | null = null;
  masterFlangerSweep: number = 0; // 0 to 100%

  // Master groove parameters
  swingAmount: number = 0.0; // 0.0 (straight) to 0.70 (heavy swing)

  // Clock state for scheduling loops & sequencer
  isPowerOn: boolean = false;
  bpm: number = 125;
  schedulerTimerId: number | null = null;
  nextNoteTime: number = 0;
  currentStep: number = 0;
  
  // Sequencing states
  sequencerTracks: { [key in DrumInstrument]: boolean[] } = {
    kick: Array(16).fill(false),
    snare: Array(16).fill(false),
    hihat: Array(16).fill(false),
    synth: Array(16).fill(false),
  };
  
  deckPlayStates: { A: boolean; B: boolean } = { A: false, B: false };
  deckPitches: { A: number; B: number } = { A: 1.0, B: 1.0 };
  deckSelectedTracks: { A: number; B: number } = { A: 0, B: 0 };
  deckReversed: { A: boolean; B: boolean } = { A: false, B: false };

  // Cached mixer properties for state persistence and session storage
  crossfaderValue: number = 0;
  deckAValues = { vol: 0.7, low: 0, mid: 0, high: 0, filter: 0 };
  deckBValues = { vol: 0.7, low: 0, mid: 0, high: 0, filter: 0 };
  swingAmountValue: number = 0;
  flangerValue: number = 0;
  
  // True analog Turntable decel glides (starts at 0.0, target 1.0 when play, slides to 0.0 on mute)
  deckGlideRates: { A: number; B: number } = { A: 0.0, B: 0.0 };

  // Master tape wear & drift parameters (Wow & Flutter)
  wowAmount: number = 0.25;
  flutterAmount: number = 0.15;

  // Real-time Master Web Audio Stream recording properties (actual live session capture)
  mediaDestination: MediaStreamAudioDestinationNode | null = null;
  mediaRecorder: MediaRecorder | null = null;
  recordedChunks: Blob[] = [];
  isRecording: boolean = false;
  recordedUrl: string | null = null;
  
  // Handlers for UI synchronization
  onStepChange: ((step: number) => void) | null = null;

  visualizerMode: string = 'bars';
  stickerText: string = '[BERLIN SET #4 - 13.06.26] WAREHOUSE RIG';

  constructor() {
    // Initializer defaults
    this.sequencerTracks.kick[0] = true;
    this.sequencerTracks.kick[4] = true;
    this.sequencerTracks.kick[8] = true;
    this.sequencerTracks.kick[12] = true;
    this.sequencerTracks.hihat[2] = true;
    this.sequencerTracks.hihat[6] = true;
    this.sequencerTracks.hihat[10] = true;
    this.sequencerTracks.hihat[14] = true;
    this.sequencerTracks.snare[4] = true;
    this.sequencerTracks.snare[12] = true;
    this.sequencerTracks.synth[3] = true;
    this.sequencerTracks.synth[11] = true;
  }

  init() {
    if (this.ctx) return;

    // Support vendor prefixes
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AudioContextClass();

    // Master path setup with inline DJ master flanger/phasor node
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.8;

    // Master DJ Filter Node (Highpass/Lowpass combo)
    this.masterFilterNode = this.ctx.createBiquadFilter();
    this.masterFilterNode.type = 'peaking'; // default flat
    this.masterFilterNode.frequency.value = 1000;
    this.masterFilterNode.Q.value = 1.0;
    this.masterFilterNode.gain.value = 0;

    this.masterFlangerNode = this.ctx.createBiquadFilter();
    this.masterFlangerNode.type = 'allpass';
    this.masterFlangerNode.frequency.value = 1000;
    this.masterFlangerNode.Q.value = 4.0;

    this.analyzer = this.ctx.createAnalyser();
    this.analyzer.fftSize = 256;

    this.masterGain.connect(this.masterFilterNode);
    this.masterFilterNode.connect(this.masterFlangerNode);
    this.masterFlangerNode.connect(this.analyzer);
    this.analyzer.connect(this.ctx.destination);

    // Setup master live tape recorder stream destination
    try {
      this.mediaDestination = this.ctx.createMediaStreamDestination();
      this.analyzer.connect(this.mediaDestination);
    } catch (e) {
      console.warn('MediaStreamAudioDestination not available:', e);
    }

    // Warm echo tape delay setup
    this.delayNode = this.ctx.createDelay(2.0);
    this.delayNode.delayTime.value = 0.333; // ~dotted 8th note at 125BPM
    this.delayFeedback = this.ctx.createGain();
    this.delayFeedback.gain.value = 0.4;

    this.delayGainNode = this.ctx.createGain();
    this.delayGainNode.gain.value = 0.4; // Wet send mix level

    this.delayNode.connect(this.delayFeedback);
    this.delayFeedback.connect(this.delayNode); // feedback loop

    this.delayNode.connect(this.delayGainNode);
    this.delayGainNode.connect(this.masterGain);

    // Set up noise buffer / dust cracks
    const bufferSize = this.ctx.sampleRate * 2; // 2 seconds of noise
    this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    // Set up Decks
    this.setupDeckChannel('A');
    this.setupDeckChannel('B');

    // Start background vinyl crackle generators (pure raw script processors for compatibility)
    this.setupVinylCrackle('A');
    this.setupVinylCrackle('B');

    // Start procedural background hums
    this.setupAmbientGenerator();

    // Start scheduler loop
    this.isPowerOn = true;
    this.nextNoteTime = this.ctx.currentTime;
    this.runScheduler();
  }

  setupDeckChannel(deckId: 'A' | 'B') {
    if (!this.ctx || !this.masterGain) return;

    const deckGain = this.ctx.createGain();
    deckGain.gain.value = 0.7;

    // 3-band EQs
    const eqLow = this.ctx.createBiquadFilter();
    eqLow.type = 'lowshelf';
    eqLow.frequency.value = 250;
    eqLow.gain.value = 0;

    const eqMid = this.ctx.createBiquadFilter();
    eqMid.type = 'peaking';
    eqMid.Q.value = 1.0;
    eqMid.frequency.value = 1000;
    eqMid.gain.value = 0;

    const eqHigh = this.ctx.createBiquadFilter();
    eqHigh.type = 'highshelf';
    eqHigh.frequency.value = 4000;
    eqHigh.gain.value = 0;

    // DJ Filter knob (Highpass/Lowpass combo)
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'peaking'; // default flat
    filter.frequency.value = 1000;
    filter.Q.value = 1.0;

    // Chain connections: Source -> eqLow -> eqMid -> eqHigh -> filter -> deckGain -> masterGain
    eqLow.connect(eqMid);
    eqMid.connect(eqHigh);
    eqHigh.connect(filter);
    filter.connect(deckGain);
    deckGain.connect(this.masterGain);

    this.decks[deckId] = {
      gain: deckGain,
      eqLow,
      eqMid,
      eqHigh,
      filter,
    };
  }

  setupVinylCrackle(deckId: 'A' | 'B') {
    if (!this.ctx) return;
    const crackleGain = this.ctx.createGain();
    crackleGain.gain.value = 0.05; // subtle overlay

    // Connect vinyl crackle to corresponding deck gain channel directly
    const deck = this.decks[deckId];
    if (deck.gain) {
      crackleGain.connect(deck.gain);
    }

    // ScriptProcessor to generate live analogue warmth (clicks, dust crackle, pops)
    const scriptNode = this.ctx.createScriptProcessor(4096, 0, 1);
    scriptNode.onaudioprocess = (e) => {
      const output = e.outputBuffer.getChannelData(0);
      const activeFactor = this.deckGlideRates[deckId]; // physical tape speed
      const intensity = this.dustCrackleLevels[deckId]; // dust control (0 to 1)
      
      for (let i = 0; i < output.length; i++) {
        // static background hiss scaled by dust level
        let val = (Math.random() * 2 - 1) * 0.008 * intensity;
        
        // vinyl dust clicks and rumbles
        if (activeFactor > 0.03) {
          if (Math.random() < 0.0003 * intensity * 5) {
            // sharp micro crackle pop
            val += (Math.random() > 0.5 ? 0.35 : -0.35) * Math.sin(i * 0.5) * activeFactor;
          }
          if (Math.random() < 0.003 * intensity * 3) {
            // low rumble pop
            val += (Math.random() * 0.12) * activeFactor;
          }
        } else {
          // off deck warmth is quiet
          val *= 0.1;
        }
        output[i] = val;
      }
    };

    if (deckId === 'A') {
      this.vinylCrackleA = scriptNode;
      this.vinylCrackleGainA = crackleGain;
      scriptNode.connect(crackleGain);
    } else {
      this.vinylCrackleB = scriptNode;
      this.vinylCrackleGainB = crackleGain;
      scriptNode.connect(crackleGain);
    }
  }

  setupAmbientGenerator() {
    if (!this.ctx || !this.masterGain) return;

    this.ambientGainNode = this.ctx.createGain();
    this.ambientGainNode.gain.value = 0.22; // snug comfy balance
    this.ambientGainNode.connect(this.masterGain);

    const scriptNode = this.ctx.createScriptProcessor(8192, 0, 1);
    
    let rainThresh = 0.993;
    let phase = 0;
    let subRumbleIndex = 0;

    scriptNode.onaudioprocess = (e) => {
      const output = e.outputBuffer.getChannelData(0);
      const mode = this.ambientMode;

      for (let i = 0; i < output.length; i++) {
        let sampleVal = 0;

        if (mode === 'rain') {
          // Soft ambient rain
          const noise = Math.random() * 2 - 1;
          phase += 0.00008;
          const thunderRumble = Math.sin(phase) * 0.02 * Math.sin(phase * 0.11);
          
          if (Math.random() > rainThresh) {
            sampleVal = noise * 0.25 + thunderRumble;
          } else {
            sampleVal = noise * 0.012 + thunderRumble;
          }
        } else if (mode === 'subway') {
          // Massive continuous low frequency subway vibration sweeps (35Hz)
          subRumbleIndex++;
          const oscLFO = Math.sin(subRumbleIndex * 0.0008) * Math.sin(subRumbleIndex * 0.0025);
          const subwayRumble = Math.sin(subRumbleIndex * 0.006) * Math.max(0, oscLFO) * 0.20;
          sampleVal = (Math.random() * 2 - 1) * 0.008 + subwayRumble;
        } else if (mode === 'crowd') {
          // Underground warehouse chattering murmur
          phase += 0.03;
          const humOsc = Math.sin(phase) * Math.cos(phase * 0.28) * Math.sin(phase * 0.012);
          sampleVal = (Math.random() * 2 - 1) * 0.005 + humOsc * 0.045;
        } else if (mode === 'drone') {
          // Ultra cozy 55Hz (A1 note) detuned deep modular synth drone
          phase += 0.00755;
          const oscA = Math.sin(phase);
          const oscB = Math.sin(phase * 1.018); // rich detuned chorus sliding beat frequency
          const filterSweep = 0.35 + Math.sin(phase * 0.022) * 0.30;
          sampleVal = (oscA + oscB) * 0.10 * filterSweep + (Math.random() * 2 - 1) * 0.003;
        } else {
          sampleVal = 0;
        }

        output[i] = sampleVal;
      }
    };

    scriptNode.connect(this.ambientGainNode);
    this.ambientGenerator = scriptNode;
  }

  setPower(state: boolean) {
    if (state) {
      if (!this.ctx) {
        this.init();
      } else if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      this.isPowerOn = true;
    } else {
      if (this.ctx && this.ctx.state === 'running') {
        this.ctx.suspend();
      }
      this.isPowerOn = false;
    }
  }

  setBpm(newBpm: number) {
    this.bpm = Math.max(60, Math.min(220, newBpm));
  }

  setCrossfader(value: number) {
    this.crossfaderValue = value;
    // value ranges from -1.0 (pure A) to +1.0 (pure B)
    if (!this.decks.A.gain || !this.decks.B.gain) return;

    // Constant-power DJ crossfader curves using trigonometric math
    const x = (value + 1) / 2; // scale to 0.0 -> 1.0
    const gainA = Math.cos(x * Math.PI / 2);
    const gainB = Math.sin(x * Math.PI / 2);

    this.decks.A.gain.gain.value = gainA * 0.8;
    this.decks.B.gain.gain.value = gainB * 0.8;
  }

  setVolume(deckId: 'A' | 'B', level: number) {
    if (deckId === 'A') this.deckAValues.vol = level;
    else this.deckBValues.vol = level;

    const deck = this.decks[deckId];
    if (deck.gain) {
      deck.gain.gain.value = level;
    }
  }

  setEQ(deckId: 'A' | 'B', band: 'low' | 'mid' | 'high', value: number) {
    if (deckId === 'A') this.deckAValues[band] = value;
    else this.deckBValues[band] = value;

    const deck = this.decks[deckId];
    if (band === 'low' && deck.eqLow) deck.eqLow.gain.setValueAtTime(value, this.ctx!.currentTime);
    if (band === 'mid' && deck.eqMid) deck.eqMid.gain.setValueAtTime(value, this.ctx!.currentTime);
    if (band === 'high' && deck.eqHigh) deck.eqHigh.gain.setValueAtTime(value, this.ctx!.currentTime);
  }

  setFilter(deckId: 'A' | 'B', value: number) {
    if (deckId === 'A') this.deckAValues.filter = value;
    else this.deckBValues.filter = value;

    // value ranges from -100 to +100
    // Negative = Lowpass filter, Positive = Highpass filter, Zero = PEAK (no effect)
    const deck = this.decks[deckId];
    if (!deck.filter || !this.ctx) return;

    const now = this.ctx.currentTime;
    if (Math.abs(value) < 5) {
      deck.filter.type = 'peaking';
      deck.filter.frequency.setValueAtTime(1000, now);
      deck.filter.gain.setValueAtTime(0, now);
    } else if (value < 0) {
      // LOWPASS filter
      deck.filter.type = 'lowpass';
      // Scale logarithmic frequency 30Hz to 2000Hz
      const minHz = 40;
      const maxHz = 16000;
      const percent = (value + 100) / 100; // 0.0 -> 1.0
      const cutoff = minHz + (maxHz - minHz) * Math.pow(percent, 2.5);
      deck.filter.frequency.setValueAtTime(cutoff, now);
      deck.filter.Q.setValueAtTime(1.5, now);
    } else {
      // HIGHPASS filter
      deck.filter.type = 'highpass';
      // Scale frequency 80Hz to 8000Hz
      const minHz = 80;
      const maxHz = 8000;
      const percent = value / 100; // 0.0 -> 1.0
      const cutoff = minHz + (maxHz - minHz) * Math.pow(percent, 2.5);
      deck.filter.frequency.setValueAtTime(cutoff, now);
      deck.filter.Q.setValueAtTime(1.5, now);
    }
  }

  setDustCrackleLevel(deckId: 'A' | 'B', level: number) {
    this.dustCrackleLevels[deckId] = Math.max(0, Math.min(1, level));
  }

  setWowAmount(amount: number) {
    this.wowAmount = Math.max(0, Math.min(1.0, amount));
  }

  setFlutterAmount(amount: number) {
    this.flutterAmount = Math.max(0, Math.min(1.0, amount));
  }

  setDelayTime(seconds: number) {
    if (!this.ctx || !this.delayNode) return;
    const rounded = Math.max(0.01, Math.min(2.0, seconds));
    this.delayNode.delayTime.setValueAtTime(rounded, this.ctx.currentTime);
  }

  setDelayFeedback(feedback: number) {
    if (!this.ctx || !this.delayFeedback) return;
    const val = Math.max(0.0, Math.min(0.95, feedback));
    this.delayFeedback.gain.setValueAtTime(val, this.ctx.currentTime);
  }

  setDelayWet(level: number) {
    if (!this.ctx || !this.delayGainNode) return;
    const val = Math.max(0.0, Math.min(1.0, level));
    this.delayGainNode.gain.setValueAtTime(val, this.ctx.currentTime);
  }

  setMasterFilterXY(x: number, y: number) {
    if (!this.ctx || !this.masterFilterNode) return;

    if (x < 0.47) {
      if (this.masterFilterNode.type !== 'lowpass') this.masterFilterNode.type = 'lowpass';
      const t = x / 0.47;
      const freq = 60 + t * t * 7000; // 60Hz to 7.0kHz low-pass
      this.masterFilterNode.frequency.setValueAtTime(freq, this.ctx.currentTime);
      this.masterFilterNode.gain.setValueAtTime(0, this.ctx.currentTime);
    } else if (x > 0.53) {
      if (this.masterFilterNode.type !== 'highpass') this.masterFilterNode.type = 'highpass';
      const t = (x - 0.53) / 0.47;
      const freq = 60 + t * t * 12000; // 60Hz to 12.0kHz high-pass
      this.masterFilterNode.frequency.setValueAtTime(freq, this.ctx.currentTime);
      this.masterFilterNode.gain.setValueAtTime(0, this.ctx.currentTime);
    } else {
      if (this.masterFilterNode.type !== 'peaking') this.masterFilterNode.type = 'peaking';
      this.masterFilterNode.frequency.setValueAtTime(1000, this.ctx.currentTime);
      this.masterFilterNode.gain.setValueAtTime(0, this.ctx.currentTime);
    }

    const qValue = 0.5 + y * 18.0; // resonance Q factor up to 18.5
    this.masterFilterNode.Q.setValueAtTime(qValue, this.ctx.currentTime);
  }

  resetMasterFilter() {
    if (!this.ctx || !this.masterFilterNode) return;
    if (this.masterFilterNode.type !== 'peaking') this.masterFilterNode.type = 'peaking';
    this.masterFilterNode.frequency.setValueAtTime(1000, this.ctx.currentTime);
    this.masterFilterNode.gain.setValueAtTime(0, this.ctx.currentTime);
    this.masterFilterNode.Q.setValueAtTime(1.0, this.ctx.currentTime);
  }

  setStutter(active: boolean, rate: number) {
    this.stutterActive = active;
    this.stutterRate = rate;
    if (active) {
      this.stutterLockedStep = this.currentStep;
      this.stutterCounter = 0;
    }
  }

  toggleEffectsVinylCrackle(active: boolean) {
    this.effectsVinylCrackleActive = active;
    if (active) {
      if (!this.ctx) {
        this.setPower(true);
      }
      if (!this.ctx || !this.masterGain) return;

      this.stopEffectsVinylCrackle();

      this.effectsVinylCrackleSource = this.ctx.createBufferSource();
      if (this.noiseBuffer) {
        this.effectsVinylCrackleSource.buffer = this.noiseBuffer;
        this.effectsVinylCrackleSource.loop = true;
      }

      this.effectsVinylCrackleFilter = this.ctx.createBiquadFilter();
      this.effectsVinylCrackleFilter.type = 'bandpass';
      this.effectsVinylCrackleFilter.frequency.setValueAtTime(this.effectsVinylCrackleFreq, this.ctx.currentTime);
      this.effectsVinylCrackleFilter.Q.setValueAtTime(this.effectsVinylCrackleQ, this.ctx.currentTime);

      this.effectsVinylCrackleGain = this.ctx.createGain();
      this.effectsVinylCrackleGain.gain.setValueAtTime(this.effectsVinylCrackleVolume, this.ctx.currentTime);

      this.effectsVinylCrackleSource.connect(this.effectsVinylCrackleFilter);
      this.effectsVinylCrackleFilter.connect(this.effectsVinylCrackleGain);
      this.effectsVinylCrackleGain.connect(this.masterGain);

      this.effectsVinylCrackleSource.start(0);
    } else {
      this.stopEffectsVinylCrackle();
    }
  }

  stopEffectsVinylCrackle() {
    if (this.effectsVinylCrackleSource) {
      try {
        this.effectsVinylCrackleSource.stop();
      } catch (e) {
        // ignore
      }
      try {
        this.effectsVinylCrackleSource.disconnect();
      } catch (e) {}
      this.effectsVinylCrackleSource = null;
    }
    if (this.effectsVinylCrackleFilter) {
      try {
        this.effectsVinylCrackleFilter.disconnect();
      } catch (e) {}
      this.effectsVinylCrackleFilter = null;
    }
    if (this.effectsVinylCrackleGain) {
      try {
        this.effectsVinylCrackleGain.disconnect();
      } catch (e) {}
      this.effectsVinylCrackleGain = null;
    }
  }

  setEffectsVinylCrackleVolume(volume: number) {
    this.effectsVinylCrackleVolume = Math.max(0, Math.min(1.0, volume));
    if (this.effectsVinylCrackleGain && this.ctx) {
      this.effectsVinylCrackleGain.gain.setValueAtTime(this.effectsVinylCrackleVolume, this.ctx.currentTime);
    }
  }

  setEffectsVinylCrackleFilter(freq: number, q: number) {
    this.effectsVinylCrackleFreq = Math.max(100, Math.min(8000, freq));
    this.effectsVinylCrackleQ = Math.max(0.1, Math.min(10, q));
    if (this.effectsVinylCrackleFilter && this.ctx) {
      this.effectsVinylCrackleFilter.frequency.setValueAtTime(this.effectsVinylCrackleFreq, this.ctx.currentTime);
      this.effectsVinylCrackleFilter.Q.setValueAtTime(this.effectsVinylCrackleQ, this.ctx.currentTime);
    }
  }

  async decodeAudioFile(file: File): Promise<AudioBuffer> {
    if (!this.ctx) {
      this.init();
    }
    const arrayBuffer = await file.arrayBuffer();
    return new Promise((resolve, reject) => {
      if (!this.ctx) {
        reject(new Error("AudioContext is not initialized"));
        return;
      }
      this.ctx.decodeAudioData(arrayBuffer, (decoded) => {
        resolve(decoded);
      }, (err) => {
        reject(err);
      });
    });
  }

  addUploadedTrack(name: string, buffer: AudioBuffer): number {
    const id = 'uploaded_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    this.uploadedTracks.push({
      id,
      name,
      buffer
    });
    // Returns index 3 + (uploaded index)
    return 3 + this.uploadedTracks.length - 1;
  }

  startCustomDeckTrack(deckId: 'A' | 'B', index: number) {
    this.stopCustomDeckTrack(deckId);
    if (!this.ctx) return;

    const customIndex = index - 3;
    const track = this.uploadedTracks[customIndex];
    if (!track || !track.buffer) return;

    const src = this.ctx.createBufferSource();
    src.buffer = track.buffer;
    src.loop = true;

    // Connect to channel's EQ chain
    const deckChain = this.decks[deckId];
    if (deckChain && deckChain.eqLow) {
      src.connect(deckChain.eqLow);
    } else {
      if (this.masterGain) {
        src.connect(this.masterGain);
      }
    }

    this.activeCustomSources[deckId] = src;
    try {
      src.start(0);
    } catch (e) {
      console.error("Failed to start custom track source node:", e);
    }
  }

  stopCustomDeckTrack(deckId: 'A' | 'B') {
    const src = this.activeCustomSources[deckId];
    if (src) {
      try {
        src.stop();
      } catch (e) {
        // Already stopped
      }
      try {
        src.disconnect();
      } catch (e) {}
      this.activeCustomSources[deckId] = null;
    }
  }

  updateCustomSources() {
    if (!this.ctx || !this.isPowerOn) {
      this.stopCustomDeckTrack('A');
      this.stopCustomDeckTrack('B');
      return;
    }

    ['A', 'B'].forEach((idStr) => {
      const id = idStr as 'A' | 'B';
      const selectedIndex = this.deckSelectedTracks[id];
      const hasCustomTrack = selectedIndex >= 3;

      if (!hasCustomTrack) {
        if (this.activeCustomSources[id]) {
          this.stopCustomDeckTrack(id);
        }
        return;
      }

      const glideRate = this.deckGlideRates[id];
      const shouldPlay = this.deckPlayStates[id] || glideRate > 0.01;

      if (shouldPlay) {
        if (!this.activeCustomSources[id]) {
          this.startCustomDeckTrack(id, selectedIndex);
        }

        const sourceNode = this.activeCustomSources[id];
        if (sourceNode) {
          const rawPitch = this.getRealPitch(id, this.ctx!.currentTime);
          const finalPlaybackRate = Math.max(0.001, rawPitch); 
          try {
            sourceNode.playbackRate.setValueAtTime(finalPlaybackRate, this.ctx!.currentTime);
          } catch (e) {
            // ignore
          }
        }
      } else {
        if (this.activeCustomSources[id]) {
          this.stopCustomDeckTrack(id);
        }
      }
    });
  }

  getRealPitch(deckId: 'A' | 'B', time: number): number {
    const rawPitch = this.deckPitches[deckId] * this.deckGlideRates[deckId];
    if (this.wowAmount === 0 && this.flutterAmount === 0) return rawPitch;

    // Slow WOW drift (~1.8Hz and ~0.9Hz phase-mixed)
    const wowLFO = Math.sin(time * Math.PI * 2 * 1.8) * 0.015 * this.wowAmount +
                     Math.cos(time * Math.PI * 2 * 0.95) * 0.008 * this.wowAmount;

    // Faster FLUTTER vibrato (~14.5Hz and ~8Hz phase-mixed)
    const flutterLFO = Math.sin(time * Math.PI * 2 * 14.5) * 0.006 * this.flutterAmount +
                         Math.cos(time * Math.PI * 2 * 8.2) * 0.004 * this.flutterAmount;

    return rawPitch * (1.0 + wowLFO + flutterLFO);
  }

  startRecording() {
    if (!this.ctx || !this.mediaDestination) return;
    this.recordedChunks = [];
    this.recordedUrl = null;

    try {
      this.mediaRecorder = new MediaRecorder(this.mediaDestination.stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
    } catch (e) {
      try {
        this.mediaRecorder = new MediaRecorder(this.mediaDestination.stream);
      } catch (err) {
        console.error('MediaRecorder creation error', err);
        return;
      }
    }

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };

    this.mediaRecorder.onstop = () => {
      const blob = new Blob(this.recordedChunks, { type: 'audio/webm;' });
      this.recordedUrl = URL.createObjectURL(blob);
      this.isRecording = false;
    };

    this.mediaRecorder.start();
    this.isRecording = true;
  }

  stopRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
    }
  }

  async exportWav(): Promise<Blob> {
    if (this.recordedChunks.length === 0) {
      throw new Error("No recorded sessions detected on tape. Record some loops first.");
    }
    if (!this.ctx) {
      throw new Error("Web Audio context is active but uninitialized.");
    }

    const firstChunk = this.recordedChunks[0];
    const mimeType = firstChunk ? firstChunk.type : 'audio/webm';
    const combinedBlob = new Blob(this.recordedChunks, { type: mimeType });
    const arrayBuffer = await combinedBlob.arrayBuffer();

    const audioBuffer = await new Promise<AudioBuffer>((resolve, reject) => {
      this.ctx!.decodeAudioData(
        arrayBuffer,
        (decoded) => resolve(decoded),
        (err) => reject(new Error("Unable to decode recorded stream. codec unsupported: " + err))
      );
    });

    return audioBufferToWav(audioBuffer);
  }

  setAmbientMode(mode: 'none' | 'subway' | 'rain' | 'crowd' | 'drone') {
    this.ambientMode = mode;
  }

  setMasterFlangerSweep(sweep: number) {
    this.flangerValue = sweep;
    this.masterFlangerSweep = Math.max(0, Math.min(1, sweep));
    if (this.masterFlangerNode && this.ctx) {
      const now = this.ctx.currentTime;
      if (sweep === 0) {
        this.masterFlangerNode.type = 'allpass';
        this.masterFlangerNode.frequency.setValueAtTime(1000, now);
        this.masterFlangerNode.Q.setValueAtTime(1.0, now);
      } else {
        this.masterFlangerNode.type = 'peaking';
        const targetFreq = 120 + Math.pow(sweep, 2.5) * 6000; // 120Hz to 6kHz resonant sweep
        this.masterFlangerNode.frequency.setValueAtTime(targetFreq, now);
        this.masterFlangerNode.Q.setValueAtTime(2.0 + sweep * 10.0, now);
        this.masterFlangerNode.gain.setValueAtTime(sweep * 15, now);
      }
    }
  }

  setSwingAmount(amount: number) {
    this.swingAmountValue = amount;
    this.swingAmount = Math.max(0, Math.min(0.70, amount));
  }

  updateGlides() {
    // 25ms loop update coefficients (for a beautiful 0.4s and 0.6s analog ramp)
    ['A', 'B'].forEach((idStr) => {
      const id = idStr as 'A' | 'B';
      const isTargetOn = this.deckPlayStates[id];
      if (isTargetOn) {
        if (this.deckGlideRates[id] < 1.0) {
          this.deckGlideRates[id] = Math.min(1.0, this.deckGlideRates[id] + 0.08);
        }
      } else {
        if (this.deckGlideRates[id] > 0.0) {
          this.deckGlideRates[id] = Math.max(0.0, this.deckGlideRates[id] - 0.045);
        }
      }
    });
    this.updateCustomSources();
  }

  // Unified scheduler logic (1/16th notes advance step-by-step)
  runScheduler() {
    if (!this.ctx) return;
    if (!this.isPowerOn) {
      this.schedulerTimerId = window.setTimeout(() => this.runScheduler(), 50) as any;
      return;
    }

    // Process our turntable stop glides before scheduling
    this.updateGlides();

    while (this.nextNoteTime < this.ctx.currentTime + 0.1) {
      this.scheduleStep(this.currentStep, this.nextNoteTime);
      this.advanceStep();
    }
    
    this.schedulerTimerId = window.setTimeout(() => this.runScheduler(), 25) as any;
  }

  advanceStep() {
    if (!this.ctx) return;
    const secondsPerBeat = 60.0 / this.bpm;
    const stepsPerBeat = 4; // 1/16th note steps
    this.nextNoteTime += secondsPerBeat / stepsPerBeat;

    if (this.stutterActive) {
      this.stutterCounter++;
      // Loop over current locked step window based on stutter rate multiplier
      const period = this.stutterRate === 1 ? 4 : this.stutterRate === 2 ? 2 : 1;
      this.currentStep = (this.stutterLockedStep + (this.stutterCounter % period)) % 16;
    } else {
      this.currentStep = (this.currentStep + 1) % 16;
      this.stutterLockedStep = this.currentStep;
      this.stutterCounter = 0;
    }

    if (this.onStepChange) {
      this.onStepChange(this.currentStep);
    }
  }

  // Schedule synthesized sound for the active step
  scheduleStep(stepIndex: number, time: number) {
    if (!this.ctx) return;

    // Organic Sequencer Swing: Delay odd-indexed 16th notes
    const secondsPerBeat = 60.0 / this.bpm;
    const stepDuration = secondsPerBeat / 4.0;
    const isOddStep = stepIndex % 2 === 1; // steps 1, 3, 5, 7 ...
    const swingDelay = isOddStep ? (this.swingAmount * 0.40 * stepDuration) : 0;
    const scheduledTime = time + swingDelay;

    // --- Drum Machine & Sequencer ---
    if (this.sequencerTracks.kick[stepIndex]) {
      this.triggerKickSynth(scheduledTime);
    }
    if (this.sequencerTracks.snare[stepIndex]) {
      this.triggerSnareSynth(scheduledTime);
    }
    if (this.sequencerTracks.hihat[stepIndex]) {
      this.triggerHihatSynth(scheduledTime);
    }
    if (this.sequencerTracks.synth[stepIndex]) {
      this.triggerBasslineSynth(scheduledTime, 110);
    }

    // --- Deck A Underground Loop (Warehouse Minimal Techno Synth) ---
    const glideRateA = this.deckGlideRates.A;
    if (this.deckPlayStates.A || glideRateA > 0.01) {
      // Scale pitch directly by the tape spin rate and Wow/Flutter drift
      const pitchA = this.getRealPitch('A', scheduledTime);
      const selectedTrack = this.deckSelectedTracks.A;
      const stepIdxA = this.deckReversed.A ? (15 - stepIndex) : stepIndex;
      const stepPattern = stepIdxA % 8;
      
      if (selectedTrack === 0) {
        // Dubby Sub Bass Groove
        if (stepPattern === 0 || stepPattern === 3 || stepPattern === 6) {
          const bassFreq = (stepPattern === 3 ? 65.41 : 55.0) * pitchA; // C2 or A1
          this.triggerTechnoSubBass('A', scheduledTime, bassFreq);
        }
        if (stepPattern === 2 || stepPattern === 6) {
          this.triggerDeepChords('A', scheduledTime, [110 * pitchA, 131 * pitchA, 165 * pitchA], 0.25); // Am triad
        }
      } else if (selectedTrack === 1) {
        // Dark Hypnotic Bell sweep
        if (stepPattern === 0 || stepPattern === 2 || stepPattern === 4 || stepPattern === 6) {
          const notes = [220, 261.6, 293.7, 329.6]; // Am / C pentatonic scale
          const freq = notes[(stepIdxA + 2) % notes.length] * pitchA;
          this.triggerHypnoticTone('A', scheduledTime, freq, 0.15);
        }
      } else {
        // Warehouse Static Drone loop
        if (stepIdxA % 4 === 2) {
          this.triggerWhiteNoiseSwoosh('A', scheduledTime, 0.22);
        }
      }
    }

    // --- Deck B Underground Loop (Berlin Heavy Acid Arpeggiator) ---
    const glideRateB = this.deckGlideRates.B;
    if (this.deckPlayStates.B || glideRateB > 0.01) {
      const pitchB = this.getRealPitch('B', scheduledTime);
      const selectedTrack = this.deckSelectedTracks.B;
      const stepIdxB = this.deckReversed.B ? (15 - stepIndex) : stepIndex;
      
      if (selectedTrack === 0) {
        // 303 Resonance Acid Arpeggio
        const notes303 = [73.42, 82.41, 98.0, 110.0, 130.81, 146.83]; // Acid minor scale
        const scaleIndex = (stepIdxB + 1) * 3 % notes303.length;
        this.triggerAcid303('B', scheduledTime, notes303[scaleIndex] * pitchB, stepIdxB === 4 || stepIdxB === 12);
      } else if (selectedTrack === 1) {
        // Static Industrial Metallic Hit
        if (stepIdxB % 8 === 4) {
          this.triggerIndustrialMetallicHit('B', scheduledTime, 350 * pitchB, 0.4);
        }
        if (stepIdxB % 4 === 1) {
          this.triggerHihatSynthAtDeck('B', scheduledTime);
        }
      } else {
        // Dark Cinematic Reverbs
        if (stepIdxB % 8 === 0) {
          this.triggerDeepChords('B', scheduledTime, [116.54 * pitchB, 138.59 * pitchB, 174.61 * pitchB], 0.6); // A# minor chord
        }
      }
    }
  }

  // --- SYNTHESIZERS ---

  // Standard Analog-style kick synthesis (high-to-low pitch sweep)
  triggerKickSynth(time: number = this.ctx ? this.ctx.currentTime : 0) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    // Frequency starts high (~150Hz) and falls deeply to 45Hz
    osc.frequency.setValueAtTime(140, time);
    osc.frequency.exponentialRampToValueAtTime(45, time + 0.12);

    // Dynamic clean transient pop
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(1.0, time + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);

    osc.connect(gain);
    if (this.masterGain) gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.28);
  }

  // Filtered noise snare/clap synthesis
  triggerSnareSynth(time: number = this.ctx ? this.ctx.currentTime : 0) {
    if (!this.ctx || !this.noiseBuffer) return;
    
    // Snare white noise component
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = this.noiseBuffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 1000;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.3, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

    // Tri oscillator tone component for metallic body
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, time);
    
    const oscGain = this.ctx.createGain();
    oscGain.gain.setValueAtTime(0.25, time);
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    osc.connect(oscGain);

    if (this.masterGain) {
      noiseGain.connect(this.masterGain);
      oscGain.connect(this.masterGain);
    }

    noiseSource.start(time);
    noiseSource.stop(time + 0.15);
    osc.start(time);
    osc.stop(time + 0.15);
  }

  // High-pass filtered noise hi-hat synthesis
  triggerHihatSynth(time: number = this.ctx ? this.ctx.currentTime : 0) {
    if (!this.ctx || !this.noiseBuffer) return;

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 8500;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.18, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.045);

    noiseSource.connect(filter);
    filter.connect(gain);
    if (this.masterGain) gain.connect(this.masterGain);

    noiseSource.start(time);
    noiseSource.stop(time + 0.05);
  }

  // High-pitched 16th noise hat for deck B overlay
  triggerHihatSynthAtDeck(deckId: 'A' | 'B', time: number) {
    if (!this.ctx || !this.noiseBuffer) return;
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 10500;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.09, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.03);

    noiseSource.connect(filter);
    const deck = this.decks[deckId];
    if (deck.eqLow) {
      filter.connect(deck.eqLow);
    }
    noiseSource.start(time);
    noiseSource.stop(time + 0.04);
  }

  // Custom synth synth/bass notes sequencer channel
  triggerBasslineSynth(time: number, frequency: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(frequency, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(220, time);
    filter.frequency.exponentialRampToValueAtTime(800, time + 0.1);
    filter.Q.value = 4.0;

    gain.gain.setValueAtTime(0.08, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

    osc.connect(filter);
    filter.connect(gain);
    if (this.masterGain) gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.18);
  }

  // --- TURNTABLE LIVE SYNTHESIZERS ---

  triggerTechnoSubBass(deckId: 'A' | 'B', time: number, frequency: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, time);

    gain.gain.setValueAtTime(0.4, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

    osc.connect(gain);
    const deck = this.decks[deckId];
    if (deck.eqLow) {
      gain.connect(deck.eqLow);
    }
    osc.start(time);
    osc.stop(time + 0.25);
  }

  triggerDeepChords(deckId: 'A' | 'B', time: number, frequencies: number[], duration: number) {
    if (!this.ctx) return;
    const deck = this.decks[deckId];
    
    frequencies.forEach((freq) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, time);

      gain.gain.setValueAtTime(0.06, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      osc.connect(gain);
      if (deck.eqLow) {
        gain.connect(deck.eqLow);
      }
      osc.start(time);
      osc.stop(time + duration);
    });
  }

  triggerHypnoticTone(deckId: 'A' | 'B', time: number, frequency: number, duration: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(frequency, time);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1500, time);
    filter.frequency.linearRampToValueAtTime(400, time + duration);

    gain.gain.setValueAtTime(0.18, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(filter);
    filter.connect(gain);
    const deck = this.decks[deckId];
    if (deck.eqLow) {
      gain.connect(deck.eqLow);
    }
    osc.start(time);
    osc.stop(time + duration);
  }

  triggerWhiteNoiseSwoosh(deckId: 'A' | 'B', time: number, duration: number) {
    if (!this.ctx || !this.noiseBuffer) return;
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, time);
    filter.frequency.exponentialRampToValueAtTime(5000, time + duration);
    filter.Q.value = 3.0;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.04, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    noise.connect(filter);
    filter.connect(gain);
    const deck = this.decks[deckId];
    if (deck.eqLow) {
      gain.connect(deck.eqLow);
    }
    noise.start(time);
    noise.stop(time + duration);
  }

  triggerAcid303(deckId: 'A' | 'B', time: number, frequency: number, accent: boolean) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(frequency, time);

    filter.type = 'lowpass';
    // Resonance sweep
    const baseCutoff = accent ? 2200 : 750;
    filter.frequency.setValueAtTime(baseCutoff, time);
    filter.frequency.exponentialRampToValueAtTime(150, time + 0.12);
    filter.Q.value = accent ? 8.0 : 4.5;

    const baseGain = accent ? 0.13 : 0.08;
    gain.gain.setValueAtTime(baseGain, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);

    osc.connect(filter);
    filter.connect(gain);
    const deck = this.decks[deckId];
    if (deck.eqLow) {
      gain.connect(deck.eqLow);
    }
    osc.start(time);
    osc.stop(time + 0.15);
  }

  triggerIndustrialMetallicHit(deckId: 'A' | 'B', time: number, frequency: number, duration: number) {
    if (!this.ctx) return;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(frequency, time);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(frequency * 1.414, time); // Ring-mod/harmonic style

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, time);
    filter.Q.value = 5;

    gain.gain.setValueAtTime(0.06, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    
    const deck = this.decks[deckId];
    if (deck.eqLow) {
      gain.connect(deck.eqLow);
    }
    
    osc1.start(time);
    osc1.stop(time + duration);
    osc2.start(time);
    osc2.stop(time + duration);
  }

  // --- HIPSTER SAMPLER PADS (DYNAMICALLY SYNTHESIZED ON TRIGGER) ---

  triggerSample(sampleId: string) {
    if (!this.ctx || !this.isPowerOn) return;
    const now = this.ctx.currentTime;

    switch (sampleId) {
      case 'sub_drop': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.frequency.setValueAtTime(90, now);
        osc.frequency.exponentialRampToValueAtTime(25, now + 1.2);
        gain.gain.setValueAtTime(0.8, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 1.2);
        
        osc.connect(gain);
        if (this.delayNode) gain.connect(this.delayNode); // feed into reverb/delay
        gain.connect(this.masterGain!);
        osc.start(now);
        osc.stop(now + 1.3);
        break;
      }
      case 'lofi_horn': {
        const chord = [349.23, 440.0, 523.25, 587.33]; // Fm6 jazz chord
        chord.forEach((freq) => {
          const osc = this.ctx!.createOscillator();
          const gain = this.ctx!.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now);
          
          gain.gain.setValueAtTime(0.07, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.82);
          
          osc.connect(gain);
          if (this.delayNode) gain.connect(this.delayNode);
          osc.start(now);
          osc.stop(now + 0.9);
        });
        break;
      }
      case 'laser': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(4500, now);
        osc.frequency.exponentialRampToValueAtTime(280, now + 0.4);
        
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
        
        osc.connect(gain);
        if (this.delayNode) gain.connect(this.delayNode);
        gain.connect(this.masterGain!);
        osc.start(now);
        osc.stop(now + 0.5);
        break;
      }
      case 'crackle_echo': {
        // Multi-trigger little crackle pops that echo
        for (let i = 0; i < 6; i++) {
          const delay = i * 0.08;
          const noise = this.ctx.createBufferSource();
          if (this.noiseBuffer) {
            noise.buffer = this.noiseBuffer;
          }
          const filter = this.ctx.createBiquadFilter();
          filter.type = 'highpass';
          filter.frequency.value = 6000 + (Math.random() * 2000);
          
          const gain = this.ctx.createGain();
          gain.gain.setValueAtTime(0.18, now + delay);
          gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.04);
          
          noise.connect(filter);
          filter.connect(gain);
          if (this.delayNode) gain.connect(this.delayNode);
          noise.start(now + delay);
          noise.stop(now + delay + 0.05);
        }
        break;
      }
      case 'siren': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        // Police/underground dub siren modulation
        osc.frequency.linearRampToValueAtTime(950, now + 0.25);
        osc.frequency.linearRampToValueAtTime(400, now + 0.5);
        osc.frequency.linearRampToValueAtTime(950, now + 0.75);
        osc.frequency.linearRampToValueAtTime(400, now + 1.0);
        
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.15);
        
        osc.connect(gain);
        if (this.delayNode) gain.connect(this.delayNode);
        gain.connect(this.masterGain!);
        osc.start(now);
        osc.stop(now + 1.25);
        break;
      }
      case 'minor_stab': {
        // Beautiful minor 9th dub techno chord
        const roots = [146.83, 174.61, 220.0, 261.63, 311.13]; // Dm9
        roots.forEach((freq) => {
          const osc1 = this.ctx!.createOscillator();
          const osc2 = this.ctx!.createOscillator();
          const gain = this.ctx!.createGain();
          const filter = this.ctx!.createBiquadFilter();

          osc1.type = 'sawtooth';
          osc1.frequency.value = freq - 1.5; // slight detuning
          osc2.type = 'triangle';
          osc2.frequency.value = freq + 1.5;

          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(1400, now);
          filter.frequency.exponentialRampToValueAtTime(250, now + 0.7);
          filter.Q.value = 3.0;

          gain.gain.setValueAtTime(0.05, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

          osc1.connect(filter);
          osc2.connect(filter);
          filter.connect(gain);
          if (this.delayNode) gain.connect(this.delayNode);
          gain.connect(this.masterGain!);
          osc1.start(now);
          osc2.start(now);
          osc1.stop(now + 0.7);
          osc2.stop(now + 0.7);
        });
        break;
      }
      case 'acid_chirp': {
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(240, now);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(6500, now);
        filter.frequency.exponentialRampToValueAtTime(180, now + 0.28);
        filter.Q.value = 13.0; // highly resonant 303 chirp

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        osc.connect(filter);
        filter.connect(gain);
        if (this.delayNode) gain.connect(this.delayNode);
        gain.connect(this.masterGain!);
        osc.start(now);
        osc.stop(now + 0.32);
        break;
      }
      case 'reverb_snare': {
        const noise = this.ctx.createBufferSource();
        if (this.noiseBuffer) noise.buffer = this.noiseBuffer;
        
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 850;

        const gainObj = this.ctx.createGain();
        gainObj.gain.setValueAtTime(0.32, now);
        gainObj.gain.linearRampToValueAtTime(0.15, now + 0.1);
        gainObj.gain.exponentialRampToValueAtTime(0.001, now + 1.2); // huge reverb tail emulation

        noise.connect(filter);
        filter.connect(gainObj);
        
        // Feed heavily into delay buffer to create spatial depth
        if (this.delayNode) {
          const delaySend = this.ctx.createGain();
          delaySend.gain.value = 0.8;
          gainObj.connect(delaySend);
          delaySend.connect(this.delayNode);
        }
        
        gainObj.connect(this.masterGain!);
        noise.start(now);
        noise.stop(now + 1.3);
        break;
      }
    }
  }

  // --- TURNTABLE SCRATCH MATH & SOUND MODULATION ---
  triggerScratchSound(deckId: 'A' | 'B', intensity: number) {
    if (!this.ctx || !this.isPowerOn || intensity < 0.05) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    // Frequency depends directly on scratching speed!
    const baseFreq = 180 + (intensity * 400);
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.linearRampToValueAtTime(baseFreq * 0.3, now + 0.1); // rapid slide down

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800 + (intensity * 1200), now);
    filter.Q.value = 4.0;

    // Fast decay
    const volume = Math.min(0.2, intensity * 0.12);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(filter);
    filter.connect(gain);

    const deck = this.decks[deckId];
    if (deck.gain) {
      gain.connect(deck.gain);
    }

    osc.start(now);
    osc.stop(now + 0.15);
  }
}

// --- WAV Lossless Exporter PCM format helpers ---
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // 16-bit PCM
  const bitDepth = 16;
  
  let result;
  if (numChannels === 2) {
    result = interleaveChannels(buffer.getChannelData(0), buffer.getChannelData(1));
  } else {
    result = buffer.getChannelData(0);
  }
  
  return writeWavBinary(result, numChannels, sampleRate, bitDepth);
}

function interleaveChannels(inputL: Float32Array, inputR: Float32Array): Float32Array {
  const length = inputL.length + inputR.length;
  const result = new Float32Array(length);
  let index = 0;
  let inputIndex = 0;
  
  while (index < length) {
    result[index++] = inputL[inputIndex];
    result[index++] = inputR[inputIndex];
    inputIndex++;
  }
  return result;
}

function writeWavBinary(samples: Float32Array, numChannels: number, sampleRate: number, bitDepth: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  
  /* RIFF identifier */
  writeAsciiString(view, 0, 'RIFF');
  /* file length */
  view.setUint32(4, 36 + samples.length * 2, true);
  /* RIFF type */
  writeAsciiString(view, 8, 'WAVE');
  /* format chunk identifier */
  writeAsciiString(view, 12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw) */
  view.setUint16(20, 1, true); // PCM = 1
  /* channel count */
  view.setUint16(22, numChannels, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, numChannels * (bitDepth / 8), true);
  /* bits per sample */
  view.setUint16(34, bitDepth, true);
  /* data chunk identifier */
  writeAsciiString(view, 36, 'data');
  /* data chunk length */
  view.setUint32(40, samples.length * 2, true);
  
  floatTo16BitPCM(view, 44, samples);
  
  return new Blob([view], { type: 'audio/wav' });
}

function floatTo16BitPCM(output: DataView, offset: number, input: Float32Array) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
}

function writeAsciiString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

// Single singleton exporter so all components reference the same live context
export const audio = new AudioEngine();
