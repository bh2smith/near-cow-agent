"use client";
import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";

export default function Home() {
  return <SwaggerUI url="/.well-known/ai-plugin.json" />;
}
