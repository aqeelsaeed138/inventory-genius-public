import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Lock, Eye, EyeOff, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { passwordSchema } from "@/lib/validations";
import FormField from "@/components/auth/FormField";
import PasswordStrengthIndicator from "@/components/auth/PasswordStrengthIndicator";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if this is a valid recovery session
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const type = hashParams.get("type");
    
    if (type === "recovery") {
      setIsValidSession(true);
      return;
    }

    // Also check for existing session with recovery event
    supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsValidSession(true);
      }
    });

    // Check if user has a valid session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsValidSession(true);
      } else {
        setIsValidSession(false);
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    // Validate password
    const result = passwordSchema.safeParse(password);
    if (!result.success) {
      setError(result.error.errors[0]?.message || "Invalid password");
      return;
    }

    if (password !== confirmPassword) {
      setConfirmError("Passwords do not match");
      return;
    }

    setSubmitting(true);
    setError("");
    setConfirmError("");

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        if (updateError.message.toLowerCase().includes("same password")) {
          setError("New password must be different from your current password.");
        } else {
          toast.error(updateError.message);
        }
      } else {
        setSuccess(true);
        toast.success("Password updated successfully!");
        // Redirect to dashboard after 3 seconds
        setTimeout(() => navigate("/dashboard", { replace: true }), 3000);
      }
    } catch (err) {
      toast.error("An unexpected error occurred. Please try again.");
      console.error("Password update error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state while checking session
  if (isValidSession === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Verifying reset link...</p>
        </div>
      </div>
    );
  }

  // Invalid or expired link
  if (!isValidSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <div className="w-full max-w-md">
          <Card className="border-border/50 shadow-lg">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle className="text-2xl">Invalid or expired link</CardTitle>
              <CardDescription className="text-base mt-2">
                This password reset link is invalid or has expired. Please request a new one.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button asChild className="w-full" size="lg">
                <Link to="/forgot-password">Request New Reset Link</Link>
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Remember your password?{" "}
                <Link to="/auth" className="text-primary font-medium hover:underline">
                  Sign in
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <div className="w-full max-w-md">
          <Card className="border-border/50 shadow-lg">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl">Password updated!</CardTitle>
              <CardDescription className="text-base mt-2">
                Your password has been successfully reset. Redirecting to dashboard...
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full" size="lg">
                <Link to="/dashboard">Go to Dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md">
        <Card className="border-border/50 shadow-lg">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 h-12 w-12 rounded-xl bg-primary flex items-center justify-center">
              <Package className="h-6 w-6 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl">Set new password</CardTitle>
            <CardDescription>
              Enter your new password below. Make sure it's strong and unique.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <FormField
                  label="New Password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError("");
                  }}
                  error={error || undefined}
                  icon={<Lock className="h-4 w-4" />}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  }
                  autoComplete="new-password"
                  disabled={submitting}
                  maxLength={128}
                />
                {password && <PasswordStrengthIndicator password={password} />}
              </div>

              <FormField
                label="Confirm Password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (confirmError) setConfirmError("");
                }}
                error={confirmError || undefined}
                icon={<Lock className="h-4 w-4" />}
                autoComplete="new-password"
                disabled={submitting}
                maxLength={128}
              />

              <Button 
                type="submit" 
                className="w-full" 
                disabled={submitting || !password || !confirmPassword}
                size="lg"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating password...
                  </>
                ) : (
                  "Update Password"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
