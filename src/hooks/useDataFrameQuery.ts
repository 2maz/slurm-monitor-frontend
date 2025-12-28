import { useQuery } from "@tanstack/react-query";
import useMonitorEndpoint from "./useMonitorEndpoint";

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

const useDataFrameQuery = (query_name: string) => {
  const { endpoint : endpoint_nodes } = useMonitorEndpoint("/queries/" + query_name);

  const fetchDataFrame = async () => {
    const { request } = await endpoint_nodes.get<DataFrameResponse>();

    return request
      .then(({ data }) => {
        return data ? data : [] as DataFrame;
      })
  };

  return useQuery<DataFrame, Error>({
    queryKey: ["queries", query_name],
    queryFn: fetchDataFrame,
    refetchInterval: 3600*1000, // refresh every hour
  });
}

export default useDataFrameQuery