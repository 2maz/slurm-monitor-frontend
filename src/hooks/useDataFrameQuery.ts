import { useQuery } from "@tanstack/react-query";
import useMonitorEndpoint from "./useMonitorEndpoint";
import useAppState from "../AppState";

//interface UserJobStat {
//    user_id: number;
//    share_of_successful_jobs: number;
//    number_of_jobs: number;
//    avg_time: Date;
//    min_time: Date;
//    max_time: Date;
//    avg_cpus: number;
//    avg_node_count: number;
//    avg_tasks: number;
//}

export interface Row {
    [column_name: string]: number | string
}

export type DataFrame = Array<Row>

interface DataFrameResponse extends DataFrame, Response {
}

const useDataFrameQuery = (
  query_name: string,
  params?: Record<string, string>,
  enabled: boolean = true,
) => {
  const { endpoint : endpoint_nodes } = useMonitorEndpoint("/queries/" + query_name, params);
  const { cluster_id } = useAppState().currentBackendSpec();

  const fetchDataFrame = async () => {
    const { request } = await endpoint_nodes.get<DataFrameResponse>();

    return request
      .then(({ data }) => {
        return data ? data : [] as DataFrame;
      })
  };

  return useQuery<DataFrame, Error>({
    queryKey: ["queries", cluster_id, query_name, params],
    queryFn: fetchDataFrame,
    refetchInterval: 3600*1000, // refresh every hour
    retry: false, // queries can be slow, so show failures rather than retrying them
    enabled,
  });
}

export default useDataFrameQuery