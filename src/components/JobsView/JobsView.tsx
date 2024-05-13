import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import Job from "./Job";
import JobsTable from "./JobsTable";

import SlurmMonitorEndpoint from "../../services/slurm-monitor/endpoint";
import Response from "../../services/slurm-monitor/response";

const endpoint = new SlurmMonitorEndpoint("/jobs");
interface JobsResponse extends Response {
  jobs: Job[];
}

interface MlflowRun {
  run_uuid: string;
  experiment_id: string;
  run_name: string;
  user_id: string;
  status: string;
  start_time: number;
  artifact_uri: string;
  lifecycle_stage: number;
  run_id: string;
  ref_url: string;
  slurm_job_id: number;
}

interface MlflowRunsResponse {
  runs: MlflowRun[];
}

interface Props {
  columnFilters: any
  setColumnFilters: any
}

const JobsView = ({columnFilters, setColumnFilters } : Props) => {
  const [error, setError] = useState<Error>();
  const [refreshInterval, setRefreshInterval] = useState(10000);
  const [refreshTime, setRefreshTime] = useState<Date>(new Date());

  const fetchJobs = () => {
    const { request, cancel } = endpoint.get();

    return request
      .then(({ data }) => {
        setRefreshTime(new Date());
        return data ? data.jobs : [];
      })
      .catch((error) => {
        setError(error);
        return [];
      });
  };

  // const fetchMlflowRuns = () =>
  //   axios
  //     .get<MlflowRunsResponse>('http://srl-login3.ex3.simula.no:12000/api/v1/monitor/slurm-runs/ai-biostrat')
  //     .then(({ data }) => {
  //       return data?.runs;
  //     })
  //     .catch((error) => {
  //       setError(error);
  //       return [];
  //     });

  const { data } = useQuery({
    queryKey: ["jobs"],
    queryFn: fetchJobs,
    initialData: [],
    refetchInterval: refreshInterval,
  });

  // const { data: mlflow_runs } = useQuery({
  //   queryKey: ["mlflow-runs"],
  //   queryFn: fetchMlflowRuns,
  //   initialData: [],
  //   refetchInterval: refreshInterval,
  // });

  if (data?.length == 0)
    return (
      <>
        <h1 className="centered">Jobs</h1>
        {error && (
          <p className="text-danger">No data available: {error.message}</p>
        )}
      </>
    );

  const prepared_data = data.map((job) => ({
    ...job,
    id: job.job_id,
    //   // mlflow_ref: mlflow_runs.filter(r => r.slurm_job_id == job.job_id)[0]?.ref_url
  }));

  return (
    <div className="mx-5 flex flex-wrap justify-between">
      <h1 className="centered">Jobs</h1>
      <div className="mr-3 d-flex">
        <label className="mx-3">Refresh Interval (in ms):</label>
        <input
          className="mb-3"
          value={refreshInterval}
          type="number"
          onChange={(e) => {
            setRefreshInterval(e.target.valueAsNumber);
          }}
        />
        <label className="mx-3">
          Last refresh: {refreshTime.toUTCString()}
        </label>
      </div>
      <>
        <JobsTable data={prepared_data} columnFilters={columnFilters} setColumnFilters={setColumnFilters} />
      </>
    </div>
  );
};

export default JobsView;
