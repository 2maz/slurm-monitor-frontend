import { DataDictionary } from './BenchmarkData';
import BenchmarkGraph from './BenchmarkGraph';
import useBenchmarkData from '../../hooks/useBenchmarkData';

import { SelectContent, SelectItem, SelectLabel, SelectRoot, SelectTrigger, SelectValueText } from '../ui/select';
import { Field } from '../ui/field';
import { useState } from 'react';
import { createListCollection, HStack, Input } from '@chakra-ui/react';

interface LabelValuePair {
  label: string
  value: string | number
}

const escape_reg_exp = (x: string) => x.replace(/[.*+?^=!:${}\(\)|\[\]\/\\]/g, '\\$&')


const BenchmarksView = () => {
  const { data, isLoading, error } = useBenchmarkData();

  const [selectedPrecision, setSelectedPrecision] = useState<string[]>(["fp16"]);
  const [selectedMetric, setSelectedMetric] = useState<string[]>(["throughput"]);
  const [selectedNumberOfGPUs, setSelectedNumberOfGPUS] = useState<number[]>([1]);
  const [selectedReferenceSystem, setSelectedReferenceSystem] = useState<string[]>([])
  const [selectedTests, setSelectedTests] = useState<string[]>([])
  const [comparisonType, setComparisonType] = useState<string[]>(["relative"])
  const [textFilter, setTextFilter] = useState<string>('')

  if(error) {
    return "Error retrieving benchmark data: {error}"
  }

  if(isLoading) {
    return "Loading"
  }

  if(!data) {
    return "No data available"
  }

  const metric_labels = data.reduce((labels,x) => labels.add(x.metric_name), new Set())
  const metrics = createListCollection({
    items: Array.from(metric_labels).sort().map((x) => ({ label: x, value: x } as LabelValuePair))
  })

  const number_of_gpus_labels = data.reduce((labels,x) => labels.add(x.number_of_gpus), new Set())
  const number_of_gpus = createListCollection({
    items: Array.from(number_of_gpus_labels).sort().map((x) => ({ label: x, value: x } as LabelValuePair))
  })

  const precision_labels = data.reduce((labels,x) => labels.add(x.precision), new Set())
  const precision = createListCollection({
    items: Array.from(precision_labels).sort().map((x) => ({ label: x, value: x } as LabelValuePair))
  })

  const task_name_labels = data.reduce((labels,x) => labels.add(x.task_name), new Set<string>())
  const task_names = Array.from(task_name_labels).sort().map((x) => ({ label: x, value: x } as LabelValuePair))

  const tests = createListCollection({
      items: task_names
  })

  const node_labels = data.reduce((labels,x) => labels.add(x.node), new Set<string>())
  let entries = {} as {[id:string] : DataDictionary }
  Array.from(node_labels).forEach((node) => {
    Array.from(task_name_labels).forEach((task_name) => {
      if(selectedTests.length == 0 || selectedTests.includes(task_name)) {
        const result = data.filter((x) => (x.node == node && x.task_name === task_name && 
            (selectedPrecision.length == 0 || selectedPrecision.includes(x.precision)) && 
            (selectedMetric.length == 0 || selectedMetric.includes(x.metric_name)) &&
            (selectedNumberOfGPUs.length == 0 || selectedNumberOfGPUs.includes(x.number_of_gpus)) ))

        result.forEach((x) => {
          const metric_value = x.metric_value
          const label = x.system + " (" + x.precision +")"
          entries = { ...entries, [label] : { ...entries[label], [task_name]: metric_value, name: x.system, label: label }}
        })
      }
    })
  })

  const filtered_data = Object.values(entries).reduce((cur, value) => {
      if(Object.keys(value).length >= 2) {
        cur.push(value)
      }
      return cur
  }, [] as DataDictionary[]);

  const system_labels = filtered_data.reduce((labels,x) => labels.add(x.label), new Set<string>())
  const systems = createListCollection({
      items: Array.from(system_labels).sort().map((x) => ({ label : x, value: x } as LabelValuePair))
  })

  if(selectedReferenceSystem.length == 0) {
    setSelectedReferenceSystem([Array.from(system_labels)[0]])
  }

  return (<>
    <h1>Benchmarks</h1>
    <h2 className='m-2'>Lambdal {comparisonType[0] == "relative" && " (Relative comparison against reference: "+ selectedReferenceSystem[0] +")"}</h2>
    <HStack className='mx-5'>
      <SelectRoot
        collection={metrics} size="sm" width="220px"
        value={selectedMetric}
        onValueChange={(e) => setSelectedMetric(e.value)}
      >
        <SelectLabel>Metric:</SelectLabel>
        <SelectTrigger>
          <SelectValueText placeholder="Select metric" />
        </SelectTrigger>
        <SelectContent>
          {metrics.items.map((m) => (
            <SelectItem item={m} key={m.value}>
              {m.label}
            </SelectItem>
          ))}
        </SelectContent>
      </SelectRoot>
      <SelectRoot
        multiple
        collection={precision} size="sm" width="250px"
        value={selectedPrecision}
        onValueChange={(e) => setSelectedPrecision(e.value)}
      >
        <SelectLabel>Precision:</SelectLabel>
        <SelectTrigger clearable>
          <SelectValueText placeholder="Select precision" />
        </SelectTrigger>
        <SelectContent>
          {precision.items.map((x) => (
            <SelectItem item={x} key={x.value}>
              {x.label}
            </SelectItem>
          ))}
        </SelectContent>
      </SelectRoot>
      <SelectRoot
        multiple
        collection={number_of_gpus} size="sm" width="250px"
        value={selectedNumberOfGPUs}
        onValueChange={(e) => setSelectedNumberOfGPUS(e.value)}
      >
        <SelectLabel>GPU Count:</SelectLabel>
        <SelectTrigger clearable>
          <SelectValueText placeholder="Select #" />
        </SelectTrigger>
        <SelectContent>
          {number_of_gpus.items.map((x) => (
            <SelectItem item={x} key={x.value}>
              {x.label}
            </SelectItem>
          ))}
        </SelectContent>
      </SelectRoot>
      <SelectRoot
        multiple
        collection={tests} size="sm" width="400px"
        value={selectedTests}
        onValueChange={(e) => setSelectedTests(e.value)}
      >
        <SelectLabel>Tests:</SelectLabel>
        <SelectTrigger clearable>
          <SelectValueText placeholder="Select test" />
        </SelectTrigger>
        <SelectContent>
          {tests.items.map((x) => (
            <SelectItem item={x} key={x.value}>
              {x.label}
            </SelectItem>
          ))}
        </SelectContent>
      </SelectRoot>
      <SelectRoot
        collection={systems} size="sm" width="350px"
        value={selectedReferenceSystem}
        onValueChange={(e) => setSelectedReferenceSystem(e.value)}
        >
        <SelectLabel>Reference system:</SelectLabel>
        <SelectTrigger>
          <SelectValueText placeholder="Select reference system" />
        </SelectTrigger>
        <SelectContent>
          {systems.items.map((x) => (
            <SelectItem item={x} key={x.value}>
              {x.label}
            </SelectItem>
          ))}
        </SelectContent>
      </SelectRoot>
      <SelectRoot
        collection={systems} size="sm" width="350px"
        value={comparisonType}
        onValueChange={(e) => setComparisonType(e.value)}
        >
        <SelectLabel>Comparison Type:</SelectLabel>
        <SelectTrigger>
          <SelectValueText placeholder="Select comparison type" />
        </SelectTrigger>
        <SelectContent>
            <SelectItem item="absolute" key="absolute">absolute</SelectItem>
            <SelectItem item="relative" key="relative">relative</SelectItem>
        </SelectContent>
      </SelectRoot>

    </HStack>
    <HStack className='mx-5 my-1'>
          <Field maxWidth="400px" label="System Filter" helperText="Use this text filter to narrow number of systems">
          <Input name="user" placeholder="Set filter pattern"
            onChange={(e) => setTextFilter(escape_reg_exp(e.target.value))}
          ></Input>
          </Field>
    </HStack>
    <div className="my-3">
    <BenchmarkGraph data={filtered_data} label_filter={textFilter} reference_system={selectedReferenceSystem[0]} comparison={comparisonType[0] as "relative" | "absolute"} /> 
    </div>
    </>)
}

export default BenchmarksView
