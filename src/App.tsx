import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

import { queryClient } from './app/client';
import { PropsWithChildren } from 'react';
import { MantineProvider } from '@mantine/core';
import { ColorScheme, ColorSchemeProvider } from '@mantine/types'
import { useColorScheme, useLocalStorage } from '@mantine/hooks';
import { ModalsProvider } from '@mantine/modals';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
//import routes from './routes.tsx';
//
//import { UiDecorators } from './decorators.tsx';
import JobList from './components/JobList';

function App() {
  const [count, setCount] = useState(0)

  const baseUrl = "http://srl-login3.ex3.simula.no:12000/api/v1/monitor/"

  return (
    <>
        <JobList baseUrl={baseUrl} />
    </>
  )
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