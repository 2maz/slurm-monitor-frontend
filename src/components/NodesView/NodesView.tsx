import NodesTable from "./NodesTable";
import useNodesInfo from "../../hooks/useNodesInfos";

import { DotLoader } from 'react-spinners';
import CertificateError from "../ErrorReporting";


interface Props {
  maxHeightInViewportPercent?: number
}
const NodesView = ({maxHeightInViewportPercent} : Props) => {
  const { data : nodes_info, error : error_nodes_info, isLoading : nodes_info_isLoading} = useNodesInfo();

  if(!nodes_info || nodes_info_isLoading)
    return (
      <div className="mx-5 flex flex-wrap justify-between">
        <h1 className="centered">Nodes</h1>
        <div className="d-flex justify-content-center align-self-center"><DotLoader/></div>
      </div>
    )

  if(error_nodes_info)
    return (
      <>
        <h1 className="mx-5 centered">Nodes</h1>
        {error_nodes_info && (
          <>
          <p className="text-danger">No nodes info available: {error_nodes_info.message}</p>
          </>
        )}
      </>
    );

  const prepared_data = Object.keys(nodes_info).map((key) => {
    const value = nodes_info[key];
    return { ...value,
      cores: value.cores_per_socket*value.sockets,
      architecture: "fixme",

      gpus: value.cards? value.cards.length : 0,
      gpu_memory: value.cards?.[0].memory,
      gpu_model: value.cards?.[0].model,

      partitions: [],
      id: value.node
    }
  });

  return (
    <div className="mx-5 flex flex-wrap justify-between">
      <h1 className="centered">Nodes</h1>
      <NodesTable data={prepared_data} maxHeightInViewportPercent={maxHeightInViewportPercent}/>
    </div>
  );
};

export default NodesView;
