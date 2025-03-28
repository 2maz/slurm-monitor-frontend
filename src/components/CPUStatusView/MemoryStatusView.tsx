import { LineChart, Line, Tooltip, XAxis, YAxis, Legend, CartesianGrid } from 'recharts';
import { BarLoader } from 'react-spinners';
import useNodesMemoryStatus, { MemoryStatus } from "../../hooks/useNodesMemoryStatus";
import { DateTime } from 'luxon';
import { JSX } from 'react';
interface Props {
  nodename: string;
  start_time_in_s?: number,
  end_time_in_s?: number,
  resolution_in_s?: number,
  refresh_interval_in_s?: number;
}
const MemoryStatusView = ({nodename, start_time_in_s, end_time_in_s, resolution_in_s, refresh_interval_in_s = 1000*60} : Props) => {
  const { data: nodes_memory, error, isLoading, isSuccess } = useNodesMemoryStatus({
      nodename: nodename,
      start_time_in_s: start_time_in_s,
      end_time_in_s: end_time_in_s,
      resolution_in_s: resolution_in_s
    },
    refresh_interval_in_s
  )
  if(isLoading)
    return <BarLoader />
  if(error)
    return "Failed to load memory data for "
  const elements : JSX.Element[] = []
  if(isSuccess) {
    Object.entries(nodes_memory).map((([node, data]) => {
      const filtered_data = data.map((x) => ({
        ...x,
        memory_resident: x.memory_resident / 1024**2,
        memory_virtual: x.memory_virtual / 1024**2
      }));
      elements.push(
            <div key={"memory-"+node}><h4>Node: {node}</h4>
            <div className="mx-5" key="{process_id}-accumulated" >
              <LineChart width={300} height={250} data={filtered_data}>
                <Line yAxisId="1" type="monotone" dataKey="memory_util" stroke="#8884d8"/>
                <Line yAxisId="2" type="monotone" dataKey="memory_resident" stroke="#008400"/>
                <Line yAxisId="2" type="monotone" dataKey="memory_virtual" stroke="#880000"/>
                <CartesianGrid strokeDasharray="3 3"/>
                # timeformat here: 2025-03-18T08:00:00.123456
                <XAxis dataKey="timestamp" tickFormatter={timestamp => DateTime.fromISO(timestamp as string, { zone: 'utc'}).toFormat("HH:mm")} />
                <YAxis orientation="left" domain={[0, 100]} yAxisId="1"
                  label={{
                    value: `percentage (%)`,
                    style: { textAnchor: 'middle' },
                    angle: -90,
                    position: 'left',
                    offset: 0,
                  }}
                />
                <YAxis orientation="right" yAxisId="2"
                  label={{
                    value: `GB`,
                    style: { textAnchor: 'middle' },
                    angle: +90,
                    position: 'right',
                    offset: 0,
                  }}
                />
                <Tooltip></Tooltip>
                <Legend></Legend>
              </LineChart>
            </div>
            </div>
          )
    }))
  }
  return (<>{elements}</>)
}
export default MemoryStatusView;