import { useQuery } from "@tanstack/react-query";
import Partition from "../components/PartitionsView/Partition";
import useMonitorEndpoint from "./useMonitorEndpoint";

const usePartitions = () => {
  const { endpoint } = useMonitorEndpoint("/partitions");

  const fetchPartitions = async () => {
    const { request } = endpoint.get<Partition[]>();

    return request
      .then(({ data }) => {
        return data ? data : [] as Partition[];
      })
  };

  return useQuery<Partition[], Error>({
    queryKey: ["partitions"],
    queryFn: fetchPartitions,
    staleTime: 3600*24*1000, // 1d
  });

}

export default usePartitions;