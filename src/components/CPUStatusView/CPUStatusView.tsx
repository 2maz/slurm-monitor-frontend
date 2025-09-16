
import { LineChart, Line, Tooltip, XAxis, YAxis, Legend, CartesianGrid } from 'recharts';
import { BarLoader } from 'react-spinners';
import useCPUStatus from '../../hooks/useCPUStatus';
import { DateTime } from 'luxon';
import useNodesInfo from '../../hooks/useNodesInfos';
import { JSX } from 'react';

interface Props {
  nodename: string;
  start_time_in_s?: number,
  end_time_in_s?: number,
  resolution_in_s?: number,
  refresh_interval_in_s?: number;
}

const CPUStatusView = ({nodename, start_time_in_s, end_time_in_s, resolution_in_s, refresh_interval_in_s = 1000*60} : Props) => {
    const { data : nodes_info, error: nodes_info_error, isLoading: nodes_info_isLoading } = useNodesInfo()
    const {data: nodes, error, isLoading, isSuccess } = useCPUStatus({
      nodename: nodename,
      start_time_in_s: start_time_in_s,
      end_time_in_s: end_time_in_s,
      resolution_in_s: resolution_in_s
    }, refresh_interval_in_s
  )
  if(isLoading || nodes_info_isLoading)
    return <BarLoader />

  if(nodes_info_error)
    return "Failed loading processes data for " + nodename

  if(error) {
    const error_info = error?.response?.data as { detail: string }
    return "Failed loading processes data for " + nodename + " -- " + error_info.detail
  }

  const cpuCount = nodes_info && nodes_info[nodename] ? nodes_info[nodename].cores_per_socket*nodes_info[nodename].sockets*nodes_info[nodename].threads_per_core : 1

  const elements : JSX.Element[] = []
  if(isSuccess) {
    Object.keys(nodes).map((node: string) => {
      elements.push(
            <div key={node + "cpu_status"}>
            <h4>Node: {nodename}</h4>
            <div className="mx-5" key={nodename + "-accumulated"} >
              <LineChart width={300} height={250} data={nodes[node]}>
                <Line yAxisId="1" type="monotone" dataKey="cpu_util" stroke="#8884d8"/>
                <Line yAxisId="1" type="monotone" dataKey="cpu_avg" stroke="#008400"/>
                <CartesianGrid strokeDasharray="3 3"/>
                <XAxis dataKey="time" tickFormatter={timestamp => DateTime.fromISO(timestamp as string, { zone: 'utc'}).toFormat("HH:mm")} />
                <YAxis orientation="left"
                  domain={[0, cpuCount*100]}
                  yAxisId="1"
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
            </div>
          )
    })
  }
  return (<>{elements}</>)
}

export default CPUStatusView;