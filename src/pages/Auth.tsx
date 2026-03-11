import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Mail, Lock, User, ArrowLeft, Eye, EyeOff, Loader2, WifiOff, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { 
  signUpSchema, 
  signInSchema, 
  validateForm, 
  getNetworkErrorMessage 
} from "@/lib/validations";
import FormField from "@/components/auth/FormField";
import PasswordStrengthIndicator from "@/components/auth/PasswordStrengthIndicator";
import useNetworkStatus from "@/hooks/useNetworkStatus";
import { Alert, AlertDescription } from "@/components/ui/alert";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, profile, loading, profileLoading, signUp, signIn } = useAuth();
  const { isOnline, isSlowConnection } = useNetworkStatus();
  
  const [isSignUp, setIsSignUp] = useState(searchParams.get("mode") === "signup");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  
  // Refs for cleanup
  const abortControllerRef = useRef<AbortController | null>(null);
  const submitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setIsSignUp(searchParams.get("mode") === "signup");
    // Reset errors when switching modes
    setErrors({});
    setTouchedFields(new Set());
  }, [searchParams]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      if (submitTimeoutRef.current) {
        clearTimeout(submitTimeoutRef.current);
      }
    };
  }, []);

  // Redirect if already logged in (wait for profile to load)
  useEffect(() => {
    if (user && !loading && !profileLoading) {
      if (profile?.company_id) {
        navigate("/dashboard", { replace: true });
      } else {
        navigate("/company-setup", { replace: true });
      }
    }
  }, [user, profile, loading, profileLoading, navigate]);

  // Real-time validation on blur
  const handleBlur = useCallback((field: string) => {
    setTouchedFields(prev => new Set(prev).add(field));
    
    // Validate single field
    const schema = isSignUp ? signUpSchema : signInSchema;
    const result = validateForm(schema, formData);
    
    if (result.success) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    } else if (result.success === false) {
      const validationErrors = result.errors;
      const fieldError = validationErrors[field];
      if (fieldError) {
        setErrors(prev => ({ ...prev, [field]: fieldError }));
      } else {
        setErrors(prev => {
          const next = { ...prev };
          delete next[field];
          return next;
        });
      }
    }
  }, [formData, isSignUp]);

  // Debounced input handler
  const handleInputChange = useCallback((field: string, value: string) => {
    // Trim email, allow spaces in name
    const trimmedValue = field === "email" ? value.trim() : value;
    
    setFormData(prev => ({ ...prev, [field]: trimmedValue }));
    
    // Clear error when user starts typing (if field was touched)
    if (touchedFields.has(field) && errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }, [touchedFields, errors]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission
    if (submitting) return;
    
    // Check network status
    if (!isOnline) {
      toast.error("No internet connection. Please check your connection and try again.");
      return;
    }

    // Validate form
    const schema = isSignUp ? signUpSchema : signInSchema;
    const validationResult = validateForm(schema, formData);
    
    if (validationResult.success === false) {
      const validationErrors = validationResult.errors;
      setErrors(validationErrors);
      setTouchedFields(new Set(Object.keys(validationErrors)));
      toast.error("Please fix the errors before submitting");
      return;
    }
    
    setSubmitting(true);
    setErrors({});

    // Set up abort controller for request cancellation
    abortControllerRef.current = new AbortController();
    
    // Set timeout for slow requests
    submitTimeoutRef.current = setTimeout(() => {
      if (submitting) {
        toast.warning("This is taking longer than expected. Please wait...");
      }
    }, 5000);

    try {
      if (isSignUp) {
        const { error } = await signUp(formData.email, formData.password, formData.fullName);
        
        if (error) {
          const errorMsg = error.message?.toLowerCase() || "";
          
          if (errorMsg.includes("already registered") || errorMsg.includes("already been registered")) {
            setErrors({ email: "This email is already registered. Please sign in instead." });
            toast.error("An account with this email already exists. Please sign in.");
          } else if (errorMsg.includes("invalid email") || errorMsg.includes("unable to validate")) {
            setErrors({ email: "Please enter a valid email address." });
            toast.error("Invalid email address.");
          } else if (errorMsg.includes("password") && (errorMsg.includes("weak") || errorMsg.includes("short") || errorMsg.includes("length"))) {
            setErrors({ password: "Password is too weak. Use at least 6 characters." });
            toast.error("Password is too weak.");
          } else if (errorMsg.includes("rate limit") || errorMsg.includes("too many requests")) {
            toast.error("Too many attempts. Please wait a moment and try again.");
          } else {
            const message = getNetworkErrorMessage(error);
            toast.error(message);
          }
        } else {
          toast.success("A confirmation link has been sent to your email. Please check your inbox to verify your account.", { duration: 6000 });
        }
      } else {
        const { error } = await signIn(formData.email, formData.password);
        
        if (error) {
          const message = getNetworkErrorMessage(error);
          toast.error(message);
          
          if (error.message.includes("Invalid login") || error.message.includes("Invalid credentials")) {
            setErrors({ 
              email: " ",
              password: "Invalid email or password" 
            });
          }
        } else {
          toast.success("Welcome back!");
        }
      }
    } catch (error) {
      const message = getNetworkErrorMessage(error);
      toast.error(message);
      console.error("Auth error:", error);
    } finally {
      setSubmitting(false);
      if (submitTimeoutRef.current) {
        clearTimeout(submitTimeoutRef.current);
      }
    }
  };

  // Show loading while checking auth state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        {/* Network Status Alerts */}
        {!isOnline && (
          <Alert variant="destructive" className="mb-4">
            <WifiOff className="h-4 w-4" />
            <AlertDescription>
              No internet connection. Please check your connection and try again.
            </AlertDescription>
          </Alert>
        )}
        
        {isOnline && isSlowConnection && (
          <Alert className="mb-4 border-orange-200 bg-orange-50 text-orange-800">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Slow network detected. Operations may take longer than usual.
            </AlertDescription>
          </Alert>
        )}

        <Card className="border-border/50 shadow-lg">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 h-12 w-12 rounded-xl bg-primary flex items-center justify-center">
              <Package className="h-6 w-6 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl">
              {isSignUp ? "Create your account" : "Welcome back"}
            </CardTitle>
            <CardDescription>
              {isSignUp
                ? "Sign up to get started with StockFlow"
                : "Sign in to access your dashboard"}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {isSignUp && (
                <FormField
                  label="Full Name"
                  type="text"
                  placeholder="John Doe"
                  value={formData.fullName}
                  onChange={(e) => handleInputChange("fullName", e.target.value)}
                  onBlur={() => handleBlur("fullName")}
                  error={touchedFields.has("fullName") ? errors.fullName : undefined}
                  icon={<User className="h-4 w-4" />}
                  autoComplete="name"
                  disabled={submitting}
                  maxLength={100}
                />
              )}

              <FormField
                label="Email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                onBlur={() => handleBlur("email")}
                error={touchedFields.has("email") ? errors.email : undefined}
                icon={<Mail className="h-4 w-4" />}
                autoComplete="email"
                disabled={submitting}
                maxLength={255}
              />

              <div>
                <FormField
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => handleInputChange("password", e.target.value)}
                  onBlur={() => handleBlur("password")}
                  error={touchedFields.has("password") ? errors.password : undefined}
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
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  disabled={submitting}
                  maxLength={128}
                />
                
                {/* Password strength indicator for signup */}
                {isSignUp && formData.password && (
                  <PasswordStrengthIndicator password={formData.password} />
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={submitting || !isOnline}
                size="lg"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isSignUp ? "Creating Account..." : "Signing In..."}
                  </>
                ) : (
                  isSignUp ? "Create Account" : "Sign In"
                )}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setErrors({});
                  setTouchedFields(new Set());
                  setFormData({ email: "", password: "", fullName: "" });
                }}
                className="text-primary font-medium hover:underline"
                disabled={submitting}
              >
                {isSignUp ? "Sign in" : "Sign up"}
              </button>
            </p>
          </CardContent>
        </Card>
        
        {/* Security note */}
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Your data is encrypted and secure. We never share your information.
        </p>
      </div>
    </div>
  );
};

export default Auth;
