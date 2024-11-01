import useAvailableQueries from "../../hooks/useAvailableQueries";
import { createListCollection } from "@chakra-ui/react";

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

  return (
    <div className="mx-5">
      <SelectRoot
        collection={collection}
        size="sm"
        width="320px"
        onValueChange={(event) => {
          setQueryName(event.value);
        }}
      >
        <SelectLabel>
          <h2>Query</h2>
        </SelectLabel>
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
      {queryName.length == 1 && <DataFrameView query_name={queryName[0]} />}
    </div>
  );
};

export default QueryView;
