import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Activity } from "lucide-react";
import { useActivityLogs, formatActivityMessage } from "@/hooks/useActivityLog";
import { formatDistanceToNow } from "date-fns";

const ActivityFeed = () => {
  const { data: logs, isLoading } = useActivityLogs(10);

  const getActivityIcon = (action: string) => {
    const icons: Record<string, string> = {
      product_created: "📦",
      product_updated: "✏️",
      order_created: "🛒",
      purchase_order_created: "📋",
      purchase_order_received: "✅",
      customer_created: "👤",
      category_created: "📁",
      supplier_created: "🚚",
      stock_adjusted: "📊",
      employee_added: "👥",
      settings_updated: "⚙️",
    };
    return icons[action] || "📌";
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : !logs?.length ? (
          <p className="text-muted-foreground text-center py-8">
            No recent activity
          </p>
        ) : (
          <div className="space-y-4">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-3">
                <div className="text-xl">{getActivityIcon(log.action)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">
                      {(log as any).user?.full_name || "A team member"}
                    </span>{" "}
                    {formatActivityMessage(log)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ActivityFeed;