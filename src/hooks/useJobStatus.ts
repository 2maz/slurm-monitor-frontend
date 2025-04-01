import { useQuery } from "@tanstack/react-query";
import useMonitorEndpoint from "./useMonitorEndpoint";
import Job from "../components/JobsView/Job";

interface JobStatusResponse extends Response{
  job_status: Job
}
  
const useJobStatus = (job_id: number, refresh_interval_in_s: number = 60) => {
  const { endpoint } = useMonitorEndpoint("/job/" + job_id);

  const fetchStatus = async () => {
    const { request } = endpoint.get<JobStatusResponse>();

    return request
      .then(({ data }) => {
        return data ? data.job_status : {} as Job;
      })
  };

  return useQuery<Job, Error>({
    queryKey: ["job_status", job_id],
    queryFn: fetchStatus,
    refetchInterval: refresh_interval_in_s*1000, // default refresh every minute
  });
}

export default useJobStatus;