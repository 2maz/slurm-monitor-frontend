import { LineChart, Line, Tooltip, XAxis, YAxis, Legend, CartesianGrid, ReferenceLine } from 'recharts';
import { BarLoader } from "react-spinners";
import { DateTime } from 'luxon';

import useJobProcessesStatus from "../../hooks/useJobProcessesStatus";
import { JSX } from 'react';

interface Props {
  job_id: number;
  start_time_in_s?: number | null;
  end_time_in_s?: number | null;
  resolution_in_s?: number | null;
  refresh_interval_in_s: number;
}

const CPUJobStatusView = ({job_id, start_time_in_s, end_time_in_s, resolution_in_s, refresh_interval_in_s = 1000*60} : Props) => {
  const { data, error, isLoading } = useJobProcessesStatus({
      job_id: job_id,
      start_time_in_s: start_time_in_s,
      end_time_in_s: end_time_in_s,
      resolution_in_s: resolution_in_s,
    },
    refresh_interval_in_s
  )
  if(isLoading)
    return <BarLoader />

  if(error)
    return "Failed to retrieve status data for job {job_id}"

  const elements : JSX.Element[] = []

                  //<ReferenceLine yAxisId="1" y={allocated_cpus*100} label={allocated_cpus + " cpu(s) allocated"} stroke="red" strokeDasharray="40 150"/>
  if(data && data.length > 0) {
    Object.keys(data[0].nodes).map((nodename: string, index: number) => {
      const node_data = data[0].nodes[nodename].cpu_memory
      elements.push(
            <div key={index}>
              <h4>Node: {nodename}</h4>
              <div className="mx-5" key="{job_id}-accumulated" >
                <LineChart width={300} height={250} data={node_data}>
                  <Line yAxisId="1" type="monotone" dataKey="cpu_util" stroke="#8884d8"/>
                  <Line yAxisId="1" type="monotone" dataKey="memory_util" stroke="#888400"/>
                  <Line yAxisId="2" type="monotone" dataKey="pids" stroke="#008400"/>
                  <CartesianGrid strokeDasharray="3 3"/>
                  <XAxis dataKey="timestamp" tickFormatter={timestamp => DateTime.fromISO(timestamp as unknown as string, { zone: 'utc'}).toFormat("HH:mm")} />
                  <YAxis orientation="left" domain={[0, 100]} yAxisId="1"
                    label={{
                      value: `percentage (%)`,
                      style: { textAnchor: 'middle' },
                      angle: -90,
                      position: 'left',
                      offset: 0,
                    }}
                  />
                  <YAxis orientation="right" domain={[0, 100]} yAxisId="2"
                    label={{
                      value: `count`,
                      style: { textAnchor: 'middle' },
                      angle: -90,
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
    })
  } else {
    elements.push(<h5>No data available</h5>)

  }
  return (<>{elements}</>)
}

export default CPUJobStatusView;