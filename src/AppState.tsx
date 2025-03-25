import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { mountStoreDevtool } from "simple-zustand-devtools";

import { MLFlowSlurmRunInfo } from "./services/slurm-monitor/mlflow";
import { DEFAULT_BACKEND_URL } from "./services/slurm-monitor/backend.config";

interface BackendSpec {
  url: string;
  cluster_id: string;
}

interface BackendSpecStore {
  [id: string] : BackendSpec;
}
export interface AppState {
    slurmRuns: MLFlowSlurmRunInfo[];
    updateSlurmRuns: (x: MLFlowSlurmRunInfo[]) => void;

    mlflowUrls: string[];
    updateMlflowUrls: (x: string[]) => void;

    currentBackend: string;
    currentBackendSpec: () => BackendSpec;
    currentCluster: () => string;

    backendSpecs: BackendSpecStore;
    addBackendSpec: (id: string, spec: BackendSpec) => void;
    removeBackendSpec: (id: string) => { backendSpecs: BackendSpecStore};
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

      backendSpecs: { 'ex3': { url: DEFAULT_BACKEND_URL, cluster_id: 'ex3'}},
      addBackendSpec: (id: string, spec: BackendSpec) => set((store) => ({backendSpecs: {...store.backendSpecs, [id]: spec}})),
      removeBackendSpec: (id: string) => set((store) => {
        const {[id]: _ , ...newBackendSpecs} = store.backendSpecs;
        return {backendSpecs: newBackendSpecs}
      }),

      currentBackend: 'ex3',
      currentBackendSpec: () => get().backendSpecs[get().currentBackend],
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