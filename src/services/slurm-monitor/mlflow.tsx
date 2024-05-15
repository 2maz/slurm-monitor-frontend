import { useQuery } from "@tanstack/react-query";
import React from "react";
import axios, { AxiosInstance, AxiosResponse } from "axios";

interface Experiment {
  experiment_id: string;
}

const client = axios.create();

interface Param {
    key: string;
    value: string;
}
interface MLFlowRunInfo {
    artifact_uri:string;
    experiment_id: string;
    lifecycle_state: string;
    run_id: string;
    run_name: string;
    run_uuid: string;
    start_time: number;
    status: string;
    user_id: string;
};

export interface MLFlowSlurmRunInfo extends MLFlowRunInfo {
    SLURM_JOBID?: string;
    SLURM_JOB_CPUS_PER_NODE?: string;
    SLURM_JOB_GID?: string;
    SLURM_JOB_ID?: string;
    SLURM_JOB_NAME?: string;
    SLURM_JOB_NODELIST?: string
    SLURM_JOB_PARTITIONS?: string
    SLURM_JOB_QOS?: string
    SLURM_JOB_UID?: string
    SLURM_JOB_USER?: string
    mlflow_run_uri?: string;
};

interface Props {
  url: string;
  updateFn: (runs: MLFlowSlurmRunInfo[]) => void;
}


const MLFlowSlurmMapper = ({ url, updateFn }: Props) => {
  const controller = new AbortController();

  const getExperiments = (url: string) => {
    return client
      .get(url + "/api/2.0/mlflow/experiments/search?max_results=200", {
        signal: controller.signal,
      })
      .then((response: AxiosResponse) => {
        if (response.status == 200) {
          const array = response.data["experiments"];
          return array;
        } else {
          return [];
        }
      })
      .catch((reason) => {
        controller.abort();
        return [];
      });
  };

  const getRuns = (url: string, experiment_ids: string[] | undefined) => {
    if (experiment_ids === undefined) {
      return [];
    }
    return client
      .post(
        url + "/api/2.0/mlflow/runs/search",
        { experiment_ids: experiment_ids },
        {
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
        }
      )
      .then((response: AxiosResponse) => {
        if (response.status == 200) {
          const runs = response.data["runs"];
          if(runs)
          {
            const slurm_related_runs = runs.filter(run => run["data"]["params"].filter(param => param["key"] === 'SLURM_JOB_ID').length > 0);
            const mapping : MLFlowSlurmRunInfo[] = slurm_related_runs.map(run => {
                const slurm_job_info : MLFlowSlurmRunInfo = run["data"]["params"].reduce((acc, curr: Param) => {
                    const {key, value} = curr;
                    if(key.startsWith("SLURM_")) {
                        acc[key] = value;
                    }
                    return acc;
                },{...run["info"]});

                // Append the url to access the job
                return {...slurm_job_info, mlflow_run_uri: url + "#/experiments/"+ slurm_job_info['experiment_id'] + "/runs/" + slurm_job_info['run_uuid']};
            });
            updateFn(mapping);
            return mapping;
          }
        }
        return [];
      })
      .catch((reason) => {
        controller.abort();
        return [];
      });
  };

  const { data: experiment_ids } = useQuery({
    queryKey: ["experiments", url],
    queryFn: () => getExperiments(url),
    select: (experiments: Experiment[]) =>
      experiments.map((experiment) => experiment.experiment_id),
    refetchInterval: 15 * 1000,
  });

  useQuery({
    queryKey: ["runs", url],
    queryFn: () => getRuns(url, experiment_ids),
    refetchInterval: 15 * 1000,
    enabled: experiment_ids !== undefined && experiment_ids.length > 0
  });

  return <></>;
};

export default MLFlowSlurmMapper;
