"use client";

import dynamic from "next/dynamic";
import React from "react";
import "swagger-ui-react/swagger-ui.css";

// Suppress UNSAFE_ error from swagger-ui:
// https://github.com/swagger-api/swagger-ui/discussions/8592
const originalError = console.error;
console.error = (...args) => {
  if (args[0]?.includes("UNSAFE_")) return;
  if (args[0]?.includes("Warning: Received `true` for a non-boolean attribute"))
    return;
  if (args[0]?.includes("hydration")) return;
  originalError.call(console, ...args);
};

// Add a test button component
function TestButton() {
  const testMiddleware = async () => {
    try {
      const response = await fetch("/api/health", {
        headers: {
          "mb-metadata": JSON.stringify({ accountId: "test.near" }),
        },
      });
      const data = await response.json();
      console.log("Response:", data);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  return (
    <button
      onClick={testMiddleware}
      className="px-4 py-2 bg-blue-500 text-white rounded mb-4"
    >
      Test Middleware
    </button>
  );
}

// Dynamically import Swagger UI with loading component and no SSR
const SwaggerUI = dynamic(() => import("swagger-ui-react"), {
  ssr: false,
  loading: () => <div>Loading API documentation...</div>,
});

export default function Home() {
  return (
    <div className="min-h-screen p-8">
      <TestButton />
      <SwaggerUI url="/.well-known/ai-plugin.json" />
    </div>
  );
}
