import { DataDictionary } from './BenchmarkData';
import BenchmarkGraph from './BenchmarkGraph';
import useBenchmarkData from '../../hooks/useBenchmarkData';

import { SelectContent, SelectItem, SelectLabel, SelectRoot, SelectTrigger, SelectValueText } from '../ui/select';
import { useState } from 'react';
import { createListCollection, HStack } from '@chakra-ui/react';

interface LabelValuePair {
  label: string
  value: string | number
}


const BenchmarksView = () => {
  const { data, isLoading, error } = useBenchmarkData();

  const [selectedPrecision, setSelectedPrecision] = useState<string[]>(["fp16"]);
  const [selectedMetric, setSelectedMetric] = useState<string[]>(["throughput"]);
  const [selectedNumberOfGPUs, setSelectedNumberOfGPUS] = useState<string[]>(["1"]);
  const [selectedReferenceSystem, setSelectedReferenceSystem] = useState<string[]>(["Tesla-V100"])
  const [selectedTests, setSelectedTests] = useState<string[]>([])
  const [comparisonType, setComparisonType] = useState<string[]>(["relative"])

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
  const filtered_data : DataDictionary[] = []
  Array.from(node_labels).forEach((node) => {
    let entry = {} as DataDictionary
    Array.from(task_name_labels).forEach((task_name) => {
      if(selectedTests.length == 0 || selectedTests.includes(task_name)) {
        const result = data.filter((x) => (x.node == node && x.task_name === task_name && x.precision === selectedPrecision[0] && x.metric_name == selectedMetric[0] && x.number_of_gpus.toString() == selectedNumberOfGPUs[0]))
        if(result.length > 0) {
          const metric_value = result[0].metric_value
          entry = { ...entry, [task_name]: metric_value, name: result[0].system }
        }
      }
    })
    if(Object.keys(entry).length >= 2) {
      filtered_data.push(entry)
    }
  })

  const system_labels = filtered_data.reduce((labels,x) => labels.add(x.name.split(/_[0-9]x/)[1]), new Set<string>())
  const systems = createListCollection({
      items: Array.from(system_labels).sort().map((x) => ({ label : x, value: x } as LabelValuePair))
  })


  let reference_system = undefined;
  if(filtered_data.length != 0) {
    reference_system = filtered_data.filter((x) => x.name.includes(selectedReferenceSystem[0]))[0].name
    console.log(reference_system)
  }

  return (<>
    <h1>Benchmarks</h1>
    <h2 className='m-2'>Lambdal {comparisonType[0] == "relative" && " (Relative comparison against reference: "+ reference_system +")"}</h2>
    <HStack className='m-5'>
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
        collection={precision} size="sm" width="120px"
        value={selectedPrecision}
        onValueChange={(e) => setSelectedPrecision(e.value)}
      >
        <SelectLabel>Precision:</SelectLabel>
        <SelectTrigger>
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
        collection={number_of_gpus} size="sm" width="120px"
        value={selectedNumberOfGPUs}
        onValueChange={(e) => setSelectedNumberOfGPUS(e.value)}
      >
        <SelectLabel>GPU Count:</SelectLabel>
        <SelectTrigger>
          <SelectValueText placeholder="Select number of GPUs" />
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
    { reference_system && <BenchmarkGraph data={filtered_data} reference_system={reference_system} comparison={comparisonType[0] as "relative" | "absolute"} /> }
    </>)
}

export default BenchmarksView
