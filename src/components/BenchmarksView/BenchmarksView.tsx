import { baseline, data_fp16, data_fp32 } from './BenchmarkData';


import BenchmarkGraph from './BenchmarkGraph';

const BenchmarksView = () => {
  return (<>
    <h1>Benchmarks</h1>
          <h2>Lambdal (Relative comparison for baseline: {baseline})</h2>
          <h3>FP16</h3>
          <BenchmarkGraph data={data_fp16} />

          <h3>FP32</h3>
          <BenchmarkGraph data={data_fp32} />
    </>)
}

export default BenchmarksView
