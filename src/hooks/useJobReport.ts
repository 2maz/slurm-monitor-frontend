import { useQuery } from "@tanstack/react-query";
import useMonitorEndpoint from "./useMonitorEndpoint";
import { AxiosError } from 'axios';


export interface JobReport extends Response {
    cpu_util: { mean: number, stddev: number }
    cpu_avg: { mean: number, stddev: number }
    warnings: string[]
}

const useJobReport = (job_id: number, refresh_interval_in_s: number) => {
  const { endpoint } = useMonitorEndpoint("/jobs/" + job_id + "/report");


  const fetchJobReport = async () => {
    const { request } = await endpoint.get<JobReport>();

    return request
      .then(({data}) => {
        return data ? data : null
      })
  }

  return useQuery<JobReport | null, AxiosError>({
    queryKey: ["job_report", job_id],
    queryFn: fetchJobReport,
    refetchInterval: refresh_interval_in_s*1000,
  });
}

export default useJobReport;