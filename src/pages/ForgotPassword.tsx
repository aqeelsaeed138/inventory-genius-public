import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Mail, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { emailSchema } from "@/lib/validations";
import FormField from "@/components/auth/FormField";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    // Validate email
    const result = emailSchema.safeParse(email);
    if (!result.success) {
      setError(result.error.errors[0]?.message || "Please enter a valid email");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        { redirectTo: `${window.location.origin}/reset-password` }
      );

      if (resetError) {
        if (resetError.message.toLowerCase().includes("rate limit")) {
          toast.error("Too many requests. Please wait a few minutes before trying again.");
        } else {
          toast.error(resetError.message);
        }
      } else {
        setEmailSent(true);
      }
    } catch (err) {
      toast.error("An unexpected error occurred. Please try again.");
      console.error("Password reset error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  if (emailSent) {
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
                We've sent a password reset link to
              </CardDescription>
              <p className="font-semibold text-foreground mt-1">{email}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm text-muted-foreground">
                <p>📧 Click the link in the email to reset your password.</p>
                <p>⏱️ The link will expire in 1 hour.</p>
                <p>📁 Don't see the email? Check your spam/junk folder.</p>
              </div>
              
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setEmailSent(false);
                  setEmail("");
                }}
              >
                Try a different email
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md">
        <Link 
          to="/auth" 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </Link>

        <Card className="border-border/50 shadow-lg">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 h-12 w-12 rounded-xl bg-primary flex items-center justify-center">
              <Package className="h-6 w-6 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl">Forgot your password?</CardTitle>
            <CardDescription>
              Enter your email and we'll send you a link to reset your password.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <FormField
                label="Email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value.trim());
                  if (error) setError("");
                }}
                error={error || undefined}
                icon={<Mail className="h-4 w-4" />}
                autoComplete="email"
                disabled={submitting}
                maxLength={255}
              />

              <Button 
                type="submit" 
                className="w-full" 
                disabled={submitting || !email}
                size="lg"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending reset link...
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
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
};

export default ForgotPassword;
