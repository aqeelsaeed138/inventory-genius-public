import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Mail, Lock, User, ArrowLeft, Eye, EyeOff, Loader2, WifiOff, AlertTriangle, CheckCircle2 } from "lucide-react";
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
  const [signUpSuccess, setSignUpSuccess] = useState(false);
  const [signUpEmail, setSignUpEmail] = useState("");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const submitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setIsSignUp(searchParams.get("mode") === "signup");
    setErrors({});
    setTouchedFields(new Set());
    setSignUpSuccess(false);
  }, [searchParams]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      if (submitTimeoutRef.current) {
        clearTimeout(submitTimeoutRef.current);
      }
    };
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (user && !loading && !profileLoading) {
      if (profile?.company_id) {
        navigate("/dashboard", { replace: true });
      } else {
        navigate("/company-setup", { replace: true });
      }
    }
  }, [user, profile, loading, profileLoading, navigate]);

  const handleBlur = useCallback((field: string) => {
    setTouchedFields(prev => new Set(prev).add(field));
    
    const schema = isSignUp ? signUpSchema : signInSchema;
    const result = validateForm(schema, formData);
    
    if (result.success) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    } else if (result.success === false) {
      const fieldError = result.errors[field];
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

  const handleInputChange = useCallback((field: string, value: string) => {
    const trimmedValue = field === "email" ? value.trim() : value;
    setFormData(prev => ({ ...prev, [field]: trimmedValue }));
    
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
    
    if (submitting) return;
    
    if (!isOnline) {
      toast.error("No internet connection. Please check your connection and try again.");
      return;
    }

    const schema = isSignUp ? signUpSchema : signInSchema;
    const validationResult = validateForm(schema, formData);
    
    if (validationResult.success === false) {
      setErrors(validationResult.errors);
      setTouchedFields(new Set(Object.keys(validationResult.errors)));
      toast.error("Please fix the errors before submitting");
      return;
    }
    
    setSubmitting(true);
    setErrors({});

    abortControllerRef.current = new AbortController();
    
    submitTimeoutRef.current = setTimeout(() => {
      if (submitting) {
        toast.warning("This is taking longer than expected. Please wait...");
      }
    }, 5000);

    try {
      if (isSignUp) {
        const { error } = await signUp(formData.email, formData.password, formData.fullName);
        
        if (error) {
          handleSignUpError(error);
        } else {
          // Show email verification pending screen
          setSignUpEmail(formData.email);
          setSignUpSuccess(true);
        }
      } else {
        const { error } = await signIn(formData.email, formData.password);
        
        if (error) {
          handleSignInError(error);
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

  const handleSignUpError = (error: Error) => {
    const errorMsg = error.message?.toLowerCase() || "";
    
    if (errorMsg.includes("already registered") || errorMsg.includes("already been registered") || errorMsg.includes("user already registered")) {
      setErrors({ email: "This email is already registered." });
      toast.error(
        "An account with this email already exists. Please sign in instead.",
        {
          action: {
            label: "Sign In",
            onClick: () => {
              setIsSignUp(false);
              setErrors({});
              setTouchedFields(new Set());
              setFormData(prev => ({ ...prev, password: "", fullName: "" }));
            },
          },
          duration: 6000,
        }
      );
    } else if (errorMsg.includes("invalid email") || errorMsg.includes("unable to validate")) {
      setErrors({ email: "Please enter a valid email address." });
      toast.error("Invalid email address.");
    } else if (errorMsg.includes("password") && (errorMsg.includes("weak") || errorMsg.includes("short") || errorMsg.includes("length"))) {
      setErrors({ password: "Password is too weak. Use at least 8 characters with uppercase, lowercase, number, and special character." });
      toast.error("Password is too weak.");
    } else if (errorMsg.includes("rate limit") || errorMsg.includes("too many requests")) {
      toast.error("Too many attempts. Please wait a moment and try again.");
    } else if (errorMsg.includes("email not confirmed") || errorMsg.includes("confirmation")) {
      toast.error("Please check your email and confirm your account first.");
    } else {
      const message = getNetworkErrorMessage(error);
      toast.error(message);
    }
  };

  const handleSignInError = (error: Error) => {
    const errorMsg = error.message?.toLowerCase() || "";
    
    if (errorMsg.includes("invalid login") || errorMsg.includes("invalid credentials")) {
      setErrors({ 
        email: " ",
        password: "Invalid email or password. Please check your credentials." 
      });
      toast.error("Invalid email or password. Please try again.", {
        action: {
          label: "Forgot Password?",
          onClick: () => navigate("/forgot-password"),
        },
        duration: 5000,
      });
    } else if (errorMsg.includes("email not confirmed")) {
      setErrors({ email: "Your email is not verified yet." });
      toast.error(
        "Please verify your email address before signing in. Check your inbox for the confirmation link.",
        { duration: 6000 }
      );
    } else if (errorMsg.includes("rate limit") || errorMsg.includes("too many requests")) {
      toast.error("Too many login attempts. Please wait a few minutes before trying again.");
    } else if (errorMsg.includes("user not found") || errorMsg.includes("no user found")) {
      setErrors({ email: "No account found with this email." });
      toast.error("No account found with this email. Would you like to sign up?", {
        action: {
          label: "Sign Up",
          onClick: () => {
            setIsSignUp(true);
            setErrors({});
            setTouchedFields(new Set());
          },
        },
        duration: 5000,
      });
    } else {
      const message = getNetworkErrorMessage(error);
      toast.error(message);
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

  // Show email verification pending screen after successful signup
  if (signUpSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <div className="w-full max-w-md">
          <Card className="border-border/50 shadow-lg">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl">Check your email</CardTitle>
              <CardDescription className="text-base mt-2">
                We've sent a verification link to
              </CardDescription>
              <p className="font-semibold text-foreground mt-1">{signUpEmail}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm text-muted-foreground">
                <p>📧 Check your inbox and click the verification link to activate your account.</p>
                <p>⏱️ The link will expire in 24 hours.</p>
                <p>📁 Don't see the email? Check your spam/junk folder.</p>
              </div>
              
              <div className="pt-2 space-y-3">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setSignUpSuccess(false);
                    setIsSignUp(false);
                    setFormData({ email: signUpEmail, password: "", fullName: "" });
                    setErrors({});
                    setTouchedFields(new Set());
                  }}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Go to Sign In
                </Button>
                
                <p className="text-center text-xs text-muted-foreground">
                  Wrong email?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setSignUpSuccess(false);
                      setIsSignUp(true);
                      setFormData({ email: "", password: "", fullName: "" });
                      setErrors({});
                    }}
                    className="text-primary font-medium hover:underline"
                  >
                    Sign up again
                  </button>
                </p>
              </div>
            </CardContent>
          </Card>
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

            {/* Forgot Password link - only show on sign in */}
            {!isSignUp && (
              <div className="mt-3 text-center">
                <Link
                  to="/forgot-password"
                  className="text-sm text-primary hover:underline font-medium"
                >
                  Forgot your password?
                </Link>
              </div>
            )}

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
        
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Your data is encrypted and secure. We never share your information.
        </p>
      </div>
    </div>
  );
};

export default Auth;
