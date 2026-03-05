import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authClient } from "@/lib/auth-client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plane } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error } = await authClient.requestPasswordReset({
        email,
      });

      if (error) {
        setError(error.message);
        return;
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 text-primary mb-4">
              <Plane className="h-7 w-7" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">
              Check your email
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              We've sent you a password reset link. Please check your email.
            </p>
          </div>

          <div className="text-center text-sm">
            <Link
              to="/login"
              className="font-medium text-primary hover:underline"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 text-primary mb-4">
            <Plane className="h-7 w-7" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">
            Reset your password
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            Enter your email and we'll send you a reset link
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Sending..." : "Send Reset Link"}
          </Button>
        </form>

        <div className="text-center text-sm">
          <p className="text-muted-foreground">
            Remember your password?{" "}
            <Link
              to="/login"
              className="font-medium text-primary hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
