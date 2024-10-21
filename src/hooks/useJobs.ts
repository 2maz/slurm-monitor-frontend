import { useQuery } from "@tanstack/react-query";
import SlurmMonitorEndpoint from "../services/slurm-monitor/endpoint";
import Job from "../components/JobsView/Job";


interface JobsResponse extends Response {
  jobs: Job[];
}

export const endpoint = new SlurmMonitorEndpoint("/jobs");

const useJobs = (refresh_interval_in_s: number) => {

  const fetchJobs = async () => {
    const { request } = endpoint.get<JobsResponse>();

    return request
      .then(({data}) => {
        return data ? data.jobs : [] as Job[];
      })
  }

  return useQuery<Job[], Error>({
    queryKey: ["jobs"],
    queryFn: fetchJobs,
    refetchInterval: refresh_interval_in_s*1000,
  });
}

export default useJobs;