import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { TripProvider } from "@/context/TripContext";
import Index from "./pages/Index";
import AddExpensePage from "./pages/AddExpensePage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <TripProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/add" element={<AddExpensePage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TripProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
