import { useEffect, useState } from "react";
import useDataFrameQuery from "../../hooks/useDataFrameQuery";
import { BarLoader } from "react-spinners";

import { createListCollection, HStack } from "@chakra-ui/react";

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
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface Props {
  query_name: string;
}
const DataFrameView = ({ query_name }: Props) => {
  const { data, isLoading, error } = useDataFrameQuery(query_name);
  const [xColumn, setXColumn] = useState("");
  const [yColumn, setYColumn] = useState("");

  useEffect(() => {
    setXColumn("");
    setYColumn("");
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
    </div>
  );

  if (xColumn != "" && yColumn != "" && data) {
    let sortedData = undefined;
    if (data[0][xColumn] === undefined) {
      return;
    }

    sortedData = data.sort((a, b) => {
      if (typeof a[xColumn] === "number") {
        return a[xColumn] - b[xColumn];
      }
      return a[xColumn].toString().localeCompare(b[xColumn].toString());
    });

    elements.push(
      <div className="d-flex flex-wrap justify-content-start my-3">
        <div
          className="mx-5"
          key={query_name + "-" + xColumn + "-" + yColumn}
          style={{ width: "100%", height: 300 }}
        >
          <ResponsiveContainer>
            <LineChart
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              data={sortedData}
            >
              <Line
                yAxisId="1"
                type="monotone"
                dataKey={yColumn}
                stroke="#8884d8"
              />
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xColumn} />
              <YAxis orientation="left" yAxisId="1" />
              <Tooltip></Tooltip>
              <Legend></Legend>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  return <div className="my-5">{elements}</div>;
};

export default DataFrameView;
