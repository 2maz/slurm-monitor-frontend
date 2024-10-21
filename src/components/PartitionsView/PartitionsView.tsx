
import Partition from "./Partition";
import PartitionsTable from "./PartitionsTable";

import { StateSetters } from "../../services/StateSetters";
import usePartitions, { endpoint } from "../../hooks/usePartitions";
import { DotLoader } from "react-spinners";


interface Props {
  stateSetters: StateSetters;
}

const PartitionsView = ({ stateSetters }: Props) => {
  const { data : partitions, error, isLoading } =  usePartitions()

  if(error)
    return (
      <>
        <h1 className="mx-5 centered">Partitions</h1>
        {error && (<>
          <p className="text-danger">No data available: {error.message}</p>
          {endpoint.selfSignedErrorMessage()}
          </>
        )}
      </>
    );

  if(isLoading)
    return (<div className="mx-5 flex flex-wrap justify-between">
      <h1 className="centered">Partitions</h1>
      <div className="d-flex justify-content-center align-self-center"><DotLoader/></div>
      </div>
    )

  if(!partitions)
    return "No Partition data available"

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
        />
      </>
    </div>
  );
};

export default PartitionsView;
