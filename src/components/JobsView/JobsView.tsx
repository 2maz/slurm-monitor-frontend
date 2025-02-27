import { useState } from "react";

import Job from "./Job";
import JobsTable from "./JobsTable";

import useAppState from "../../AppState";
import useJobs from "../../hooks/useJobs";
import { DotLoader } from "react-spinners";
import CertificateError from "../ErrorReporting";


interface Props {
  maxHeightInViewportPercent?: number
}

const JobsView = ({ maxHeightInViewportPercent } : Props) => {
  const [refreshInterval, setRefreshInterval] = useState(10000);

  const {data: jobs, error, isLoading, dataUpdatedAt } = useJobs(refreshInterval/1000.0)
  const mlflowSlurmJobs = useAppState((state) => state.slurmRuns);

  if(error)
    return (
      <div id="jobs-view-error">
        <h1 className="mx-5 centered">Jobs</h1>
        {error && (
          <>
          <p className="text-danger">No data available: {error.message}</p>
          <CertificateError />
          </>
        )}
      </div>
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
        <label className="mx-2">
          Last refresh: {new Date(dataUpdatedAt).toLocaleString()}
        </label>
        <label className="mx-5">
          Timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}
        </label>
      </div>
      <>
        <JobsTable data={prepared_data} maxHeightInViewportPercent={maxHeightInViewportPercent}/>
      </>
    </div>
  );
};

export default JobsView;
