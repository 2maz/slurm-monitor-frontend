import { useState } from "react";

import Job from "./Job";
import JobsTable from "./JobsTable";

import { StateSetters } from "../../services/StateSetters";
import useAppState from "../../AppState";
import useJobs, { endpoint } from "../../hooks/useJobs";
import { DotLoader } from "react-spinners";


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
  stateSetters: StateSetters;
}

const JobsView = ({ stateSetters } : Props) => {
  const [refreshInterval, setRefreshInterval] = useState(10000);
  const [refreshTime, setRefreshTime] = useState<Date>(new Date());

  const {data: jobs, error, isLoading } = useJobs(setRefreshTime, refreshInterval)
  const mlflowSlurmJobs = useAppState((state) => state.slurmRuns);

  if(error)
    return (
      <>
        <h1 className="mx-5 centered">Jobs</h1>
        {error && (
          <>
          <p className="text-danger">No data available: {error.message}</p>
          {endpoint.selfSignedErrorMessage()}
          </>
        )}
      </>
    );

  if(isLoading)
    return (<div className="mx-5 flex flex-wrap justify-between">
      <h1 className="centered">Jobs</h1>
      <div className="d-flex justify-content-center align-self-center"><DotLoader/></div>
    </div>
    )

  if(!jobs)
    return "No Jobs data available"

  const prepared_data = jobs.map((job : Job) => ({
    ...job,
    id: job.job_id,
    mlflow_ref: mlflowSlurmJobs.filter(r => Number(r.SLURM_JOB_ID) == job.job_id)[0]?.mlflow_run_uri
  }));

  return (
    <div className="mx-5 flex flex-wrap justify-between">
      <h1 className="centered">Jobs</h1>
      <div className="mr-3 d-flex">
        <label className="mx-3">Refresh Interval (in s):</label>
        <input
          className="mb-3"
          value={refreshInterval/1000}
          type="number"
          onChange={(e) => {
            setRefreshInterval(e.target.valueAsNumber*1000);
          }}
          min="5"
        />
        <label className="mx-3">
          Last refresh: {refreshTime.toUTCString()}
        </label>
      </div>
      <>
        <JobsTable data={prepared_data} stateSetters={stateSetters} />
      </>
    </div>
  );
};

export default JobsView;
