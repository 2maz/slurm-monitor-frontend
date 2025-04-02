import { Updater } from "@tanstack/table-core"
import { MRT_ColumnFiltersState, MRT_VisibilityState } from "material-react-table";
import { create as createZustand } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware";
import { mountStoreDevtool } from 'simple-zustand-devtools'
import { DateTime } from "luxon";

interface TableState {
  columnFilters: MRT_ColumnFiltersState,
  visibility: MRT_VisibilityState;
  setColumnFilters: (x: Updater<MRT_ColumnFiltersState>) => void;
  setVisibility: (x: Updater<MRT_VisibilityState>) => void;
}

export default TableState

const createTableStore = (storeName: string, visibility: MRT_VisibilityState = {}) => createZustand<TableState>()(
    persist(
      (set) => ({
        columnFilters: [] as MRT_ColumnFiltersState,
        visibility: visibility,
        setColumnFilters: (x) => {
          if (typeof x !== 'function') {
            set((state) => ({...state, columnFilters: x}))
          } else {
            set(
              (state) => {
                const updatedFilters = x(state.columnFilters).map((value) => {
                  if(value['id'].includes("_time")) {
                    const minmax = value['value']
                    if(Array.isArray(minmax)) {
                      if(!minmax[0] || !(minmax[0] as DateTime).isValid)
                      {
                        minmax[0] = ''
                      }
                      if(!minmax[1] || !(minmax[1] as DateTime).isValid)
                      {
                        minmax[1] = ''
                      }
                    }
                  }
                  return value
                })
                return ({
                    ...state,
                    columnFilters: updatedFilters
                })
              }
            )
          }
        },
        setVisibility: (x) => {
          if (typeof x !== 'function') {
            set((state) => (({...state, visibility: x})))
          } else {
            set((state) => (({...state, visibility: x(state.visibility)})))

          }
        }
      }),
      {
        name: storeName,
        storage: createJSONStorage(() => sessionStorage),
      },
  )
)

export const useNodesStore = createTableStore("nodes-table-store", {
            alloc_cpus: false,
            cores: false,
            alloc_memory: false, // only getting zeros here
        }
)
export const useJobsStore = createTableStore("jobs-table-store")
export const useCompletedJobsStore = createTableStore("completed-jobs-table-store")
export const usePartitionsStore = createTableStore("partitions-table-store")


if(process.env.NODE_ENV === 'development'){
  mountStoreDevtool('JobStore', useJobsStore)
}