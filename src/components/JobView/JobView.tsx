import { useState } from 'react'
import GPUStatusView from '../GPUStatusView'
import SlurmMonitorEndpoint from '../../services/slurm-monitor/endpoint';
import { useQuery } from '@tanstack/react-query';

import Job from '../JobsView/Job';

interface Props {
    job_id: number;
    job_data?: Job
    refresh_interval_in_s: number;
}

interface JobStatus {
    job_id: number;
    batch_host: string;
    gres_detail: number[];
    start_time: number;
    end_time: number;
}

interface JobStatusResponse extends Response{
  job_status: JobStatus
}

const JobView = ({ job_id, job_data, refresh_interval_in_s = 1000*60 } : Props) => {
  const [error, setError] = useState<Error>();

  const endpoint = new SlurmMonitorEndpoint("/job/" + job_id);

  const fetchStatus = async () => {
    const { request, cancel } = endpoint.get<JobStatusResponse>();

    return request
      .then(({ data }) => {
        return data ? data.job_status : undefined;
      })
      .catch((error) => {
        setError(error);
        cancel();
        return undefined;
      });
  };

  const { data: job_status } = useQuery({
    queryKey: ["job_status", job_id],
    queryFn: fetchStatus,
    initialData: undefined,
    refetchInterval: refresh_interval_in_s, // refresh every minute
  });

  if(!job_status)
    return <div key={job_id}><h2>GPU Usage</h2>Loading ...</div>


  if(job_status.gres_detail && job_status.gres_detail.length > 0)
  {
      return <div key={job_id} className="mx-3 my-3">
          <h2>GPU Usage</h2>
          {error && <div key={job_id}><h2>Error loading GPU status </h2>Loading ...</div>}
          {!error && <GPUStatusView
                              nodename={job_status.batch_host}
                              logical_ids={job_status.gres_detail}
                              start_time_in_s={job_status.start_time}
                              refresh_interval_in_s={refresh_interval_in_s}
          />}
          <h3>Job Details</h3>
          <pre>{job_data && JSON.stringify(job_data, null, 2)}</pre>
          </div>
  } else {
      return <div key={job_id} className="mx-3 my-3">
          <h2>GPU Usage</h2>
          <p>No GPUs used</p>
          <h3>Job Details</h3>
          <pre>{job_data && JSON.stringify(job_data, null, 2)}</pre>
      </div>
  }

}

export default JobView