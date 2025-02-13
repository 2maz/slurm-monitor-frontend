import { useEffect, useState } from "react";
import useDataFrameQuery from "../../hooks/useDataFrameQuery";
import { BarLoader } from "react-spinners";

import { createListCollection, HStack } from "@chakra-ui/react";
import { scaleSymlog } from 'd3-scale';

import {
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectRoot,
  SelectTrigger,
  SelectValueText,
} from "../ui/select";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ScaleType } from "recharts/types/util/types";

interface Props {
  query_name: string;
}
const DataFrameView = ({ query_name }: Props) => {
  const { data, isLoading, error } = useDataFrameQuery(query_name);
  const [xColumn, setXColumn] = useState("");
  const [yColumn, setYColumn] = useState("");

  const [xScale, setXScale] = useState<ScaleType>("auto");
  const [yScale, setYScale] = useState<ScaleType>("auto");

  useEffect(() => {
    setXColumn("");
    setYColumn("");
    setXScale("auto");
    setYScale("auto");
  }, [query_name]);

  if (isLoading) {
    return <BarLoader />;
  }
  if (error) return "Failed to load data";

  if (!data) return "Data is not available";

  const availableColumns: { label: string; value: string }[] = [];
  Object.keys(data[0]).map((item) =>
    availableColumns.push({
      label: item,
      value: item,
    })
  );
  const columns = createListCollection({
    items: availableColumns,
  });
  // 'auto' | 'linear' | 'pow' | 'sqrt' | 'log' | 'identity' | 'time' | 'band' | 'point' | 'ordinal' | 'quantile' | 'quantize' | 'utc' | 'sequential' | 'threshold' | Function
  const scales = createListCollection({
    items: [
      { label: 'auto', value: 'auto'},
      { label: 'sqrt', value: 'sqrt'},
      { label: 'log', value: 'log'},
      { label: 'linear', value: 'linear'},
      { label: 'pow', value: 'pow'},
      { label: 'identity', value: 'identity'},
      { label: 'time', value: 'time'},
      { label: 'band', value: 'band'},
      { label: 'point', value: 'point'},
      { label: 'quantile', value: 'quantile'},
      { label: 'quantize', value: 'quantize'},
      { label: 'utc', value: 'utc'},
      { label: 'sequential', value: 'sequential'},
      { label: 'threshold', value: 'threshold'},

    ]
  })

  const elements = [];
  elements.push(
    <div key="inspect-results-{query_name}">
      <h3>Inspect results for: {query_name}</h3>
      <HStack>
        <SelectRoot
          collection={columns}
          size="sm"
          width="320px"
          onValueChange={(event) => {
            setXColumn(event.value[0]);
          }}
        >
          <SelectLabel>Select x-Axis column</SelectLabel>
          <SelectTrigger>
            <SelectValueText placeholder="Select column name" />
          </SelectTrigger>
          <SelectContent>
            {columns.items.map((query) => (
              <SelectItem item={query} key={query.value}>
                {query.label}
              </SelectItem>
            ))}
          </SelectContent>
        </SelectRoot>

        <SelectRoot
          collection={columns}
          size="sm"
          width="320px"
          onValueChange={(event) => {
            setYColumn(event.value[0]);
          }}
        >
          <SelectLabel>Select y-Axis column</SelectLabel>
          <SelectTrigger>
            <SelectValueText placeholder="Select y-Axis column name" />
          </SelectTrigger>
          <SelectContent>
            {columns.items.map((query) => (
              <SelectItem item={query} key={query.value}>
                {query.label}
              </SelectItem>
            ))}
          </SelectContent>
        </SelectRoot>
      </HStack>
      <HStack>
        <SelectRoot
          collection={scales}
          size="sm"
          width="320px"
          onValueChange={(event) => {
            setXScale(event.value[0] as ScaleType);
          }}
          defaultValue={[xScale]}
        >
          <SelectLabel>Select x-Axis scale</SelectLabel>
          <SelectTrigger>
            <SelectValueText placeholder="Select scale" />
          </SelectTrigger>
          <SelectContent>
            {scales.items.map((scale) => (
              <SelectItem item={scale} key={scale.value}>
                {scale.label}
              </SelectItem>
            ))}
          </SelectContent>
        </SelectRoot>

        <SelectRoot
          collection={scales}
          size="sm"
          width="320px"
          onValueChange={(event) => {
            setYScale(event.value[0] as ScaleType);
          }}
          defaultValue={[yScale]}
        >
          <SelectLabel>Select y-Axis scale</SelectLabel>
          <SelectTrigger>
            <SelectValueText placeholder="Select scale" />
          </SelectTrigger>
          <SelectContent>
            {scales.items.map((scale) => (
              <SelectItem item={scale} key={scale.value}>
                {scale.label}
              </SelectItem>
            ))}
          </SelectContent>
        </SelectRoot>

      </HStack>
    </div>
  );

  if (xColumn != "" && yColumn != "" && data) {
    if(!Object.getOwnPropertyNames(data[0]).includes(xColumn)) {
      console.log("Column: ", xColumn, " does not exist")
      return;
    }
    if(!Object.getOwnPropertyNames(data[0]).includes(yColumn)) {
      console.log("Column: ", yColumn, " does not exist")
      return;
    }
    const sortedData = data.sort((a, b) => {
      if (typeof a[xColumn] === "number" && typeof b[xColumn] === "number") {
        return a[xColumn] - b[xColumn];
      }
      return a[xColumn].toString().localeCompare(b[xColumn].toString());
    })

    elements.push(
      <div className="d-flex flex-wrap justify-content-start my-3">
        <div
          className="mx-5"
          key={query_name + "-" + xColumn + "-" + yColumn}
          style={{ width: "100%", height: 300 }}
        >
          <ResponsiveContainer className="my-5">
            <LineChart
              margin={{ top: 15, right: 30, left: 20, bottom: 15 }}
              data={sortedData}
            >
              <Line
                yAxisId="1"
                type="monotone"
                dataKey={yColumn}
                stroke="#8884d8"
              />
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                  scale={xScale === "log" ? scaleSymlog : xScale}
                  type={typeof data[0][xColumn] === "number" ? "number" : "category"}
                  label={{
                    value: xColumn,
                    dy: 15
                  }}
                  ticks={["sqrt", "log"].includes(xScale) ? [10, 100, 1000, 10000] : undefined} // Fixed tick values}
                  dataKey={xColumn}
              />
              <YAxis 
                scale={yScale === "log" ? scaleSymlog : yScale}
                type="number"
                label={{
                  value: yColumn,
                  style: { textAnchor: 'middle' },
                  angle: -90,
                  position: 'left',
                  offset: 0,
                }}
                ticks={["sqrt", "log"].includes(yScale) ? [10, 100, 1000, 10000] : undefined} // Fixed tick values}
                orientation="left"
                yAxisId="1"
              />
              <Tooltip></Tooltip>
            </LineChart>
          </ResponsiveContainer>
          <ResponsiveContainer className="my-5">
            <ScatterChart
              margin={{ top: 15, right: 30, left: 20, bottom: 15 }}
            >
              <Scatter
                name="data"
                data={sortedData}
                fill="#8884d8"
                fillOpacity={0.6}
              />
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                scale={xScale}
                type="number"
                label={{
                  value: xColumn,
                  style: { textAnchor: 'middle' },
                  angle: 0,
                  dy: 15
                }}
                ticks={["sqrt", "log"].includes(xScale) ? [10, 100, 1000, 10000] : undefined} // Fixed tick values}
                dataKey={xColumn}
                //domain={[0,100]}
              />
              <YAxis
                scale={yScale}
                type="number"
                label={{
                  value: yColumn,
                  style: { textAnchor: 'middle' },
                  angle: -90,
                  position: 'left',
                  offset: 0,
                }}
                //ticks={["sqrt", "log"].includes(yScale) ? [10, 100, 1000, 10000] : undefined} // Fixed tick values}
                dataKey={yColumn}
              />
              <Tooltip></Tooltip>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }


  return <div className="my-5">{elements}</div>;
};

export default DataFrameView;
