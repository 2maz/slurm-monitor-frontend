import useNodesInfo from "../../hooks/useNodesInfos";
import useAppState from "../../AppState";
import GPUStatusView from "../GPUStatusView";
import TimeWindowPicker from "../TimeWindowPicker";
import { DateTime } from "luxon";
import { useState } from "react";
import { createListCollection, SelectContent, SelectItem, SelectRoot, SelectTrigger, SelectValueText } from "@chakra-ui/react";
import { Tooltip } from "../ui/tooltip";

const ClusterView = () => {
  const appState = useAppState();
  const { data: nodes_info } = useNodesInfo();
  const [ startTime, setStartTime ] = useState(DateTime.now().toSeconds() - 3600);
  const [ endTime, setEndTime ] = useState(DateTime.now().toSeconds());

  const currentTime = new Date().toString();

  const availableClusters: { label: string; value: string }[] = [];
  Object.entries(appState.backendSpecs).map(([key, { cluster_id }]) => availableClusters.push({ label: cluster_id, value: key }))
  const collection = createListCollection({ items: availableClusters })

  console.log(collection)

  return (
    <div>
        <h1>Cluster</h1>
        <div className="mx-3 my-5">
              <h3>Selected cluster: {appState.currentBackendSpec().cluster_id}</h3>
              <SelectRoot
                collection={collection}
                size="sm"
                width="320px"
                onValueChange={(event) => {
                  console.log(event.value);
                  appState.selectBackend(event.value[0]);
                  console.log(appState.currentBackendSpec().cluster_id)
                }}
              >

                <Tooltip content="Select the cluster to the connect to" />
                <SelectTrigger>
                  <SelectValueText placeholder="Select cluster" />
                </SelectTrigger>
                <SelectContent>
                  {collection.items.map((query) => (
                    <SelectItem item={query} key={query.value}>
                      {query.value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </SelectRoot>
        </div>

        <div className="mx-3">
          <h2>GPU Status: {currentTime}</h2>
          <h3>Usage</h3>
          <p>
            The following nodes statistics are updated approximately every minute. If
            you cannot see data in the graph the nodes is likely down. In
            this case check the 'nodes' view.
          </p>
          <p>
            In order to identify the GPUs which your current job is using,
            you can double click on the job (in 'jobs' view). The
            associated GPU charts will be displayed there.
            If you hover of the GPU name it will show the uuid as tooltip.
            Alternatively, you can identify the GPU uuid from the raw job details: 'used_gpu_uuids'.
          </p>
          <TimeWindowPicker
              startTime={startTime} setStartTime={setStartTime}
              endTime={endTime} setEndTime={setEndTime} />

          {nodes_info && Object.entries(nodes_info).sort((a, b) => a[0].localeCompare(b[0])).map(
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
        </div>
    </div>
  )
}

export default ClusterView