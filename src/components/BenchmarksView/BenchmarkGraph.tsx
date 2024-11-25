
import { Tooltip, XAxis, YAxis, Legend, CartesianGrid, ResponsiveContainer, Bar, BarChart } from 'recharts';
import { scaleOrdinal } from 'd3-scale';
import { schemeCategory10 } from 'd3-scale-chromatic';

import { DataDictionary, baseline } from './BenchmarkData';

const get_relative_data = (data : DataDictionary[], baseline: string) => {
  const ref = data.find(value => value.name === baseline)
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
}

const BenchmarkGraph = ({ data } : Props) => {
  const colorScale = scaleOrdinal(schemeCategory10); // Using D3's Category10 color scale
  const relative_data = get_relative_data(data, baseline)
  if(!relative_data) {
    return <div>No benchmark data available</div>
  } else {
    const benchmark_names : string[] = Object.keys(relative_data[0]).filter((value) => value != 'name')
    return (<>
        <div className="d-flex flex-wrap justify-content-start my-3">
            <div className="mx-5" key="benchmark">
            <ResponsiveContainer minWidth="1500px" minHeight="500px" width="100%" height="100%">
                <BarChart
                    layout="vertical"
                    data={relative_data}
                    >
                    <CartesianGrid strokeDasharray="3 3"/>
                    <XAxis type="number" ticks={[0,1,2,3,4,5]}/>
                    <YAxis width={500} dataKey="name" type="category" />

                    {benchmark_names.map((key, index) => <Bar dataKey={key} barSize={10} fill={colorScale(index.toString())} /> )}
                
                    <Tooltip />
                    <Legend />
                </BarChart>
            </ResponsiveContainer>
            </div>
            </div>
        </>)
  }
}

export default BenchmarkGraph;