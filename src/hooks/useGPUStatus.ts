import { useQuery } from "@tanstack/react-query";
import SlurmMonitorEndpoint from "../services/slurm-monitor/endpoint";
import { buildParameters, QueryParameters } from "./useCPUStatus";

interface GPUStatus {
    name: string;
    uuid: string;
    local_id: number;
    node: string;
    temperature_gpu: number;
    power_draw: number;
    utilization_gpu: number;
    utilization_memory: number;
    memory_total: number;

    // datetime string needs to be formatted
    timestamp: string,
};

export interface GPUDataSeries {
    label: string;
    data: GPUStatus[];
}

interface GPUDataSeriesResponse extends Response {
  gpu_status: GPUDataSeries[];
}

const dummy_data : GPUDataSeries[] = [
    {
        label: "g001-gpu-0",
        data: [
            {   name: "Tesla A100", 
                uuid: "abc",
                local_id: 0,
                node: "g001",
                temperature_gpu: 10,
                power_draw: 40,
                utilization_gpu: 75,
                utilization_memory: 25,
                memory_total: 10000000,
                timestamp: "2024-07-10 02:39:56.910603"
            },
            {   name: "Tesla A100", 
                uuid: "abc",
                local_id: 0,
                node: "g001",
                temperature_gpu: 90,
                power_draw: 120,
                utilization_gpu: 100,
                utilization_memory: 50,
                memory_total: 10000000,
                timestamp: "2024-07-10 04:39:56.910603"
            }
        ]
    },
    {
        label: "n010-gpu-0",
        data: [
            {   name: "Tesla Volta", 
                uuid: "abcd",
                local_id: 0,
                node: "n010",
                temperature_gpu: 10,
                power_draw: 20,
                utilization_gpu: 35,
                utilization_memory: 15,
                memory_total: 100000,
                timestamp: "2024-07-10 01:39:56.910603"
            },
            {   name: "Tesla Volta", 
                uuid: "abcd",
                local_id: 0,
                node: "n010",
                temperature_gpu: 30,
                power_draw: 80,
                utilization_gpu: 30,
                utilization_memory: 25,
                memory_total: 10000000,
                timestamp: "2024-07-10 03:39:56.910603"
            }
        ]
    }
];
 

interface GPUStatusQueryParameters extends QueryParameters {
    logical_ids?: number[];
}
const useGPUStatus = (
    query_parameters: GPUStatusQueryParameters,
    refresh_interval_in_s: number = 60
) => {

  var query = "/nodes/"+ query_parameters.nodename + "/gpu_status"
  
  let parameters = buildParameters(query_parameters)
  if(query_parameters.logical_ids != undefined) {
    parameters = { ...parameters, "local_indices": query_parameters.logical_ids.join(",") }
  }

  const endpoint = new SlurmMonitorEndpoint(query, parameters);

  const fetchStatus = async () => {
    const { request } = endpoint.get<GPUDataSeriesResponse>();

    return request
      .then<GPUDataSeries[]>(({ data }) => {
        return data ? data.gpu_status : [] as GPUDataSeries[];
      })
  };

  return useQuery<GPUDataSeries[]>({
    queryKey: ["gpu_status", query_parameters],
    queryFn: fetchStatus,
    refetchInterval: refresh_interval_in_s*1000, // refresh every minute
  });
}

export default useGPUStatus;