"use client";

import { ChakraProvider, extendTheme } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

const theme = extendTheme({
  colors: {
    brand: {
      50: "#eff7f0",
      100: "#d8eadb",
      500: "#39845a",
      600: "#256544",
      700: "#194c35",
      900: "#112f22",
    },
    amber: {
      500: "#edae43",
      600: "#d9952b",
    },
  },
  fonts: {
    heading: "Arial, Helvetica, sans-serif",
    body: "Arial, Helvetica, sans-serif",
  },
  styles: {
    global: {
      body: {
        bg: "#fbfaf6",
        color: "#24352c",
      },
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60_000, retry: 1 },
        },
      }),
  );

  return (
    <ChakraProvider theme={theme}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </ChakraProvider>
  );
}
