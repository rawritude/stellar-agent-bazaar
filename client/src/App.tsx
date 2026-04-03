import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { GameProvider } from "@/lib/gameContext";
import GamePage from "@/pages/game";
import TerminalPage from "@/pages/terminal";
import NotFound from "@/pages/not-found";

function AppRouter() {
  return (
    <Router hook={useHashLocation}>
      <Switch>
        <Route path="/" component={TerminalPage} />
        <Route path="/dashboard" component={GamePage} />
        <Route component={NotFound} />
      </Switch>
    </Router>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <GameProvider>
        <AppRouter />
        <Toaster />
      </GameProvider>
    </QueryClientProvider>
  );
}

export default App;
