import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import AuthShell from "./AuthShell";
import { requestPasswordReset } from "../../auth/liveAuth.ts";
import { toServiceError } from "../../services/api/errors.ts";

const forgetPasswordSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email"),
});

export type ForgetPasswordValues = z.infer<typeof forgetPasswordSchema>;

/** Step one of recovery: confirm the email, then set a new password. */
function ForgetPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [accepted, setAccepted] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const result = forgetPasswordSchema.safeParse({ email });
    if (!result.success) {
      setError(result.error.flatten().fieldErrors.email?.[0] ?? "Invalid email");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await requestPasswordReset(result.data.email);
      setAccepted(true);
    } catch (requestError) {
      setError(toServiceError(requestError).error);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter the email you signed up with. If an account exists, we'll send a secure reset link."
      backTo="/login"
      backLabel="Back to login"
      art={{ src: "/art/auth-art.jpg", alt: "Student using a smartphone on campus" }}
      footer={
        <p>
          Remembered it?{" "}
          <Link to="/login" className="font-medium text-brand-dark underline">
            Back to login
          </Link>
        </p>
      }
    >
      {accepted ? (
        <div className="mt-7 rounded-xl bg-brand-soft/50 p-5 text-sm text-gray-700">
          If an account exists for that address, reset instructions have been issued. Check your inbox and spam folder.
        </div>
      ) : <form onSubmit={handleSubmit} className="mt-7">
        <label htmlFor="email" className="block text-[13px] font-medium text-gray-700">
          Email address
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-1.5 h-12 w-full rounded-xl border border-line px-3.5 text-sm outline-none transition focus:border-brand"
        />
        {error && <p className="mt-1 text-[13px] text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3.5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-70"
        >
          {submitting && <Loader2 size={16} className="animate-spin" />}
          {submitting ? "Sending…" : "Send reset link"}
        </button>
      </form>}
    </AuthShell>
  );
}

export default ForgetPassword;
