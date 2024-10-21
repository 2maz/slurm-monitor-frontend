import { useQuery } from "@tanstack/react-query";
import SlurmMonitorEndpoint from "../services/slurm-monitor/endpoint";
import Partition from "../components/PartitionsView/Partition";

export const endpoint = new SlurmMonitorEndpoint("/partitions");

interface PartitionsResponse extends Response {
  partitions: Partition[];
}

const usePartitions = () => {
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
  });

}

export default usePartitions;