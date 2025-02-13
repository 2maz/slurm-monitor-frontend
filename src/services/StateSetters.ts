import { MRT_ColumnFiltersState } from "material-react-table";
import { MRT_VisibilityState } from "material-react-table";
import { Dispatch, SetStateAction } from "react";

export interface StateSetters {
  columnVisibility: [MRT_VisibilityState, Dispatch<SetStateAction<MRT_VisibilityState>>];
  columnFilters: [MRT_ColumnFiltersState, Dispatch<SetStateAction<MRT_ColumnFiltersState>>];
}