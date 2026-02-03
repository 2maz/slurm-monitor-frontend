import useDisksStats, { DiskStatsTimeseries } from "../../hooks/useDisksStats"
import { DateTime } from "luxon";
import { JSX } from "react";
import { BarLoader } from "react-spinners";
import { CartesianGrid, Legend, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";

import {memo} from 'react'

interface Props {
  nodename: string;
  start_time_in_s?: number,
  end_time_in_s?: number,
  resolution_in_s?: number,
  refresh_interval_in_s?: number;
}

interface DiskData {
  node: string
  disk: DiskStatsTimeseries
}


const DiskStatGraph = ({node, disk}: DiskData) => {
  return (<>
      <div key={node + "-diskstats" + "-" + disk.name}>
      <h4>{disk.name}</h4>
      <LineChart height={350} width={300} margin={{ bottom: 50 }} data={disk.data}>
        <Line yAxisId="1" type="monotone" dataKey="reads_completed" name="reads completed (count)" stroke="#0e02ff"/>
        <Line yAxisId="1" type="monotone" dataKey="reads_merged" name="reads merged (count)" stroke="#00ff2a"/>
        <Line yAxisId="1" type="monotone" dataKey="sectors_read" name="sectors read (count)" stroke="#e401f8"/>
        <Line yAxisId="1" type="monotone" dataKey="ms_spent_reading" name="reads (total time in ms)" stroke="#ea560b"/>
        
        <CartesianGrid strokeDasharray="3 3"/>
        // rotate -45 deg, make textAnchor to not overlap into the diagram
        <XAxis tickMargin={5} dataKey="time" allowDataOverflow={false} tickFormatter={timestamp => DateTime.fromISO(timestamp as string, { zone: 'utc'}).toFormat("MM-HH:mm")} angle={-45} textAnchor="end"/>

        <YAxis orientation="left"
          //#domain={[0, cpuCount*100]}
          yAxisId="1"
          label={{
            value: `count / ms`,
            style: { textAnchor: 'middle' },
            angle: -90,
            position: 'left',
            offset: 0,
          }}
        />
        <Tooltip />
        <Legend verticalAlign="top"/>
      </LineChart>
      </div>
    </>
  )
}

const DisksStatsView = memo(({nodename, start_time_in_s, end_time_in_s, resolution_in_s, refresh_interval_in_s = 60*20} : Props) => {
  const { data, isLoading, error, isSuccess } = useDisksStats({
      nodename: nodename,
      start_time_in_s: start_time_in_s,
      end_time_in_s: end_time_in_s,
      resolution_in_s: resolution_in_s
  }, refresh_interval_in_s);


  if(isLoading)
    return <BarLoader />

  if(error) {
    const error_info = error?.response?.data as { detail: string }
    return "Failed loading processes data for " + nodename + " -- " + error_info.detail
  }

  const elements : JSX.Element[] = []
  if(isSuccess) {
    Object.keys(data).map((node: string) => {
      data[node].forEach((disk: DiskStatsTimeseries) => {
        elements.push( <DiskStatGraph node={node} disk={disk} />)
      })
    })
  }

  return (<>
    <h4>Node: {nodename}</h4>
    <div className="d-flex flex-wrap justify-content-start my-3">
    {elements}
    </div>
    </>
  )
});

export default DisksStatsView