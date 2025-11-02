import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import AdminRoute from "./components/auth/AdminRoute";
import Login from "./pages/Login";
import UserDashboard from "./pages/UserDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import AdminRequests from "./pages/AdminRequests";
import AdminKafka from "./pages/AdminKafka";
import AdminAudit from "./pages/AdminAudit";
import RequestTopic from "./pages/RequestTopic";
import RequestACL from "./pages/RequestACL";
import RequestHistory from "./pages/RequestHistory";
import RequestDetails from "./pages/RequestDetails";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<UserDashboard />} />
            <Route path="/request/topic" element={<RequestTopic />} />
            <Route path="/request/acl" element={<RequestACL />} />
            <Route path="/requests" element={<RequestHistory />} />
            <Route path="/requests/:id" element={<RequestDetails />} />
            <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/admin/requests" element={<AdminRoute><AdminRequests /></AdminRoute>} />
            <Route path="/admin/kafka" element={<AdminRoute><AdminKafka /></AdminRoute>} />
            <Route path="/admin/audit" element={<AdminRoute><AdminAudit /></AdminRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
