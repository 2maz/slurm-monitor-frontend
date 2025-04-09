
import Partition from "./Partition";
import PartitionsTable from "./PartitionsTable";

import { DotLoader } from "react-spinners";
import usePartitions from "../../hooks/usePartitions";


interface Props {
  maxHeightInViewportPercent?: number
}

const PartitionsView = ({ maxHeightInViewportPercent }: Props) => {
  const { data: partitions, isLoading, error } = usePartitions()

  if(error) {
    return (
      <>
        <h1 className="mx-5 centered">Partitions</h1>
        <p className="text-danger">No data available: {error.message}</p>
      </>
    )
  }

  if(isLoading || !partitions)
    return (<div className="mx-5 flex flex-wrap justify-between">
      <h1 className="centered">Partitions</h1>
      <div className="d-flex justify-content-center align-self-center"><DotLoader/></div>
      </div>
    )

  const prepared_data = partitions.map((partition: Partition) => ({
    ...partition,
    total_nodes: partition.nodes.length,
    id: partition.name,
  }));

  return (
    <div className="mx-5 flex flex-wrap justify-between">
      <h1 className="centered">Partitions</h1>
      <>
        <PartitionsTable
          data={prepared_data}
          maxHeightInViewportPercent={maxHeightInViewportPercent}
        />
      </>
    </div>
  );
};

export default PartitionsView;
