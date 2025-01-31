import { BarLoader } from "react-spinners";
import useNodesTopology, { useNodesTopologyURL } from "../../hooks/useNodesTopology";

interface Props {
    nodename: string;
    output_format?: string;
}

const NodeTopologyPNG = ({nodename} : Props) => {
  const topologyUrl = useNodesTopologyURL(nodename, "png")
  return (
    <img src={topologyUrl} alt="Topology Image {nodename}" />
  )
}

const NodeTopologySVG = ({nodename} : Props) => {
  const { data, isError, isLoading } = useNodesTopology(nodename, "svg") ;

  if(isError) {
    return "Error retrieving topology"
  }

  if(isLoading || !data) {
    return <BarLoader />
  }

  return (
    <div
      dangerouslySetInnerHTML={{__html: data}}
      style={{ all: 'unset', fontFamily: 'Monospace', fontSize: '10px'}}
    />
  )
}

const NodeTopology = ({nodename, output_format} : Props) => {
  if(output_format == "png") {
    return <NodeTopologyPNG nodename={nodename} />
  } else if(output_format == 'svg') {
    return <NodeTopologySVG nodename={nodename} />
  } else {
    return <>Unsupported topology format {output_format}</>
  }
}

export default NodeTopology