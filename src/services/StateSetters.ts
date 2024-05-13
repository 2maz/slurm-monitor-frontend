import { MRT_ColumnFiltersState } from "material-react-table";
import { MRT_VisibilityState } from "material-react-table";
import React from "react";

export interface StateSetters {
  columnVisibility: [MRT_VisibilityState, React.Dispatch<React.SetStateAction<MRT_VisibilityState>>];
  columnFilters: [MRT_ColumnFiltersState, React.Dispatch<React.SetStateAction<MRT_ColumnFiltersState>>];
}
