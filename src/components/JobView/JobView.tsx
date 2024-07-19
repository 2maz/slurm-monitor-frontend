import { useState } from 'react'
import GPUStatusView from '../GPUStatusView'
import SlurmMonitorEndpoint from '../../services/slurm-monitor/endpoint';
import { useQuery } from '@tanstack/react-query';

interface Props {
    job_id: number;
}

interface JobStatus {
    job_id: number;
    gres_detail: number[];
    start_time: number;
    end_time: number;
}

const JobView = ({ job_id } : Props) => {
  const [error, setError] = useState<Error>();

  const endpoint = new SlurmMonitorEndpoint("/job/" + job_id);

  const fetchStatus = async () => {
    const { request, cancel } = endpoint.get();

    return request
      .then(({ data }) => {
        return data ? data.job_status : [];
      })
      .catch((error) => {
        setError(error);
        cancel();
        return [];
      });
  };

  const { data: job_status } = useQuery<JobStatus>({
    queryKey: ["job_status", job_id],
    queryFn: fetchStatus,
    initialData: undefined,
    refetchInterval: 1000*60, // refresh every minute
  });
  if(!job_status)
    return <><h2>GPU Usage</h2>Loading ...</>

  if(job_status.gres_detail.length > 0)
  {
      return <>
          <h2>GPU Usage</h2>
          <GPUStatusView
                              nodename="g001" 
                              logical_ids={job_status.gres_detail}
                              start_time_in_s={job_status.start_time}
                              end_time_in_s={job_status.end_time}
                              
          />
          </>
  } else {
      return <>
          <h2>GPU Usage</h2>
          <p>No GPUs used</p>
      </>
  }

}

export default JobView