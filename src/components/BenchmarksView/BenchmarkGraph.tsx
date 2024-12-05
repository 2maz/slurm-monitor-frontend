
import { Tooltip, XAxis, YAxis, Legend, CartesianGrid, ResponsiveContainer, Bar, BarChart } from 'recharts';
import { scaleOrdinal } from 'd3-scale';
import { schemeCategory10 } from 'd3-scale-chromatic';

import { DataDictionary } from './BenchmarkData';

const get_relative_data = (data : DataDictionary[], baseline: string) => {
  const ref = data.find(value => value.label === baseline)
  if(ref) {
    let data_rel : DataDictionary[] = [] as DataDictionary[]
    data.forEach((value: DataDictionary) => {
        let relative_sample = {} as DataDictionary
        Object.keys(ref).forEach((key: string) => {
            const field_value : number | string = typeof(value[key]) === 'number' ? (value[key] / Number(ref[key])) : value[key]
            relative_sample = { ...relative_sample, [key]: field_value }
        })
        data_rel = [...data_rel, relative_sample]
    })
    return data_rel;
  }
}

interface Props {
  data: DataDictionary[]
  reference_system: string
  comparison: "absolute" | "relative"
  label_filter?: string
}

export const BenchmarkGraph = ({ data, reference_system, comparison, label_filter } : Props) => {

  const colorScale = scaleOrdinal(schemeCategory10); // Using D3's Category10 color scale
  let prepared_data : DataDictionary[] | undefined = data
  if(comparison == "relative") {
    prepared_data = get_relative_data(data, reference_system)
    if(!prepared_data) {
      return <div>No benchmark computable for reference system: {reference_system}</div>
    }
  }

  if(label_filter !== undefined && label_filter != "") {
    prepared_data = prepared_data.filter((value) => value.label.match(label_filter))
  }
  if(prepared_data.length == 0)
    return "No matching results"

  const benchmark_names : string[] = Object.keys(prepared_data[0]).filter((value) => value != 'name')
  const minHeight = prepared_data.length > 5 ? prepared_data.length*45 + "px" : "500px"
  return (<div className="mx-5" key="benchmark">
          <ResponsiveContainer minWidth="1500px" minHeight={minHeight} width="100%">
              <BarChart
                  layout="vertical"
                  data={prepared_data}
                  >
                  <CartesianGrid strokeDasharray="3 3"/>
                  <XAxis type="number" ticks={[0,1,2,3,4,5]}/>
                  <YAxis width={500} dataKey="label" type="category" />

                  {benchmark_names.map((key, index) => <Bar dataKey={key} barSize={10} fill={colorScale(index.toString())} /> )}
              
                  <Tooltip />
                  <Legend />
              </BarChart>
          </ResponsiveContainer>
          </div>
      )
}

export default BenchmarkGraph;