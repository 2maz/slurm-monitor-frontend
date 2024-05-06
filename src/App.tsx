import { useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";

import { queryClient } from "./app/client";
import { PropsWithChildren } from "react";
import { Box, MantineProvider, Paper } from "@mantine/core";
import { ColorScheme, ColorSchemeProvider } from "@mantine/types";
import { useColorScheme, useLocalStorage } from "@mantine/hooks";
import { ModalsProvider } from "@mantine/modals";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
//import routes from './routes.tsx';
//
//import { UiDecorators } from './decorators.tsx';
import JobList from "./components/JobList";
import PartitionList from "./components/PartitionsList";
import NodeList from "./components/NodeList";
import { BottomNavigation, BottomNavigationAction } from "@mui/material";
import SegmentIcon from "@mui/icons-material/Segment";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import DirectionsRunsTwoToneIcon from "@mui/icons-material/DirectionsRunTwoTone";

function App() {
  const [value, setValue] = useState<string>("jobs");
  const baseUrl = "http://srl-login3.ex3.simula.no:12000/api/v1/monitor/";

  return (
    <>
      <MantineProvider>
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
          {value && value == "jobs" && <JobList baseUrl={baseUrl} />}
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

//export function UiProviders(props: PropsWithChildren) {
//  const systemColorscheme = useColorScheme();
//  const [colorScheme, setColorScheme] = useLocalStorage<ColorScheme>({
//      key: 'colorscheme',
//      defaultValue: systemColorscheme,
//      getInitialValueInEffect: false,
//  });
//  const toggleColorScheme = () => setColorScheme(colorScheme === 'dark' ? 'light' : 'dark');
//
//  return (
//      <ColorSchemeProvider colorScheme={colorScheme} toggleColorScheme={toggleColorScheme}>
//          <MantineProvider
//              withNormalizeCSS
//              withGlobalStyles
//              theme={{
//                  colorScheme: colorScheme,
//                  components: {
//                      Button: {
//                          defaultProps: {
//                              variant: 'outline',
//                          },
//                      },
//                  },
//              }}
//          >
//              <ModalsProvider>{props.children}</ModalsProvider>
//          </MantineProvider>
//      </ColorSchemeProvider>
//  );
//}
//
//export default function App() {
//  return (
//      <QueryClientProvider client={queryClient}>
//          <UiProviders>
//              <RouterProvider router={createBrowserRouter(routes)} />
//              <UiDecorators />
//          </UiProviders>
//      </QueryClientProvider>
//  );
//}
