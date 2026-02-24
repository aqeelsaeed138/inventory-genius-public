import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  change?: number;
  icon: LucideIcon;
  iconColor?: string;
}

const StatCard = ({ title, value, change, icon: Icon, iconColor = "gradient-primary" }: StatCardProps) => {
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;

  return (
    <div className="bg-card rounded-2xl p-6 shadow-card border border-border/50 hover:shadow-soft transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center", iconColor)}>
          <Icon className="h-6 w-6 text-primary-foreground" />
        </div>
        {change !== undefined && (
          <div
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
              isPositive && "bg-success/10 text-success",
              isNegative && "bg-destructive/10 text-destructive",
              !isPositive && !isNegative && "bg-muted text-muted-foreground"
            )}
          >
            {isPositive && <TrendingUp className="h-3 w-3" />}
            {isNegative && <TrendingDown className="h-3 w-3" />}
            <span>{Math.abs(change)}%</span>
          </div>
        )}
      </div>
      <p className="text-muted-foreground text-sm mb-1">{title}</p>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
};

export default StatCard;
