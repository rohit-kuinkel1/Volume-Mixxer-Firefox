export type MediaElement = HTMLAudioElement | HTMLVideoElement;

export interface DocumentWithArrive extends Document {
  arrive?: (selector: string, callback: (newElem: MediaElement) => void) => void;
}

export interface VolumeSettings {
  logLevel: number;
  defaultLogLevel: number;
}

export interface VolumeVars {
  percentage: number;
  dayMode: boolean;
  muted: boolean;
  audioCtx: AudioContext;
  gainNode?: GainNode;
  gainConnected: boolean;
  loopEnabled: boolean;
  lastKnownVolume: number;
}
