import { useQuery } from "@tanstack/react-query";
import Partition from "../components/PartitionsView/Partition";
import useMonitorEndpoint from "./useMonitorEndpoint";

interface PartitionsResponse extends Response {
  partitions: Partition[];
}

const usePartitions = () => {
  const { endpoint } = useMonitorEndpoint("/partitions");

  const fetchPartitions = async () => {
    const { request } = endpoint.get<PartitionsResponse>();

    return request
      .then(({ data }) => {
        return data ? data.partitions : [] as Partition[];
      })
  };

  return useQuery<Partition[], Error>({
    queryKey: ["partitions"],
    queryFn: fetchPartitions,
    staleTime: 3600*24*1000, // 1d
  });

}

export default usePartitions;