import { useQuery } from "@tanstack/react-query";
import useMonitorEndpoint from "./useMonitorEndpoint";

interface ProcessStatus {
    pid: number;
    job_id: number;
    node: string;
    cpu_percent: number;
    memory_percent: number;
    time: string;

}
interface ProcessTimeseries {
    [process_id: number]: ProcessStatus[];
}

interface ProcessesStats {
    pids: number[];
    active_pids: number[];
    accumulated: ProcessStatus[];
    timeseries: ProcessTimeseries;
    time: string;
}

interface NodesProcessesStats {
  [nodename: string]: ProcessesStats
}

interface ProcessTimeseriesResponse extends Response {
  nodes: NodesProcessesStats
}

interface QueryParameters {
  job_id: number;
  start_time_in_s?: number | null;
  end_time_in_s?: number | null;
  resolution_in_s?: number | null;
}

const useNodesProcessesStats = (query_parameters: QueryParameters, refresh_interval_in_s: number) => {
    const query = "/jobs/"+ query_parameters.job_id + "/system_status";

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
        const { request } = await endpoint.get<ProcessTimeseriesResponse>();

        return request
            .then<NodesProcessesStats>(({ data }) => {
                return data ? data.nodes : {} as NodesProcessesStats;
            })
    };

    return useQuery<NodesProcessesStats, Error>({
        queryKey: ["nodes_processes", query_parameters],
        queryFn: fetchStatus,
        refetchInterval: refresh_interval_in_s*1000, // refresh every minute
    });

}

export default useNodesProcessesStats;