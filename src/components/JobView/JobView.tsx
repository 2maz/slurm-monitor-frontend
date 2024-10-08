import { useState } from 'react'
import GPUStatusView from '../GPUStatusView'
import SlurmMonitorEndpoint from '../../services/slurm-monitor/endpoint';
import { useQuery } from '@tanstack/react-query';

import Job from '../JobsView/Job';
import CPUJobStatusView from '../CPUStatusView';
import moment from 'moment';
import { BarLoader } from 'react-spinners';

interface Props {
    job_id: number;
    job_data?: Job
    refresh_interval_in_s?: number;
}

interface JobStatus {
    job_id: number;
    batch_host: string;
    gres_detail: number[];
    start_time: number;
    end_time: number;
    job_state: string;
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

  if(job_status == undefined)
    return <>
           <h3>Job Id: {job_id}</h3>
           <BarLoader />
           </>

  if(job_status.job_state === "PENDING")
    return <>
          <h3>Job Details</h3>
          <pre>{job_data && JSON.stringify(job_data, null, 2)}</pre>
          </>

  var elements = []
  if(job_status.gres_detail && job_status.gres_detail.length > 0)
  {
      elements.push(
          <>
          <h3>GPU Usage</h3>
          {error && <div key={job_id}><h4>Error loading GPU status </h4>Loading ...</div>}
          {!error 
            && <GPUStatusView
                nodename={job_status.batch_host}
                logical_ids={job_status.gres_detail}
                start_time_in_s={moment(job_status.start_time).unix()}
                refresh_interval_in_s={refresh_interval_in_s}
          />}
          </>
      )
  } else {
          elements.push(<>
            <h3>GPU Usage</h3>
            <p>No GPUs used</p>
            </>
          )
  }

  elements.push(<>
          <h3>CPU Usage</h3>
          <CPUJobStatusView job_id={job_id}
                         start_time_in_s={moment(job_status.start_time).unix()}
                         refresh_interval_in_s={refresh_interval_in_s}
          />
          </>
      )
  elements.push(
    <>
      <h3>Job Details</h3>
      <pre>{job_data && JSON.stringify(job_data, null, 2)}</pre>
    </>
  )
  return <div key="{{job_id}}" className="mx-3 my-3"><h2>Job Id: {job_id}</h2>{elements}</div>

}

export default JobView