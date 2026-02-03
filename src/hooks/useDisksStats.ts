import { useQuery } from "@tanstack/react-query";
import useMonitorEndpoint from "./useMonitorEndpoint";
import { QueryParameters, buildParameters } from "./useMonitorEndpoint";
import { AxiosError } from "axios";

export interface DiskStats {
  reads_completed: number
  reads_merged: number
  sectors_read: number
  ms_spent_reading: number

  writes_completed: number
  writes_merged: number
  sectors_written: number
  ms_spent_writing: number

  ios_currently_in_progress: number
  ms_spent_doing_ios: number
  weighted_ms_spent_doing_ios: number

  discards_completed: number
  discards_merged: number
  sectors_discarded: number
  ms_spent_discarding: number

  flush_requests_completed: number
  ms_spent_flushing: number

  time: string
}

export interface DiskStatsTimeseries {
  name: string
  major: number
  minor: number

  field_names: string[]
  data: DiskStats[]
}

export interface NodesDisksStatus {
  [name: string]: DiskStatsTimeseries[]
}


const useDisksStats = (
  query_parameters: QueryParameters,
  refresh_interval_in_s: number = 120
) => {
  const { endpoint } = useMonitorEndpoint(
        "/nodes/" + query_parameters.nodename + "/diskstats/timeseries",
        buildParameters(query_parameters))

  const fetchStatus = async () => {
    const { request } = await endpoint.get<NodesDisksStatus>();

    return request.then<NodesDisksStatus>(({ data }) => {
      return data ? data : ({} as NodesDisksStatus);
    });
  };

  return useQuery<NodesDisksStatus, AxiosError>({
    queryKey: ["nodes", "diskstats/timeseries", query_parameters],
    queryFn: fetchStatus,
    refetchInterval: refresh_interval_in_s * 1000,
  });
};

export default useDisksStats;
