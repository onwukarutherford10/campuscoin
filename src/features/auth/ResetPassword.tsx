import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Check, Eye, EyeOff, Loader2, X } from "lucide-react";
import { z } from "zod";
import { toast } from "../../services/toast";
import AuthShell from "./AuthShell";
import { resetPassword, verifyPasswordResetCode } from "../../auth/liveAuth.ts";
import { toServiceError } from "../../services/api/errors.ts";
import { DATA_MODE } from "../../services/api/config.ts";

const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(10, "Password must be at least 10 characters")
      .regex(/[A-Z]/, "Must contain an uppercase letter")
      .regex(/[0-9!@#$%^&*]/, "Must contain a number or symbol"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.confirmPassword === data.newPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

const inputClass =
  "mt-1.5 h-12 w-full rounded-xl border border-line px-3.5 text-sm outline-none transition focus:border-brand";
const labelClass = "block text-[13px] font-medium text-gray-700";

/** Step two of recovery: choose a new password and return to login. */
function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const adminRecovery = searchParams.get("admin") === "1";
  const loginPath = adminRecovery ? "/admin" : "/login";
  const requestAgainPath = adminRecovery ? "/forgetpassword?admin=1" : "/forgetpassword";
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [code, setCode] = useState("");
  const [codeVerified, setCodeVerified] = useState(false);
  const demoCode = (location.state as { demoCode?: string } | null)?.demoCode;
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const hasMinLength = newPassword.length >= 10;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasNumberOrSymbol = /[0-9!@#$%^&*]/.test(newPassword);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;
  const showRequirements = newPassword.length > 0;

  async function handleVerifyCode(event: FormEvent) {
    event.preventDefault();
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrors({ form: "Enter the email address you requested the code for." });
      return;
    }
    if (!/^[0-9]{6}$/.test(code)) {
      setErrors({ form: "Enter the six-digit code from your email." });
      return;
    }
    setSubmitting(true);
    setErrors({});
    try {
      await verifyPasswordResetCode(email.trim(), code);
      setCodeVerified(true);
    } catch (cause) {
      setErrors({ form: toServiceError(cause).error });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const result = resetPasswordSchema.safeParse({ newPassword, confirmPassword });
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      setErrors({
        newPassword: fieldErrors.newPassword?.[0] ?? "",
        confirmPassword: fieldErrors.confirmPassword?.[0] ?? "",
      });
      return;
    }

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrors({ form: "Enter the email address you requested the code for." });
      return;
    }
    if (!/^[0-9]{6}$/.test(code)) {
      setErrors({ form: "Enter the six-digit code from your email." });
      return;
    }
    setSubmitting(true);
    try {
      if (DATA_MODE === "live" || adminRecovery) {
        await resetPassword(email.trim(), code, result.data.newPassword);
      } else {
        const saved = sessionStorage.getItem("cc.demoResetCode");
        const demo = saved ? JSON.parse(saved) as { email: string; code: string } : null;
        if (demo?.email !== email.trim() || demo.code !== code) throw new Error("Incorrect demo code.");
        sessionStorage.removeItem("cc.demoResetCode");
      }
      toast.success("Password updated. Sign in with your new password.");
      navigate(loginPath, { replace: true });
    } catch (requestError) {
      const failure = toServiceError(requestError);
      if (adminRecovery) setCodeVerified(false);
      setErrors({ ...failure.errors, form: DATA_MODE === "mock" && !adminRecovery ? "That demo code isn't right." : failure.error });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title={adminRecovery && !codeVerified ? "Verify your reset code" : "Choose a new password"}
      subtitle={adminRecovery && !codeVerified
        ? "Enter the six-digit code we emailed you. Codes expire after 10 minutes."
        : "Choose a new password for your account."}
      backTo={requestAgainPath}
      backLabel="Back"
      art={{ src: "/art/auth-art.jpg", alt: "Student using a smartphone on campus" }}
      footer={
        <p>
          Changed your mind?{" "}
          <Link to={loginPath} className="font-medium text-brand-dark underline">
            Back to login
          </Link>
        </p>
      }
    >
      <form onSubmit={adminRecovery && !codeVerified ? handleVerifyCode : handleSubmit} className="mt-7">
        {DATA_MODE === "mock" && !adminRecovery && demoCode && (
          <p className="mb-5 rounded-xl bg-brand-soft/50 p-3 text-sm text-brand-dark">Demo code: <strong className="tracking-widest">{demoCode}</strong></p>
        )}
        {(!adminRecovery || !codeVerified) ? <>
          <label htmlFor="resetEmail" className={labelClass}>Email address</label>
          <input id="resetEmail" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} />

          <label htmlFor="resetCode" className={`mt-5 ${labelClass}`}>Six-digit code</label>
          <input id="resetCode" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} className={`${inputClass} text-center text-lg font-semibold tracking-[0.3em]`} />
          <p className="mt-1 text-xs text-gray-500">Didn't receive it? <Link to={requestAgainPath} className="font-medium text-brand-dark underline">Request another code</Link>.</p>
        </> : <p role="status" className="rounded-xl bg-brand-soft p-3 text-sm text-brand-dark">Code verified for {email}. You can now choose a new password.</p>}

        {(!adminRecovery || codeVerified) && <>
        <label htmlFor="newPassword" className={`mt-5 ${labelClass}`}>
          New password
        </label>
        <div className="relative">
          <input
            id="newPassword"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Enter a new password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            className={`${inputClass} pr-12`}
          />
          <button
            type="button"
            aria-label={showPassword ? "Hide password" : "Show password"}
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-gray-400 transition hover:text-gray-700"
          >
            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
        {errors.newPassword && <p className="mt-1 text-[13px] text-red-600">{errors.newPassword}</p>}

        <label htmlFor="confirmPassword" className={`mt-5 ${labelClass}`}>
          Confirm new password
        </label>
        <div className="relative">
          <input
            id="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Type it again"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className={`${inputClass} pr-12`}
          />
          <button
            type="button"
            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            onClick={() => setShowConfirmPassword((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-gray-400 transition hover:text-gray-700"
          >
            {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
        {errors.confirmPassword && (
          <p className="mt-1 text-[13px] text-red-600">{errors.confirmPassword}</p>
        )}
        {errors.form && <p className="mt-3 text-[13px] text-red-600">{errors.form}</p>}

        {showRequirements && (
          <ul className="mt-3 space-y-1 text-[12px]">
            {[
              { ok: hasMinLength, label: "At least 10 characters" },
              { ok: hasUppercase, label: "One uppercase letter" },
              { ok: hasNumberOrSymbol, label: "One number or symbol" },
              { ok: passwordsMatch, label: "Passwords match" },
            ].map((item) => (
              <li
                key={item.label}
                className={`flex items-center gap-1.5 ${item.ok ? "text-brand-dark" : "text-gray-400"}`}
              >
                {item.ok ? <Check size={13} /> : <X size={13} />}
                {item.label}
              </li>
            ))}
          </ul>
        )}
        </>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3.5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-70"
        >
          {submitting && <Loader2 size={16} className="animate-spin" />}
          {submitting ? (adminRecovery && !codeVerified ? "Verifying…" : "Updating…") : (adminRecovery && !codeVerified ? "Verify code" : "Update password")}
        </button>
      </form>
    </AuthShell>
  );
}

export default ResetPassword;
