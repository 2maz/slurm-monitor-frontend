import useAvailableQueries from "../../hooks/useAvailableQueries";
import { createListCollection } from "@chakra-ui/react";
import { Tooltip } from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

import {
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectRoot,
  SelectTrigger,
  SelectValueText,
} from "../ui/select";
import { useState } from "react";
import DataFrameView from "./DataFrameView";
import GpuUtilizationView, { GPU_UTILIZATION_QUERY_NAME } from "./GpuUtilizationView";

const QueryView = () => {
  const [queryName, setQueryName] = useState<string[]>([]);

  const { data: queries } = useAvailableQueries();

  if (!queries) {
    return;
  }

  const availableQueries: { label: string; value: string }[] = [];
  queries.map((item) =>
    availableQueries.push({
      label: item,
      value: item,
    })
  );

  const collection = createListCollection({
    items: availableQueries,
  });

  const querySelect = (
    <SelectRoot
      collection={collection}
      size="sm"
      width="240px"
      // controlled, as the select remounts when moving into the GPU utilization view
      value={queryName}
      onValueChange={(event) => {
        setQueryName(event.value);
      }}
    >
      <SelectLabel>Query</SelectLabel>
      <SelectTrigger>
        <SelectValueText placeholder="Select query" />
      </SelectTrigger>
      <SelectContent>
        {collection.items.map((query) => (
          <SelectItem item={query} key={query.value}>
            {query.label}
          </SelectItem>
        ))}
      </SelectContent>
    </SelectRoot>
  );

  return (
    <div className="mx-5">
      <Tooltip title="This is an experimental view - Work in Progress">
        <h2>Usage Statistics <WarningAmberIcon className="mx-2"/> </h2>
      </Tooltip>
      {/* the GPU utilization view puts the query select in a row with its own controls */}
      {queryName[0] === GPU_UTILIZATION_QUERY_NAME ? (
        <GpuUtilizationView querySelect={querySelect} />
      ) : (
        <>
          {querySelect}
          {queryName.length == 1 && <DataFrameView query_name={queryName[0]} />}
        </>
      )}
    </div>
  );
};

export default QueryView;
