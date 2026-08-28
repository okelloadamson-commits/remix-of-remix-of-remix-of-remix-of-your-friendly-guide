import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import App from "@/App";

export const Route = createFileRoute("/")({
  component: Page,
});

function Page() {
  return (
    <ClientOnly fallback={<div style={{ minHeight: "100vh", background: "hsl(240 10% 4%)" }} />}>
      <App />
    </ClientOnly>
  );
}
