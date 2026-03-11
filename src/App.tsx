import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CompanyProvider } from "@/contexts/CompanyContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import Products from "./pages/Products";
import ProductDetails from "./pages/ProductDetails";
import Categories from "./pages/Categories";
import CategoryDetails from "./pages/CategoryDetails";
import Suppliers from "./pages/Suppliers";
import SupplierDetails from "./pages/SupplierDetails";
import Customers from "./pages/Customers";
import Orders from "./pages/Orders";
import CreateOrder from "./pages/CreateOrder";
import OrderDetails from "./pages/OrderDetails";
import PurchaseOrders from "./pages/PurchaseOrders";
import CreatePurchaseOrder from "./pages/CreatePurchaseOrder";
import PurchaseOrderDetails from "./pages/PurchaseOrderDetails";
import CompanySetup from "./pages/CompanySetup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
  <AuthProvider>
      <CompanyProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/company-setup" element={<ProtectedRoute><CompanySetup /></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
              <Route path="/products/:id" element={<ProtectedRoute><ProductDetails /></ProtectedRoute>} />
              <Route path="/categories" element={<ProtectedRoute><Categories /></ProtectedRoute>} />
              <Route path="/categories/:id" element={<ProtectedRoute><CategoryDetails /></ProtectedRoute>} />
              <Route path="/suppliers" element={<ProtectedRoute><Suppliers /></ProtectedRoute>} />
              <Route path="/suppliers/:id" element={<ProtectedRoute><SupplierDetails /></ProtectedRoute>} />
              <Route path="/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
              <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
              <Route path="/orders/create" element={<ProtectedRoute><CreateOrder /></ProtectedRoute>} />
              <Route path="/orders/:id" element={<ProtectedRoute><OrderDetails /></ProtectedRoute>} />
              <Route path="/purchase-orders" element={<ProtectedRoute><PurchaseOrders /></ProtectedRoute>} />
              <Route path="/purchase-orders/create" element={<ProtectedRoute><CreatePurchaseOrder /></ProtectedRoute>} />
              <Route path="/purchase-orders/:id" element={<ProtectedRoute><PurchaseOrderDetails /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </CompanyProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
