import DashboardLayout from "@/components/dashboard/DashboardLayout";
import StatCard from "@/components/dashboard/StatCard";
import SalesChart from "@/components/dashboard/SalesChart";
import RecentOrders from "@/components/dashboard/RecentOrders";
import LowStockAlert from "@/components/dashboard/LowStockAlert";
import TopProducts from "@/components/dashboard/TopProducts";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import { DollarSign, Package, ShoppingCart, Users, Loader2 } from "lucide-react";
import { useDashboardStats } from "@/hooks/useCompanyData";
import { useDashboardStatsWithChange } from "@/hooks/useDashboardData";
import { usePermissions } from "@/hooks/useRoleAccess";
import { useCompany } from "@/contexts/CompanyContext";

const Dashboard = () => {
  const { data: dashboardStats, isLoading } = useDashboardStats();
  const { data: changeStats } = useDashboardStatsWithChange();
  const { canViewRevenue, isLoading: permissionsLoading } = usePermissions();
  const { formatPrice } = useCompany();

  const stats = [
    // Only show revenue to owners
    ...(canViewRevenue ? [{
      title: "Total Revenue",
      value: dashboardStats ? formatPrice(dashboardStats.totalRevenue) : formatPrice(0),
      change: changeStats?.revenueChange,
      icon: DollarSign,
      iconColor: "gradient-primary",
    }] : []),
    {
      title: "Total Products",
      value: dashboardStats?.totalProducts?.toLocaleString() || "0",
      icon: Package,
      iconColor: "gradient-accent",
    },
    {
      title: "Total Orders",
      value: dashboardStats?.totalOrders?.toLocaleString() || "0",
      change: changeStats?.ordersChange,
      icon: ShoppingCart,
      iconColor: "bg-warning",
    },
    {
      title: "Total Customers",
      value: dashboardStats?.totalCustomers?.toLocaleString() || "0",
      icon: Users,
      iconColor: "bg-success",
    },
  ];

  return (
    <DashboardLayout
      title="Dashboard"
      description="Welcome back! Here's what's happening with your business."
    >
      {isLoading || permissionsLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className={`grid grid-cols-1 md:grid-cols-2 ${canViewRevenue ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-4 md:gap-6 mb-6 md:mb-8`}>
            {stats.map((stat) => (
              <StatCard key={stat.title} {...stat} />
            ))}
          </div>

          {/* Charts Row */}
          <div className="grid lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
            <div className="lg:col-span-2">
              <SalesChart />
            </div>
            <LowStockAlert />
          </div>

          {/* Bottom Row */}
          <div className="grid lg:grid-cols-3 gap-4 md:gap-6">
            <div className="lg:col-span-2">
              <RecentOrders />
            </div>
            {canViewRevenue ? <TopProducts /> : <ActivityFeed />}
          </div>

          {/* Activity Feed for Owners */}
          {canViewRevenue && (
            <div className="mt-6 md:mt-8">
              <ActivityFeed />
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
};

export default Dashboard;
