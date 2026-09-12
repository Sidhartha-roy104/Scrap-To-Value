import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ToastProvider } from "@/components/ToastNotification";
import { NotificationProvider } from "@/hooks/useNotifications";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Layout } from "@/components/Layout";
import Landing from "@/pages/Landing";
import Auth from "@/pages/Auth";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import Dashboard from "@/pages/Dashboard";
import Marketplace from "@/pages/Marketplace";
import Analytics from "@/pages/Analytics";
import GreenScore from "@/pages/GreenScore";
import Profile from "@/pages/Profile";
import Plans from "@/pages/Plans";
import Orders from "@/pages/Orders";
import OrderTracking from "@/pages/OrderTracking";
import NotFound from "@/pages/NotFound";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminOrders from "@/pages/admin/AdminOrders";
import AdminDisputes from "@/pages/admin/AdminDisputes";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminSellers from "@/pages/admin/AdminSellers";
import AdminBuyers from "@/pages/admin/AdminBuyers";
import AdminListings from "@/pages/admin/AdminListings";
import AdminInventory from "@/pages/admin/AdminInventory";
import AdminPayments from "@/pages/admin/AdminPayments";
import AdminFulfillment from "@/pages/admin/AdminFulfillment";
import AdminAnalytics from "@/pages/admin/AdminAnalytics";
import AdminActivityLogs from "@/pages/admin/AdminActivityLogs";
import AdminSettings from "@/pages/admin/AdminSettings";
import { AdminLayout } from "@/components/AdminLayout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ToastProvider>
      <AuthProvider>
        <NotificationProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/marketplace" element={<Marketplace />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/green-score" element={<GreenScore />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/plans" element={<Plans />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/my-orders" element={<Orders />} />
                <Route path="/orders/:orderId" element={<OrderTracking />} />
              </Route>
              {/* Dedicated Admin Console Layout & Protected Routes */}
              <Route element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminLayout />
                </ProtectedRoute>
              }>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/orders" element={<AdminOrders />} />
                <Route path="/admin/disputes" element={<AdminDisputes />} />
                <Route path="/admin/users" element={<AdminUsers />} />
                <Route path="/admin/sellers" element={<AdminSellers />} />
                <Route path="/admin/buyers" element={<AdminBuyers />} />
                <Route path="/admin/listings" element={<AdminListings />} />
                <Route path="/admin/inventory" element={<AdminInventory />} />
                <Route path="/admin/payments" element={<AdminPayments />} />
                <Route path="/admin/fulfillment" element={<AdminFulfillment />} />
                <Route path="/admin/analytics" element={<AdminAnalytics />} />
                <Route path="/admin/activity-logs" element={<AdminActivityLogs />} />
                <Route path="/admin/settings" element={<AdminSettings />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </NotificationProvider>
      </AuthProvider>
    </ToastProvider>
  </QueryClientProvider>
);

export default App;
