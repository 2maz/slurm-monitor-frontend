import { useQuery } from "@tanstack/react-query";
import { buildParameters, QueryParameters } from "./useCPUStatus";
import useMonitorEndpoint from "./useMonitorEndpoint";

interface GPUStatus {
    failure_count: number;
    memory: number;
    memory_util: number;
    ce_util: number;
    temperature: number;
    power: number;
    power_limit: number;
    memory_clock: number;
    time: string,
}

interface LocalGPUStatusDataSeries {
  uuid: string
  local_index?: number
  data: GPUStatus[]
}

export interface GPUDataSeries {
  [node: string]: LocalGPUStatusDataSeries[]
}

interface GPUDataSeriesResponse extends Response {
    gpu_status: GPUDataSeries
}

interface GPUStatusQueryParameters extends QueryParameters {
    logical_ids?: number[];
}
const useGPUStatus = (
    query_parameters: GPUStatusQueryParameters,
    refresh_interval_in_s: number = 60
) => {
  const query = "/nodes/"+ query_parameters.nodename + "/gpu_status"
  
  let parameters = buildParameters(query_parameters)
  if(query_parameters.logical_ids != undefined) {
    parameters = { ...parameters, "local_indices": query_parameters.logical_ids.join(",") }
  }

  const { endpoint } = useMonitorEndpoint(query, parameters);

  const fetchStatus = async () => {
    const { request } = endpoint.get<GPUDataSeriesResponse>();

    return request
      .then<GPUDataSeries>(({ data }) => {
        return data ? data.gpu_status : {} as GPUDataSeries
      })
  };

  return useQuery<GPUDataSeries, Error>({
    queryKey: ["gpu_status", query_parameters],
    queryFn: fetchStatus,
    refetchInterval: refresh_interval_in_s*1000, // refresh every minute
  });
}

export default useGPUStatus;