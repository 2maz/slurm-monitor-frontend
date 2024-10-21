import { useQuery } from "@tanstack/react-query";
import SlurmMonitorEndpoint from "../services/slurm-monitor/endpoint";

export interface JobStatus {
    job_id: number;
    batch_host: string;
    gres_detail: number[];
    start_time: number;
    end_time: number;
    job_state: string;

    cpus: number;
}

interface JobStatusResponse extends Response{
  job_status: JobStatus
}
  
const useJobStatus = (job_id: number, refresh_interval_in_s: number = 60) => {

  const endpoint = new SlurmMonitorEndpoint("/job/" + job_id);

  const fetchStatus = async () => {
    const { request } = endpoint.get<JobStatusResponse>();

    return request
      .then(({ data }) => {
        return data ? data.job_status : {} as JobStatus;
      })
  };

  return useQuery<JobStatus, Error>({
    queryKey: ["job_status", job_id],
    queryFn: fetchStatus,
    refetchInterval: refresh_interval_in_s, // default refresh every minute
  });
}

export default useJobStatus;