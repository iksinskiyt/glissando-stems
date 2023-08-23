interface Window {
  audioContext?: AudioContext;
  audioLimiter?: DynamicsCompressorNode;
  _wasmInitialized?: () => void;
  
  Module: EmscriptenModule;
}

// Corresponding definition in frontend/native/include/stem-manager.h
interface StemInfo {
  id: number;
  path: string;
  samples: number;
  offset: number;
  gainDb: number;
  pan: number;
}

interface NativeMixer {
  testJsBinding: () => number;
  play: () => void;
  pause: () => void;
  stop: () => void;
  getPlaybackState: () => 'play' | 'pause' | 'stop';
  resetPlayback: () => void;
  setPlaybackPosition: (sampleNum: number) => void;
  getPlaybackPosition: () => number;
  getSampleRate: () => number;
  setMetronomeEnabled: (enabled: boolean) => void;
  toggleMetronome: () => void;
  isMetronomeEnabled: () => boolean;
  setMetronomeGainDb: (decibels: number) => void;
  getMetronomeGainDb: () => number;
  setTrackBpm: (bpm: number) => void;
  getTrackBpm: () => number;
  getLeftChannelOutDb: () => number;
  getRightChannelOutDb: () => number;
  setTrackLength: (samples: number) => void;
  getTrackLength: () => number;
  updateStemInfo: (info: StemInfo[]) => void;
}
