import { LineChart, Line, Tooltip, XAxis, YAxis, Legend, CartesianGrid } from 'recharts';
import { BarLoader } from 'react-spinners';
import useNodesMemoryStatus from "../../hooks/useNodesMemoryStatus";
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
    Object.keys(nodes_memory).map((process_id: string) => (
      elements.push(
            <div key="memory-{process_id}"><h4>Node: {nodename}</h4>
            <div className="mx-5" key="{process_id}-accumulated" >
              <LineChart width={300} height={250} data={nodes_memory[process_id].data}>
                <Line yAxisId="1" type="monotone" dataKey="percent" stroke="#8884d8"/>
                <CartesianGrid strokeDasharray="3 3"/>
                # timeformat here: 2025-03-18T08:00:00.123456
                <XAxis dataKey="timestamp" tickFormatter={timestamp => DateTime.fromISO(timestamp as string).toFormat("HH:mm")} />
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
            </div>
          )
    ))
  }
  return (<>{elements}</>)
}

export default MemoryStatusView;