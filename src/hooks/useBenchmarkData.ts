
import { useQuery } from "@tanstack/react-query";
import useMonitorEndpoint from "./useMonitorEndpoint";

interface BenchmarkData {
    system: string;
    node: string;
    number_of_gpus: number;
    task_name: string;
    start_time: number;
    end_time: number;
    exit_code: string | number;
    precision: string;
    metric_name: string
    metric_value: number;
}

const useBenchmarkData = (name: string = "lambdal", refresh_interval_in_s: number = 24*60*60) => {
  const { endpoint } = useMonitorEndpoint("/benchmarks/" + name )

  const fetchBenchmarkData = async () => {
    const { request } = endpoint.get<BenchmarkData[]>();

    return request
      .then(({data}) => {
        return data ? data : [] as BenchmarkData[];
      })
  }

  return useQuery<BenchmarkData[], Error>({
    queryKey: ["benchmark", name],
    queryFn: fetchBenchmarkData,
    refetchInterval: refresh_interval_in_s*1000,
  });
}

export default useBenchmarkData;