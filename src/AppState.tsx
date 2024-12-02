import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import { MLFlowSlurmRunInfo } from "./services/slurm-monitor/mlflow";
import { DEFAULT_BACKEND_URL } from "./services/slurm-monitor/client";

export interface AppState {
    slurmRuns: MLFlowSlurmRunInfo[];
    updateSlurmRuns: (x: MLFlowSlurmRunInfo[]) => void;

    mlflowUrls: string[];
    updateMlflowUrls: (x: string[]) => void;

    backendUrl: string;
    updateBackendUrl: (x: string) => void;
}

const useAppState = create<AppState>()(
  persist(
    (set) => ({
      slurmRuns: [],
      updateSlurmRuns: (newSlurmRuns: MLFlowSlurmRunInfo[]) =>
        set({ slurmRuns: newSlurmRuns }),

      mlflowUrls: [],
      updateMlflowUrls: (newUrls: string[]) => set({mlflowUrls: newUrls}),

      backendUrl: DEFAULT_BACKEND_URL,
      updateBackendUrl: (newUrl: string) => set({backendUrl: newUrl}),

    }),
    {
      name: "slurm-runs",
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);

export default useAppState;
