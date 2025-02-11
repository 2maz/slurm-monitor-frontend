
import Partition from "./Partition";
import PartitionsTable from "./PartitionsTable";

import { StateSetters } from "../../services/StateSetters";
import { DotLoader } from "react-spinners";
import CertificateError from "../ErrorReporting";
import usePartitionsQueue from "../../hooks/usePartitionsQueue";


interface Props {
  stateSetters: StateSetters;
  maxHeightInViewportPercent?: number
}

const PartitionsView = ({ stateSetters, maxHeightInViewportPercent }: Props) => {
  const { partitions, isLoading, error } = usePartitionsQueue()

  if(error.jobs) {
    return (
      <>
        <h1 className="mx-5 centered">Partitions</h1>
          <p className="text-danger">No data available: {error.jobs.message}</p>
          {<CertificateError />}
      </>
    );
  }

  if(error.partitions) {
    return (
      <>
        <h1 className="mx-5 centered">Partitions</h1>
        <p className="text-danger">No data available: {error.partitions?.message}</p>
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
    id: partition.name,
  }));

  return (
    <div className="mx-5 flex flex-wrap justify-between">
      <h1 className="centered">Partitions</h1>
      <>
        <PartitionsTable
          data={prepared_data}
          stateSetters={stateSetters}
          maxHeightInViewportPercent={maxHeightInViewportPercent}
        />
      </>
    </div>
  );
};

export default PartitionsView;
