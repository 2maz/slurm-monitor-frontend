import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import { MLFlowSlurmRunInfo } from "./services/slurm-monitor/mlflow";

export interface AppState {
    slurmRuns: MLFlowSlurmRunInfo[];
    updateSlurmRuns: (x: MLFlowSlurmRunInfo[]) => void;

    mlflowUrls: string[];
    updateMlflowUrls: (x: string[]) => void;
};

const useAppState = create<AppState>()(
  persist(
    (set) => ({
      slurmRuns: [],
      updateSlurmRuns: (newSlurmRuns: MLFlowSlurmRunInfo[]) =>
        set({ slurmRuns: newSlurmRuns }),

      mlflowUrls: [],
      updateMlflowUrls: (newUrls: string[]) => set({mlflowUrls: newUrls})
    }),
    {
      name: "slurm-runs",
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);

export default useAppState;
