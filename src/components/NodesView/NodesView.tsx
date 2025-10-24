import NodesTable from "./NodesTable";
import useNodesInfo from "../../hooks/useNodesInfos";
import useNodesLastSeen from "../../hooks/useNodesLastSeen";
import { DotLoader } from 'react-spinners';

interface Props {
  maxHeightInViewportPercent?: number
  time?: Date
}
const NodesView = ({maxHeightInViewportPercent, time} : Props) => {
  const { data : nodes_info, error : error_nodes_info, isLoading : nodes_info_isLoading} = useNodesInfo(time);
  const { data : nodes_last_seen, error : error_nodes_last_seen, isLoading : nodes_last_seen_isLoading} = useNodesLastSeen(time);


  if(!nodes_info || nodes_info_isLoading)
    return (
      <div className="mx-5 flex flex-wrap justify-between">
        <h1 className="centered">Nodes</h1>
        <div className="d-flex justify-content-center align-self-center"><DotLoader/></div>
      </div>
    )

  if(!nodes_last_seen || nodes_last_seen_isLoading)
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

  if(error_nodes_last_seen) {
    return (
      <>
        <h1 className="mx-5 centered">Nodes</h1>
        {error_nodes_info && (
          <>
          <p className="text-danger">No nodes' last probe timestamps available: {error_nodes_last_seen.message}</p>
          </>
        )}
      </>
    );
  }

  const prepared_data = Object.keys(nodes_info).map((key: string) => {
    const value = nodes_info[key];

    return { ...value,
      time: nodes_last_seen[key] ? nodes_last_seen[key] : value.time,
      cores: value.cores_per_socket*value.sockets*value.threads_per_core,
      idle_cores: value.cores_per_socket*value.sockets*value.threads_per_core - value.alloc_tres.cpu,
      architecture: value.architecture,
      gpu_count: value.cards ? value.cards.length : 0,
      gpu_memory: value.cards?.[0]?.memory,
      gpu_model: value.cards?.[0]?.model,
      id: value.node,
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
