import { QueryCache, QueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { createElement } from 'react';

export type SimpleQueryOptions = {
    // By default, 5xx errors trigger the error boundary (see below), while 4xx and others
    // are returned normally to the caller. This can be set to force all errors to a specific
    // behaviour.
    useErrorBoundary?: boolean;
    refetchInterval?: number;
};

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 10,
            //useErrorBoundary: false, //(error) => (normalizeError(error).status ?? 500) >= 500,
        },
    },
    queryCache: new QueryCache({
        onError: (error, _query) => {
            console.error(error);
            /* Possible to:
            // only show error toasts if we already have data in the cache
            // which indicates a failed background update
            if (query.state.data === undefined)
                return;
            */
            notifications.show({
                title: 'Something went wrong',
                message: `${error.message}`,
                color: 'red',
                //icon: createElement(IconX), // jsx: <IconX />
            });
        },
    }),
});