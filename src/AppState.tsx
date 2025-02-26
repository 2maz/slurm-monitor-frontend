import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { mountStoreDevtool } from "simple-zustand-devtools";

import { MLFlowSlurmRunInfo } from "./services/slurm-monitor/mlflow";
import { DEFAULT_BACKEND_URL } from "./services/slurm-monitor/backend.config";

interface BackendUrlStore {
  [id: string] : string;
}
export interface AppState {
    slurmRuns: MLFlowSlurmRunInfo[];
    updateSlurmRuns: (x: MLFlowSlurmRunInfo[]) => void;

    mlflowUrls: string[];
    updateMlflowUrls: (x: string[]) => void;

    currentBackend: string;
    currentBackendUrl: () => string;

    backendUrls: BackendUrlStore,
    addBackendUrl: (id: string, x: string) => void;
    removeBackendUrl: (id: string) => void;
    selectBackend: (id: string) => void;
}

const useAppState = create<AppState>()(
  persist(
    (set, get) => ({
      slurmRuns: [],
      updateSlurmRuns: (newSlurmRuns: MLFlowSlurmRunInfo[]) =>
        set({ slurmRuns: newSlurmRuns }),

      mlflowUrls: [],
      updateMlflowUrls: (newUrls: string[]) => set({mlflowUrls: newUrls}),

      backendUrls: { 'ex3': DEFAULT_BACKEND_URL},
      addBackendUrl: (id: string, newUrl: string) => set((store) => ({backendUrls: {...store.backendUrls, [id]: newUrl}})),
      removeBackendUrl: (id: string) => set((store) => {
        const {[id]: _ , ...newBackendUrls} = store.backendUrls;
        return {backendUrls: newBackendUrls}
      }),

      currentBackend: 'ex3',
      currentBackendUrl: () => get().backendUrls[get().currentBackend],

      selectBackend: (id: string) => set({ currentBackend: id }),
    }),
    {
      name: "slurm-runs",
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);

export default useAppState;

if(process.env.NODE_ENV === 'development'){
  mountStoreDevtool('AppState', useAppState)
}