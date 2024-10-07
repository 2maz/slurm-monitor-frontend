
import { useState } from "react";
import SlurmMonitorEndpoint from "../../services/slurm-monitor/endpoint";
import { LineChart, Line, Tooltip, XAxis, YAxis, Legend, CartesianGrid } from 'recharts';
import moment from "moment";
import { useQuery } from "@tanstack/react-query";

interface MemoryStatus {
    percent: number;
    timestamp: string;
}

interface MemoryDataSeries {
    label: string;
    data: MemoryStatus[];
}


interface NodesMemoryStatus {
  [nodename: string]: MemoryDataSeries;
}

interface NodesMemoryStatusTimeseriesResponse extends Response {
  memory_status: NodesMemoryStatus
}

interface Props {
  nodename: string;
  start_time_in_s?: number | null;
  end_time_in_s?: number | null;
  resolution_in_s?: number | null;
  refresh_interval_in_s?: number;
}

const CPUStatusView = ({nodename, start_time_in_s, end_time_in_s, resolution_in_s, refresh_interval_in_s = 1000*60} : Props) => {
  const [error, setError] = useState<Error>();

  var query = "/nodes/"+ nodename + "/memory_status";

  var parameters = {}
  if(start_time_in_s != undefined) {
    parameters = { ...parameters, "start_time_in_s": start_time_in_s}
  }
  if(end_time_in_s != undefined) {
    parameters = { ...parameters, "end_time_in_s": end_time_in_s }
  }
  if(resolution_in_s != undefined) {
    parameters = { ...parameters, "resolution_in_s": resolution_in_s }
  }

  const endpoint = new SlurmMonitorEndpoint(query, parameters);

  var initial_data : NodesMemoryStatus = {}

  const fetchStatus = async () => {
    const { request, cancel } = endpoint.get<NodesMemoryStatusTimeseriesResponse>();

    return request
      .then<NodesMemoryStatus>(({ data }) => {
        return data ? data.memory_status : initial_data
      })
      .catch((error) => {
        setError(error);
        cancel();
        return initial_data
      })
  };


  const { data: nodes_processes } = useQuery<NodesMemoryStatus>({
    queryKey: ["nodes", "memory_status", nodename, start_time_in_s, end_time_in_s, resolution_in_s],
    queryFn: fetchStatus,
    initialData: initial_data,
    refetchInterval: refresh_interval_in_s, // refresh every minute
  });

  var elements = []
  if(nodes_processes) {
    Object.keys(nodes_processes).map((process_id: string) => (
      elements.push(
            <><h4>Node: {nodename}</h4>
            <div className="mx-5" key="{job_id}-accumulated" >
              <LineChart width={300} height={250} data={nodes_processes[process_id].data}>
                <Line yAxisId="1" type="monotone" dataKey="percent" stroke="#8884d8"/>
                <CartesianGrid strokeDasharray="3 3"/>
                <XAxis dataKey="timestamp" tickFormatter={timestamp => moment(timestamp).format("HH:mm")} />
                <YAxis orientation="left" domain={[0, 100]} yAxisId="1"
                  label={{
                    value: `percentage (%)`,
                    style: { textAnchor: 'middle' },
                    angle: -90,
                    position: 'left',
                    offset: 0,
                  }}
                />
                <Tooltip></Tooltip>
                <Legend></Legend>
              </LineChart>
            </div>
            </>
          )
    ))
  }
//  if(processes.timeseries) {
//    elements.push(
//    <div className="d-flex flex-wrap justify-content-start my-3">
//       { Object.keys(processes.timeseries).
//          map((process_id : string) => (
//            <>
//        <div className="mx-5" key={process_id} >
//          <h5>node: {processes.timeseries[process_id][0]['node']} - pid: {process_id}</h5>
//          <LineChart width={300} height={250} data={processes.timeseries[process_id]}>
//            <Line yAxisId="1" type="monotone" dataKey="cpu_percent" stroke="#8884d8"/>
//            <Line yAxisId="1" type="monotone" dataKey="memory_percent" stroke="#888400"/>
//            <CartesianGrid strokeDasharray="3 3"/>
//            <XAxis dataKey="timestamp" tickFormatter={timestamp => moment(timestamp).format("HH:mm")} />
//            <YAxis orientation="left" domain={[0,100]} yAxisId="1"
//              label={{
//                value: `percentage (%)`,
//                style: { textAnchor: 'middle' },
//                angle: -90,
//                position: 'left',
//                offset: 0,
//              }}
//            />
//            <Tooltip></Tooltip>
//            <Legend></Legend>
//          </LineChart>
//        </div>
//        </>
//      ))
//    }
//    </div>)
//  }
  return (<>{elements}</>)
}

export default CPUStatusView;