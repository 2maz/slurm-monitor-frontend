import { useEffect, useState } from "react";
import "./App.css";

import { Box, MantineProvider, Paper, createTheme } from "@mantine/core";

import { BottomNavigation, BottomNavigationAction } from "@mui/material";
import SegmentIcon from "@mui/icons-material/Segment";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import DirectionsRunsTwoToneIcon from "@mui/icons-material/DirectionsRunTwoTone";

import { MRT_ColumnFiltersState } from "material-react-table";
import JobsView from "./components/JobsView";
import PartitionsView from "./components/PartitionsView";

import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterLuxon } from "@mui/x-date-pickers/AdapterLuxon";
import NodesView from "./components/NodesView";

const theme = createTheme({});

function App() {
  const [view, setView] = useState<string>(
    window.sessionStorage.getItem("view") || "jobs"
  );

  const [jobsFilter, setJobsFilter] = useState<MRT_ColumnFiltersState>([]);
  const [nodesFilter, setNodesFilter] = useState<MRT_ColumnFiltersState>([]);
  const [partitionsFilter, setPartitionsFilter] =
    useState<MRT_ColumnFiltersState>([]);

  useEffect(() => {
    document.title = "ex3 - Status: " + view;
  });

  const selectView = (name: string) => {
    setView(name);
    window.sessionStorage.setItem("view", name);
  };

  return (
    <>
      <LocalizationProvider dateAdapter={AdapterLuxon} adapterLocale="no">
        <MantineProvider theme={theme}>
          <Box sx={{ pb: 7 }}>
            <Paper
              sx={{ position: "fixed", bottom: 0, left: 0, right: 0 }}
              elevation={3}
            >
              <BottomNavigation showLabels value={view}>
                <BottomNavigationAction
                  label="Partitions"
                  icon={<SegmentIcon />}
                  onClick={() => selectView("partitions")}
                />
                <BottomNavigationAction
                  label="Nodes"
                  icon={<AccountTreeIcon />}
                  onClick={() => selectView("nodes")}
                />
                <BottomNavigationAction
                  label="Jobs"
                  icon={<DirectionsRunsTwoToneIcon />}
                  onClick={() => selectView("jobs")}
                />
              </BottomNavigation>
            </Paper>
            {view && view == "jobs" && (
              <JobsView
                columnFilters={jobsFilter}
                setColumnFilters={setJobsFilter}
              />
            )}
            {view && view == "nodes" && (
              <NodesView
                columnFilters={nodesFilter}
                setColumnFilters={setNodesFilter}
              />
            )}
            {view && view == "partitions" && (
              <PartitionsView
                columnFilters={partitionsFilter}
                setColumnFilters={setPartitionsFilter}
              />
            )}
          </Box>
        </MantineProvider>
      </LocalizationProvider>
    </>
  );
}

export default App;
