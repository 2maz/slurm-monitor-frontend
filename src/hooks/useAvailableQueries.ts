import { useQuery } from "@tanstack/react-query";
import SlurmMonitorEndpoint from "../services/slurm-monitor/endpoint";

interface QueriesResponse extends Response {
    queries: string[]
}

const useAvailableQueries = () => {
  const endpoint_nodes = new SlurmMonitorEndpoint("/queries");

  const fetchQueries = async () => {
    const { request } = endpoint_nodes.get<QueriesResponse>();

    return request
      .then<string[]>(({ data }) => {
        return data ? data.queries : [] as string[]
      })
  };

  return useQuery<string[], Error>({
    queryKey: ["queries"],
    queryFn: fetchQueries,
    staleTime: 5*60*1000,
    //refetchInterval: 
  });
}

export default useAvailableQueries;