import { useQuery } from "@tanstack/react-query";
import useMonitorEndpoint from "./useMonitorEndpoint";
import Job from "../components/JobsView/Job";

const useJobStatus = (job_id: number, refresh_interval_in_s: number = 60) => {
  const { endpoint } = useMonitorEndpoint("/jobs/" + job_id);

  const fetchStatus = async () => {
    const { request } = endpoint.get<Job>();

    return request
      .then(({ data }) => {
        return data ? data : {} as Job;
      })
  };

  return useQuery<Job, Error>({
    queryKey: ["job_status", job_id],
    queryFn: fetchStatus,
    refetchInterval: refresh_interval_in_s*1000, // default refresh every minute
  });
}

export default useJobStatus;