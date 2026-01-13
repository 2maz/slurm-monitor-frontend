import { LineChart, Line, Tooltip, XAxis, YAxis, Legend, CartesianGrid, ReferenceLine } from 'recharts';
import { BarLoader } from "react-spinners";
import { DateTime } from 'luxon';

import useJobProcessesStatus from "../../hooks/useJobProcessesStatus";
import useJobStatus from "../../hooks/useJobStatus";


import { JSX } from 'react';

interface Props {
  job_id: number;
  start_time_in_s?: number | null;
  end_time_in_s?: number | null;
  resolution_in_s?: number | null;
  refresh_interval_in_s: number;
}

const CPUJobStatusView = ({job_id, start_time_in_s, end_time_in_s, resolution_in_s, refresh_interval_in_s = 1000*60} : Props) => {
  const { data : job_status, error: job_status_error, isLoading: job_status_isLoading } = useJobStatus(job_id, refresh_interval_in_s)
  const { data, error, isLoading } = useJobProcessesStatus({
      job_id: job_id,
      start_time_in_s: start_time_in_s,
      end_time_in_s: end_time_in_s,
      resolution_in_s: resolution_in_s,
    },
    refresh_interval_in_s
  )
  if(isLoading || job_status_isLoading)
    return <BarLoader />

  if(error) {
    const details = error.response as { data: { detail: string }}
    return "Failed to retrieve status data for job " + job_id + " -- " + details.data.detail
  }
  if(job_status_error) {
    const details = job_status_error.response as { data: { detail: string }}
    return "Failed to retrieve status data for job " + job_id + " -- " + details.data.detail
  }

  const elements : JSX.Element[] = []

  if(job_status && data && data.length > 0) {
    Object.keys(data[0].nodes).map((nodename: string, index: number) => {
      const node_data = data[0].nodes[nodename].cpu_memory
      elements.push(
            <div key={index}>
              <h4>Node: {nodename}</h4>
              <div className="mx-5" key="{job_id}-accumulated" >
                <LineChart width={600} height={300} margin={{left: 50, right: 50}} data={node_data}>
                  <Line yAxisId="1" type="monotone" dataKey="cpu_util" name="CPU Utilization (%)" stroke="#8884d8"/>
                  <Line yAxisId="1" type="monotone" dataKey="memory_util" name="Memory Utilization (%)" stroke="#888400"/>
                  <Line yAxisId="2" type="monotone" dataKey="processes_avg" name="Average number of processes" stroke="#008400"/>
                  <CartesianGrid strokeDasharray="3 3"/>
                  <XAxis dataKey="time" tickFormatter={timestamp => DateTime.fromISO(timestamp as unknown as string, { zone: 'utc'}).toFormat("HH:mm")} />
                  <YAxis orientation="left" domain={[0, job_status.requested_cpus*100*1.2]} yAxisId="1"
                    label={{
                      value: `percentage (%)`,
                      style: { textAnchor: 'middle' },
                      angle: -90,
                      position: 'left',
                      offset: 25,
                    }}
                    tickFormatter={(value: number) => value.toFixed(2)}
                  />
                  <ReferenceLine yAxisId="1" y={job_status.requested_cpus*100} label={{ value: job_status.requested_cpus + " cpu(s) allocated", fill: 'black', style: { fontWeight: 'bolder' }}} stroke="red" strokeDasharray="80 220"/>
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