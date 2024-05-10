import { useState } from "react";
import "./App.css";

import {
  Box,
  MantineProvider,
  Paper,
  createTheme,
} from "@mantine/core";

import PartitionList from "./components/PartitionsList";
import NodeList from "./components/NodeList";
import { BottomNavigation, BottomNavigationAction } from "@mui/material";
import SegmentIcon from "@mui/icons-material/Segment";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import DirectionsRunsTwoToneIcon from "@mui/icons-material/DirectionsRunTwoTone";


import "@mantine/core/styles.css";
import "@mantine/dates/styles.css"; //if using mantine date picker features
import "mantine-react-table/styles.css"; //make sure MRT styles were imported in your app root (once)
import JobsView from "./components/JobsView";

const theme = createTheme({});

function App() {
  const [value, setValue] = useState<string>("jobs");
  const baseUrl = "http://srl-login3.ex3.simula.no:12000/api/v1/monitor/";

  return (
    <>
      <MantineProvider theme={theme}>
        <Box sx={{ pb: 7 }}>
          <Paper
            sx={{ position: "fixed", bottom: 0, left: 0, right: 0 }}
            elevation={3}
          >
            <BottomNavigation
              showLabels
              value={value}
              onChange={(event, newValue) => {
                setValue(newValue);
              }}
            >
              <BottomNavigationAction
                label="Partitions"
                icon={<SegmentIcon />}
                onClick={() => setValue("partitions")}
              />
              <BottomNavigationAction
                label="Nodes"
                icon={<AccountTreeIcon />}
                onClick={() => setValue("nodes")}
              />
              <BottomNavigationAction
                label="Jobs"
                icon={<DirectionsRunsTwoToneIcon />}
                onClick={() => setValue("jobs")}
              />
            </BottomNavigation>
          </Paper>
          {value && value == "jobs" && <JobsView />}
          {value && value == "nodes" && <NodeList baseUrl={baseUrl} />}
          {value && value == "partitions" && (
            <PartitionList baseUrl={baseUrl} />
          )}
        </Box>
      </MantineProvider>
    </>
  );
}

export default App;