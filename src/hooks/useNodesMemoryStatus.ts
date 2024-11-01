import { useState } from "react";
import { buildParameters, QueryParameters } from "./useCPUStatus";
import SlurmMonitorEndpoint from "../services/slurm-monitor/endpoint";
import { useQuery } from "@tanstack/react-query";

interface MemoryStatus {
    percent: number;
    timestamp: string;
}

interface MemoryDataSeries {
    label: string;
    data: MemoryStatus[];
}


interface NodesMemoryStatus {
  [nodename: string]: MemoryDataSeries;
}

interface NodesMemoryStatusTimeseriesResponse extends Response {
  memory_status: NodesMemoryStatus
}

const useNodesMemoryStatus = (
    query_parameters: QueryParameters,
    refresh_interval_in_s: number = 60
) => {

  var query = "/nodes/"+ query_parameters.nodename + "/memory_status";
  const endpoint = new SlurmMonitorEndpoint(query, buildParameters(query_parameters));

  const fetchStatus = async () => {
    const { request } = endpoint.get<NodesMemoryStatusTimeseriesResponse>();

    return request
      .then<NodesMemoryStatus>(({ data }) => {
        return data ? data.memory_status : {} as NodesMemoryStatus;
      })
  };

  return useQuery<NodesMemoryStatus>({
    queryKey: ["nodes", "memory_status", query_parameters],
    queryFn: fetchStatus,
    refetchInterval: refresh_interval_in_s, // refresh every minute
  });
}

export default useNodesMemoryStatus;