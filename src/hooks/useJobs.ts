import { useQuery } from "@tanstack/react-query";
import Job from "../components/JobsView/Job";
import useMonitorEndpoint from "./useMonitorEndpoint";


export interface JobsResponse extends Response {
  jobs: Job[];
}

const useJobs = (refresh_interval_in_s: number) => {
  const { endpoint } = useMonitorEndpoint("/jobs");


  const fetchJobs = async () => {
    const { request } = await endpoint.get<JobsResponse>();

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