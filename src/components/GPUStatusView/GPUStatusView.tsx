import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import SlurmMonitorEndpoint from "../../services/slurm-monitor/endpoint";
import Response from "../../services/slurm-monitor/response";
import { LineChart, Line, Tooltip, XAxis, YAxis, Legend, CartesianGrid } from 'recharts';
import moment from "moment";

interface GPUStatus {
    name: string;
    uuid: string;
    local_id: number;
    node: string;
    temperature_gpu: number;
    power_draw: number;
    utilization_gpu: number;
    utilization_memory: number;
    memory_total: number;

    // datetime string needs to be formatted
    timestamp: string,
};

interface GPUDataSeries {
    label: string;
    data: GPUStatus[];
}

interface GPUDataSeriesResponse extends Response {
  gpu_status: GPUDataSeries[];
}

const dummy_data : GPUDataSeries[] = [
    {
        label: "g001-gpu-0",
        data: [
            {   name: "Tesla A100", 
                uuid: "abc",
                local_id: 0,
                node: "g001",
                temperature_gpu: 10,
                power_draw: 40,
                utilization_gpu: 75,
                utilization_memory: 25,
                memory_total: 10000000,
                timestamp: "2024-07-10 02:39:56.910603"
            },
            {   name: "Tesla A100", 
                uuid: "abc",
                local_id: 0,
                node: "g001",
                temperature_gpu: 90,
                power_draw: 120,
                utilization_gpu: 100,
                utilization_memory: 50,
                memory_total: 10000000,
                timestamp: "2024-07-10 04:39:56.910603"
            }
        ]
    },
    {
        label: "n010-gpu-0",
        data: [
            {   name: "Tesla Volta", 
                uuid: "abcd",
                local_id: 0,
                node: "n010",
                temperature_gpu: 10,
                power_draw: 20,
                utilization_gpu: 35,
                utilization_memory: 15,
                memory_total: 100000,
                timestamp: "2024-07-10 01:39:56.910603"
            },
            {   name: "Tesla Volta", 
                uuid: "abcd",
                local_id: 0,
                node: "n010",
                temperature_gpu: 30,
                power_draw: 80,
                utilization_gpu: 30,
                utilization_memory: 25,
                memory_total: 10000000,
                timestamp: "2024-07-10 03:39:56.910603"
            }
        ]
    }
];
 
//https://srl-login3.ex3.simula.no:12001/api/v1/monitor/gpustatus?node=g001

interface Props {
  nodename: string;
  logical_ids?: number[] | null;
  start_time_in_s?: number | null;
  end_time_in_s?: number | null;
  resolution_in_s?: number | null;
  refresh_interval_in_s: number;
}

const GPUStatusView = ({nodename, logical_ids, start_time_in_s, end_time_in_s, resolution_in_s, refresh_interval_in_s = 1000*60} : Props) => {
  const [error, setError] = useState<Error>();

  var query = "/nodes/"+ nodename + "/gpu_status"
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
  if(logical_ids != undefined) {
    parameters = { ...parameters, "local_indices": logical_ids.join(",") }
  }

  const endpoint = new SlurmMonitorEndpoint(query, parameters);

  const fetchStatus = async () => {
    const { request, cancel } = endpoint.get<GPUDataSeriesResponse>();

    return request
      .then<GPUDataSeries[]>(({ data }) => {
        return data ? data.gpu_status : [];
      })
      .catch((error) => {
        setError(error);
        cancel();
        return [];
      });
  };

  const { data: gpu_data_timeseries_list } = useQuery<GPUDataSeries[]>({
    queryKey: ["gpu_status", nodename, logical_ids, start_time_in_s, end_time_in_s, resolution_in_s],
    queryFn: fetchStatus,
    initialData: [],
    refetchInterval: refresh_interval_in_s, // refresh every minute
  });

  // Examples: https://recharts.org/en-US/examples/HighlightAndZoomLineChart
  return (
    <>
    <h4>Node: {nodename}</h4>
    <div className="d-flex justify-content-start my-3">
    { gpu_data_timeseries_list &&
        gpu_data_timeseries_list
          .map((series_data : GPUDataSeries) => (
        <div className="mx-5" key={series_data.label}>
          <h5>{series_data.label.replace(nodename + '-','')}</h5>
          <LineChart width={400} height={300} data={series_data.data}>
            <Line yAxisId="1" type="monotone" dataKey="utilization_gpu" stroke="#8884d8"/>
            <Line yAxisId="1" type="monotone" dataKey="utilization_memory" stroke="#888400"/>
            <Line yAxisId="2" type="monotone" dataKey="power_draw" stroke="#ff8400"/>
            <Line yAxisId="2" type="monotone" dataKey="temperature_gpu" stroke="#008400"/>
            <CartesianGrid strokeDasharray="3 3"/>
            <XAxis dataKey="timestamp" tickFormatter={timestamp => moment(timestamp).format("HH:mm")} />
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
        </div>))
    }
    </div>
    </>
  )
}

export default GPUStatusView;
