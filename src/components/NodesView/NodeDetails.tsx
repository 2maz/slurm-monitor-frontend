import { useState } from 'react'

import GPUStatusView from "../GPUStatusView";
import CPUStatusView from "../CPUStatusView/CPUStatusView";
import MemoryStatusView from "../CPUStatusView/MemoryStatusView";
import NodeTopology from "./NodeTopology";
import TimeWindowPicker from "../TimeWindowPicker";
import DisksStatsView from "../DisksStatsView/DisksStatsView";
import { DateTime } from 'luxon';
import { NodeDataInfo } from '../../hooks/useNodesInfos';


interface Props {
    nodename: string;
    data: NodeDataInfo[];
}

const NodeDetails = ({nodename, data }: Props) => {
    const [startTime, setStartTime] = useState(DateTime.now().toSeconds() - 3600);
    const [endTime, setEndTime] = useState(DateTime.now().toSeconds());

    return <>
          {
           data
            .filter((d) => d.node === nodename)
            .map((d) => {
              return (
                <div key={d.node + "-stats"} className="mx-3 my-3">
                  <h1>Node: {d.node}</h1>
                  <TimeWindowPicker
                    startTime={startTime} setStartTime={setStartTime}
                    endTime={endTime} setEndTime={setEndTime}
                  />
                 <div key={d.node + "-cpu"} className="mx-3 my-3">
                 <h2>CPU Status (accumulated)</h2>
                 <CPUStatusView nodename={d.node} start_time_in_s={startTime} end_time_in_s={endTime}/>
                 </div>
                 <div key={d.node + "-memory"} className="mx-3 my-3">
                 <h2>Memory Status</h2>
                 <MemoryStatusView nodename={d.node} start_time_in_s={startTime} end_time_in_s={endTime}/>
                 </div>
                 <div key={d.node + "-gpu"} className="mx-3 my-3">
                 <h2>GPU Status</h2>
                 <GPUStatusView nodename={d.node} start_time_in_s={startTime} end_time_in_s={endTime}/>
                 </div>
                 <div key={d.node + "-disks"} className="mx-3 my-3">
                 <h2>Disks Stats</h2>
                 <DisksStatsView nodename={d.node} start_time_in_s={startTime} end_time_in_s={endTime}/>
                 </div>

                 <h2 className="mx-2">SLURM Node Info</h2>
                 <pre className="mx-5">{JSON.stringify(d, null, 2)}</pre>
                 <h2 title="lstopo-based topology information">Topology</h2>
                 <NodeTopology nodename={d.node} output_format="svg"/>
              </div>
              );
            })}
    </> 
}

export default NodeDetails