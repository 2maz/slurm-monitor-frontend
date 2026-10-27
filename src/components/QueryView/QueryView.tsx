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
import useUrlParam, { setUrlParams } from "../../hooks/useUrlParam";
import DataFrameView from "./DataFrameView";
import UtilizationView, { CPU_UTILIZATION_QUERY_NAME, GPU_UTILIZATION_QUERY_NAME } from "./UtilizationView";
import AllocationView from "./AllocationView";
import { ALLOCATION_QUERIES, GPU_ALLOCATION_QUERY_NAME } from "./Allocation";

const UTILIZATION_QUERIES = [GPU_UTILIZATION_QUERY_NAME, CPU_UTILIZATION_QUERY_NAME];

const QueryView = () => {
  // in the URL, like the settings of the utilization views
  const [query, setQuery] = useUrlParam("query", "");
  const queryName = query ? [query] : [];

  const { data: queries } = useAvailableQueries();

  if (!queries) {
    return;
  }

  // The allocation queries share one item, whose view switches between them.
  const availableQueries: { label: string; value: string }[] = [];
  queries.map((item) => {
    if (!ALLOCATION_QUERIES.includes(item))
      availableQueries.push({ label: item, value: item });
    else if (item === GPU_ALLOCATION_QUERY_NAME || !queries.includes(GPU_ALLOCATION_QUERY_NAME))
      availableQueries.push({ label: "allocation", value: ALLOCATION_QUERIES.includes(query) ? query : item });
  });

  const collection = createListCollection({
    items: availableQueries,
  });

  const querySelect = (
    <SelectRoot
      collection={collection}
      size="sm"
      width="240px"
      // controlled, as the select remounts when moving into a utilization view
      value={queryName}
      onValueChange={(event) => {
        // drops the previous query's settings from the URL, so the new one starts from its defaults
        setUrlParams({}, { only: ["view", "cluster"] });
        setQuery(event.value[0] ?? "");
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
      {/* the utilization and allocation views put the query select in a row with their own controls */}
      {UTILIZATION_QUERIES.includes(queryName[0]) ? (
        // keyed, so that switching between them starts over with the new view's defaults
        <UtilizationView key={queryName[0]} queryName={queryName[0]} querySelect={querySelect} />
      ) : ALLOCATION_QUERIES.includes(queryName[0]) ? (
        <AllocationView key={queryName[0]} queryName={queryName[0]} querySelect={querySelect} onQueryName={setQuery} />
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
