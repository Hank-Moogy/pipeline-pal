import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Pipeline from "./pages/Pipeline";
import Agents from "./pages/Agents";
import LeadGen from "./pages/agents/LeadGen";
import PipelineAgent from "./pages/agents/PipelineAgent";
import CrmAgent from "./pages/agents/CrmAgent";
import SocialAgent from "./pages/agents/SocialAgent";
import OpenClaw from "./pages/agents/OpenClaw";
import OpenClawConfig from "./pages/agents/OpenClawConfig";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/pipeline" element={<Pipeline />} />
            <Route path="/agents" element={<Agents />} />
            <Route path="/agents/lead-gen" element={<LeadGen />} />
            <Route path="/agents/pipeline" element={<PipelineAgent />} />
            <Route path="/agents/crm" element={<CrmAgent />} />
            <Route path="/agents/social" element={<SocialAgent />} />
            <Route path="/agents/openclaw" element={<OpenClaw />} />
            <Route path="/agents/openclaw/config" element={<OpenClawConfig />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
