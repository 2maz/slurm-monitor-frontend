import { LineChart, Line, Tooltip, XAxis, YAxis, Legend, CartesianGrid } from 'recharts';
import { BarLoader } from 'react-spinners';
import useGPUStatus, { GPUDataSeries } from "../../hooks/useGPUStatus";
import { DateTime } from 'luxon';
import { JSX } from 'react';
//https://srl-login3.ex3.simula.no:12001/api/v1/monitor/gpustatus?node=g001
interface Props {
  nodename: string;
  uuids?: string[],
  start_time_in_s?: number,
  end_time_in_s?: number,
  resolution_in_s?: number,
  refresh_interval_in_s?: number;
}
const GPUStatusView = ({nodename, uuids, start_time_in_s, end_time_in_s, resolution_in_s, refresh_interval_in_s = 60} : Props) => {
  const { data : gpu_data_series, error, isLoading, isSuccess } = useGPUStatus({
    nodename: nodename,
    start_time_in_s: start_time_in_s,
    end_time_in_s: end_time_in_s,
    resolution_in_s: resolution_in_s,
  },
  refresh_interval_in_s
  )
  if(isLoading)
    return <BarLoader />
  if(error)
    return "Loading of GPUStatus for node: " + nodename + "failed"
  if(isSuccess) {
    if(Object.keys(gpu_data_series).length == 0)
      return <>
              <h4>Node: {nodename}</h4>
              No GPU data available
            </>
    const elements : JSX.Element[] = [];
    // Examples: https://recharts.org/en-US/examples/HighlightAndZoomLineChart
    if(gpu_data_series) {
        gpu_data_series[nodename].forEach(value => {
          const { uuid, local_index, data } = value
          elements.push(
           <div className="mx-5" key={nodename + 'gpu-' + local_index}>
             <h5 title={uuid}>{'gpu-' + local_index}</h5>
             <LineChart width={400} height={300} data={data}>
               <Line yAxisId="1" type="monotone" dataKey="ce_util" stroke="#8884d8"/>
               <Line yAxisId="1" type="monotone" dataKey="memory_util" stroke="#888400"/>
               <Line yAxisId="2" type="monotone" dataKey="power" stroke="#ff8400"/>
               <Line yAxisId="2" type="monotone" dataKey="temperature" stroke="#008400"/>
               <CartesianGrid strokeDasharray="3 3"/>
               # timeformat here: 2025-03-18T08:00:00.123456
               <XAxis dataKey="timestamp" tickFormatter={timestamp => DateTime.fromISO(timestamp as string, { zone: 'utc'}).toFormat("HH:mm")} />
               <YAxis orientation="left" domain={[0,100]} yAxisId="1"
                 label={{
                   value: `percentage (%) / °C`,
                   style: { textAnchor: 'middle' },
                   angle: -90,
                   position: 'left',
                   offset: 0,
                 }}
               />
               <YAxis orientation="right" domain={[0,500]} yAxisId="2"
                 label={{
                   value: `Watt (W)`,
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
          )
        })
    }
    return (<>
          <h4>Node: {nodename}</h4>
          <div className="d-flex flex-wrap justify-content-start my-3">
          {elements}
          </div>
          </>)
  }
}
export default GPUStatusView;