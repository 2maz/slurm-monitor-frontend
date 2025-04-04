import NodesTable from "./NodesTable";
import useNodes from "../../hooks/useNodes";
import useNodesInfo from "../../hooks/useNodesInfos";
import Node from "./Node";

import { DotLoader } from 'react-spinners';
import CertificateError from "../ErrorReporting";


interface Props {
  maxHeightInViewportPercent?: number
}
const NodesView = ({maxHeightInViewportPercent} : Props) => {
  const { data : nodes, error : error_nodes, isLoading: nodes_isLoading } = useNodes();
  const { data : nodes_info, error : error_nodes_info, isLoading : nodes_info_isLoading} = useNodesInfo();

  if(!nodes || nodes_isLoading || nodes_info_isLoading)
    return (
      <div className="mx-5 flex flex-wrap justify-between">
        <h1 className="centered">Nodes</h1>
        <div className="d-flex justify-content-center align-self-center"><DotLoader/></div>
      </div>
    )

  if (error_nodes)
    return (
      <>
        <h1 className="mx-5 centered">Nodes</h1>
        {error_nodes && (
          <>
          <p className="text-danger">No data available: {error_nodes.message}</p>
          <CertificateError />
          </>
        )}
      </>
    );

  if(error_nodes_info)
    return (
      <>
        <h1 className="mx-5 centered">Nodes</h1>
        {error_nodes && (
          <>
          <p className="text-danger">No nodes info available: {error_nodes_info.message}</p>
          </>
        )}
      </>
    );

  const prepared_data = nodes.map((node: Node) => ({
    ...node,
    gpu_model: nodes_info?.[node.name]?.gpus?.[0].model,
    gpu_memory: nodes_info?.[node.name]?.gpus?.[0].memory_total,
    cpu_model: nodes_info?.[node.name]?.cpus.model,
    id: node.name
  }));

  return (
    <div className="mx-5 flex flex-wrap justify-between">
      <h1 className="centered">Nodes</h1>
      <NodesTable data={prepared_data} maxHeightInViewportPercent={maxHeightInViewportPercent}/>
    </div>
  );
};

export default NodesView;
