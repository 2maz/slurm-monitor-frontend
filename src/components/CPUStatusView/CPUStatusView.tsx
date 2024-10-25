
import { LineChart, Line, Tooltip, XAxis, YAxis, Legend, CartesianGrid } from 'recharts';
import moment from "moment";
import { BarLoader } from 'react-spinners';
import useCPUStatus from '../../hooks/useCPUStatus';

interface Props {
  nodename: string;
  start_time_in_s?: number,
  end_time_in_s?: number,
  resolution_in_s?: number,
  refresh_interval_in_s?: number;
}

const CPUStatusView = ({nodename, start_time_in_s, end_time_in_s, resolution_in_s, refresh_interval_in_s = 1000*60} : Props) => {
    const {data: nodes_processes, error, isLoading, isSuccess } = useCPUStatus({
      nodename: nodename,
      start_time_in_s: start_time_in_s,
      end_time_in_s: end_time_in_s,
      resolution_in_s: resolution_in_s
    }, refresh_interval_in_s
  )
  if(isLoading)
    return <BarLoader />

  if(error)
    return "Failed loading processes data for {nodename}"

  var elements : any[] = []
  if(isSuccess) {
    Object.keys(nodes_processes).map((process_id: string) => (
      elements.push(
            <>
            <h4>Node: {nodename}</h4>
            <div className="mx-5" key="{job_id}-accumulated" >
              <LineChart width={300} height={250} data={nodes_processes[process_id].data}>
                <Line yAxisId="1" type="monotone" dataKey="cpu_percent" stroke="#8884d8"/>
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
  return (<>{elements}</>)
}

export default CPUStatusView;