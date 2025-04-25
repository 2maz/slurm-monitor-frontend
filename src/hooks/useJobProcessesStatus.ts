
import { useQuery } from "@tanstack/react-query";
import useMonitorEndpoint from "./useMonitorEndpoint";

import { MemoryStatus } from "./useNodesMemoryStatus";
import { CPUStatus } from "./useCPUStatus";
import { AxiosError } from "axios";

interface GPUProcessStatus {
    gpu_util: number;
    gpu_memory: number;
    gpu_memory_util: number;

    pids: number[];
    time: number;
}

interface CPUMemoryStatus extends MemoryStatus, CPUStatus
{
    pids: number[]
}

interface NodesStatus {
    gpus: { [uuid: string]: GPUProcessStatus[] };
    cpu_memory: CPUMemoryStatus[];

}

interface JobProcessStatus {
    job: number;
    epoch: number;
    nodes: {[id: string] : NodesStatus }
}


interface QueryParameters {
  job_id: number;
  start_time_in_s?: number | null;
  end_time_in_s?: number | null;
  resolution_in_s?: number | null;
}

const useJobProcessesStatus = (query_parameters: QueryParameters, refresh_interval_in_s: number) => {
    const query = "/jobs/"+ query_parameters.job_id + "/process/timeseries";

    let parameters = {}
    if(query_parameters.start_time_in_s != undefined) {
        parameters = { ...parameters, "start_time_in_s": query_parameters.start_time_in_s}
    }
    if(query_parameters.end_time_in_s != undefined) {
        parameters = { ...parameters, "end_time_in_s": query_parameters.end_time_in_s }
    }
    if(query_parameters.resolution_in_s != undefined) {
        parameters = { ...parameters, "resolution_in_s": query_parameters.resolution_in_s }
    }

    const { endpoint } = useMonitorEndpoint(query, parameters);

    const fetchStatus = async () => {
        const { request } = endpoint.get<JobProcessStatus[]>();

        return request
            .then<JobProcessStatus[]>(({ data }) => {
                return data ? data : {} as JobProcessStatus[];
            })
    };

    return useQuery<JobProcessStatus[], AxiosError>({
        queryKey: ["jobs","process/timeseries", query_parameters],
        queryFn: fetchStatus,
        refetchInterval: refresh_interval_in_s*1000, // refresh every minute
    });

}

export default useJobProcessesStatus;