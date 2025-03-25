import { LineChart, Line, Tooltip, XAxis, YAxis, Legend, CartesianGrid, ReferenceLine } from 'recharts';
import { BarLoader } from "react-spinners";
import { DateTime } from 'luxon';

import useJobStatus from "../../hooks/useJobStatus";
import useNodesProcessesStats from "../../hooks/useNodesProcessesStats";

interface Props {
  job_id: number;
  start_time_in_s?: number | null;
  end_time_in_s?: number | null;
  resolution_in_s?: number | null;
  refresh_interval_in_s: number;
}

const CPUJobStatusView = ({job_id, start_time_in_s, end_time_in_s, resolution_in_s, refresh_interval_in_s = 1000*60} : Props) => {
  const { data: nodes_processes, error: nodes_processes_error, isLoading : nodes_processes_isLoading } = useNodesProcessesStats({
      job_id: job_id,
      start_time_in_s: start_time_in_s,
      end_time_in_s: end_time_in_s,
      resolution_in_s: resolution_in_s,
    },
    refresh_interval_in_s=refresh_interval_in_s
  )
  const { data: job_status, error : job_status_error, isLoading : job_status_isLoading } = useJobStatus(job_id, 3600) // no frequent refresh necessary, just getting cpu allocation

  if(job_status_isLoading || nodes_processes_isLoading)
    return <BarLoader />

  if(nodes_processes_error)
    return "Failed to retrieve process data from nodes"

  if(job_status_error)
    return "Failed to retrieve status data for job {job_id}"

  var elements : any[] = []

  if(nodes_processes && job_status) {
    Object.keys(nodes_processes).map((nodename: string, index: number) => {

        const node_processes = nodes_processes[nodename]
        const allocated_cpus = job_status.cpus;

        const max_cpu_percent = node_processes.accumulated.reduce((acc, stats) => { return acc > stats.cpu_percent ? acc : stats.cpu_percent}, 0)
        const upperLimit = Math.ceil(max_cpu_percent > allocated_cpus*100 ? max_cpu_percent + 50 : (allocated_cpus + 2)*100);

        elements.push(
              <div key={index}>
                <h4>Node: {nodename} - active processes:  {node_processes.active_pids.length}</h4>
                <div className="mx-5" key="{job_id}-accumulated" >
                  <LineChart width={300} height={250} data={node_processes.accumulated}>
                    <Line yAxisId="1" type="monotone" dataKey="cpu_percent" stroke="#8884d8"/>
                    <Line yAxisId="1" type="monotone" dataKey="memory_percent" stroke="#888400"/>
                    <ReferenceLine yAxisId="1" y={allocated_cpus*100} label={allocated_cpus + " cpu(s) allocated"} stroke="red" strokeDasharray="40 150"/>
                    <CartesianGrid strokeDasharray="3 3"/>
                    <XAxis dataKey="timestamp" tickFormatter={timestamp => DateTime.fromISO(timestamp as unknown as string).toFormat("HH:mm")} />
                    <YAxis orientation="left" domain={[0, upperLimit]} yAxisId="1"
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

export default CPUJobStatusView;