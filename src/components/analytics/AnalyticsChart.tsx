import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { TrendingUp, TrendingDown, DollarSign, Package, AlertCircle } from "lucide-react";

interface AnalyticsChartProps {
  title: string;
  data: Array<{ month: string; sales?: number; revenue?: number; quantity?: number; cost?: number }>;
  type?: "line" | "bar";
  dataKey?: string;
  color?: string;
}

export const AnalyticsChart = ({ 
  title, 
  data, 
  type = "line",
  dataKey = "revenue",
  color = "hsl(var(--primary))"
}: AnalyticsChartProps) => {
  if (!data.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <AlertCircle className="h-8 w-8 mb-2" />
            <p>No data available yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatMonth = (month: string) => {
    const [year, m] = month.split('-');
    const date = new Date(parseInt(year), parseInt(m) - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  };

  const formattedData = data.map(d => ({
    ...d,
    month: formatMonth(d.month),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            {type === "line" ? (
              <LineChart data={formattedData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey={dataKey} 
                  stroke={color}
                  strokeWidth={2}
                  dot={{ fill: color }}
                />
              </LineChart>
            ) : (
              <BarChart data={formattedData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Bar dataKey="sales" fill="hsl(var(--primary))" name="Sales" />
                <Bar dataKey="revenue" fill="hsl(var(--accent))" name="Revenue" />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

interface StatCardProps {
  title: string;
  value: string | number;
  trend?: number;
  icon?: React.ReactNode;
  format?: "currency" | "number" | "percent";
}

export const AnalyticsStatCard = ({ title, value, trend, icon, format = "number" }: StatCardProps) => {
  const formatValue = () => {
    if (format === "currency") {
      return typeof value === "number" ? `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : value;
    }
    if (format === "percent") {
      return typeof value === "number" ? `${value.toFixed(1)}%` : value;
    }
    return typeof value === "number" ? value.toLocaleString() : value;
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{formatValue()}</p>
            {trend !== undefined && (
              <div className={`flex items-center mt-1 text-sm ${trend >= 0 ? 'text-success' : 'text-destructive'}`}>
                {trend >= 0 ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
                {Math.abs(trend).toFixed(1)}%
              </div>
            )}
          </div>
          {icon && (
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

interface NoDataMessageProps {
  title?: string;
  message?: string;
}

export const NoDataMessage = ({ 
  title = "No Analytics Data",
  message = "Start making sales to see analytics here"
}: NoDataMessageProps) => {
  return (
    <Card className="border-dashed">
      <CardContent className="py-12">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <TrendingUp className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg mb-1">{title}</h3>
          <p className="text-muted-foreground max-w-sm">{message}</p>
        </div>
      </CardContent>
    </Card>
  );
};
