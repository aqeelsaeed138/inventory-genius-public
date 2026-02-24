import { cn } from "@/lib/utils";
import { getPasswordStrength } from "@/lib/validations";
import { Check, X } from "lucide-react";

interface PasswordStrengthIndicatorProps {
  password: string;
}

const requirements = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "1 uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "1 lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "1 number", test: (p: string) => /[0-9]/.test(p) },
  { label: "1 special character", test: (p: string) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
];

const PasswordStrengthIndicator = ({ password }: PasswordStrengthIndicatorProps) => {
  const strength = getPasswordStrength(password);
  
  if (!password) return null;
  
  return (
    <div className="mt-2 space-y-2">
      {/* Strength bar */}
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              strength.score >= level * 1.5 ? strength.color : "bg-muted"
            )}
          />
        ))}
      </div>
      
      {/* Strength label */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Password strength:</span>
        <span className={cn(
          "font-medium capitalize",
          strength.label === "weak" && "text-destructive",
          strength.label === "fair" && "text-orange-500",
          strength.label === "good" && "text-yellow-500",
          strength.label === "strong" && "text-green-500"
        )}>
          {strength.label}
        </span>
      </div>
      
      {/* Requirements checklist */}
      <div className="grid grid-cols-2 gap-1 text-xs">
        {requirements.map((req) => {
          const passed = req.test(password);
          return (
            <div
              key={req.label}
              className={cn(
                "flex items-center gap-1.5",
                passed ? "text-green-600" : "text-muted-foreground"
              )}
            >
              {passed ? (
                <Check className="h-3 w-3" />
              ) : (
                <X className="h-3 w-3" />
              )}
              {req.label}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PasswordStrengthIndicator;
