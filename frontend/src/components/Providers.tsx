"use client";

import React, { useState } from "react";
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from "@tanstack/react-query";
import { Feedback } from "./Feedback";
import { notify } from "../lib/api";
import { AuthProvider } from "../context/AuthContext";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({onError:(error)=>notify(error.message)}),
        mutationCache: new MutationCache({onError:(error)=>notify(error.message)}),
        defaultOptions: {
          queries: {
            staleTime: 5000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}<Feedback /></AuthProvider>
    </QueryClientProvider>
  );
}
