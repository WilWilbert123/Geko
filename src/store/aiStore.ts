import { create } from 'zustand';

interface AIState {
  isModelLoaded: boolean;
  modelName: string | null;
  ramUsageMB: number;
  inferenceSpeedTps: number;
  setStatus: (loaded: boolean, name?: string) => void;
  updateMetrics: (ram: number, tps: number) => void;
}

export const useAIStore = create<AIState>((set) => ({
  isModelLoaded: false,
  modelName: null,
  ramUsageMB: 0,
  inferenceSpeedTps: 0,
  setStatus: (loaded, name) => set((state) => ({ 
    isModelLoaded: loaded, 
    modelName: name || state.modelName 
  })),
  updateMetrics: (ram, tps) => set({ ramUsageMB: ram, inferenceSpeedTps: tps })
}));
