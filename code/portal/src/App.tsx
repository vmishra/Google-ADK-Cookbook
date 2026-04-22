import { Home } from "@/pages/Home";
import { AgentPage } from "@/pages/AgentPage";
import { useRoute, useScrollReset } from "@/lib/router";

export default function App() {
  const route = useRoute();
  useScrollReset(route);

  if (route.startsWith("/a/")) {
    const id = route.slice("/a/".length);
    return <AgentPage id={id} />;
  }
  return <Home />;
}
