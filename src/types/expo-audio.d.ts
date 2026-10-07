declare module 'expo-av' {
  export namespace Audio {
    export interface Recording {
      stopAndUnloadAsync(): Promise<void>;
    }
    export function requestPermissionsAsync(): Promise<{ status: string }>;
    export function setAudioModeAsync(options: any): Promise<void>;
    export const Recording: {
      createAsync(options: any): Promise<{ recording: Recording }>;
    };
    export const RecordingOptionsPresets: {
      HIGH_QUALITY: any;
    };
  }
}

declare module 'expo-speech' {
  export interface SpeechOptions {
    language?: string;
    pitch?: number;
    rate?: number;
    onDone?: () => void;
    onError?: (error: any) => void;
  }
  export function speak(text: string, options?: SpeechOptions): void;
  export function stop(): void;
  export function isSpeakingAsync(): Promise<boolean>;
}
