import useNodesInfo from "../../hooks/useNodesInfos";
import useAppState from "../../AppState";
import GPUStatusView from "../GPUStatusView";
import TimeWindowPicker from "../TimeWindowPicker";
import { DateTime } from "luxon";
import { useState } from "react";

const ClusterView = () => {
  const appState = useAppState();
  const { data: nodes_info } = useNodesInfo();
  const [ startTime, setStartTime ] = useState(DateTime.now().toSeconds() - 3600);
  const [ endTime, setEndTime ] = useState(DateTime.now().toSeconds());

  const currentTime = new Date().toString();


  return (
    <div>
        <h1>Cluster</h1>
        <h3>Current cluster: {appState.currentBackendSpec().cluster_id}</h3>
        <h3>Known clusters:</h3>
        <ul>
        {Object.entries(appState.backendSpecs).map(([key, { url, cluster_id }]) => <li key={key}>{cluster_id}: {url}</li> )}
        </ul>

        <>
          <h2>GPU Status: {currentTime}</h2>
          <h3>Usage</h3>
          <p>
            The following nodes statistics are updated every minute. If
            you cannot see data in the graph the nodes is likely down. In
            this case check the 'nodes' view.
          </p>
          <p>
            In order to identify the GPUs which your current job is using,
            you can double click on the job (in 'jobs' view). The
            associated GPU charts will be displayed there. Alternatively,
            you can identify the GPU logical ids from the gres_detail
            property.
          </p>
          <TimeWindowPicker
              startTime={startTime} setStartTime={setStartTime}
              endTime={endTime} setEndTime={setEndTime} />

          {nodes_info && Object.entries(nodes_info).map(
              ([nodename, config]) =>
                config.cards && (
                  <>
                    <div key={nodename}>
                      <GPUStatusView nodename={nodename}
                        start_time_in_s={startTime}
                        end_time_in_s={endTime}
                      />
                    </div>
                  </>
                )
            )}
        </>
    </div>
  )
}

export default ClusterView