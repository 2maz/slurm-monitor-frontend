import { useQuery } from "@tanstack/react-query";
import SlurmMonitorEndpoint from "../services/slurm-monitor/endpoint";
import Job from "../components/JobsView/Job";


export interface JobsResponse extends Response {
  jobs: Job[];
}

export interface Constraints {
  job_id?: number,
  user_id?: number
  user?: string
  start_before_in_s?: number
  start_after_in_s?: number
  submit_before_in_s?: number
  submit_after_in_s?: number
  end_before_in_s?: number
  end_after_in_s?: number
  min_duration?: number
  max_duration?: number
  limit?: number
}

const useCompletedJobs = (constraints: Constraints,
   limit: number = 1000,
   refresh_interval_in_s: number = 5*60) => {

  const parameters = {...constraints, limit: limit }
  const endpoint = new SlurmMonitorEndpoint("/jobs/query", parameters);

  const fetchJobs = async () => {
    const { request } = endpoint.get<JobsResponse>();

    return request
      .then(({data}) => {
        return data ? data.jobs : [] as Job[];
      })
  }

  return useQuery<Job[], Error>({
    queryKey: ["completed_jobs", constraints],
    queryFn: fetchJobs,
    refetchInterval: refresh_interval_in_s*1000,
  });
}

export default useCompletedJobs;