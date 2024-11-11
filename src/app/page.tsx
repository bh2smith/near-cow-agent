"use client";

import dynamic from "next/dynamic";
import React from "react";
import "swagger-ui-react/swagger-ui.css";

// Dynamically import Swagger UI with loading component and no SSR
const SwaggerUI = dynamic(() => import("swagger-ui-react"), {
  ssr: false,
  loading: () => <div>Loading API documentation...</div>,
});

export default function Home() {
  return (
    <div className="min-h-screen p-8">
      <SwaggerUI url="/.well-known/ai-plugin.json" />
    </div>
  );
}
