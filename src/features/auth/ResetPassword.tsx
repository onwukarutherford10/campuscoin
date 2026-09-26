import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Check, Eye, EyeOff, Loader2, X } from "lucide-react";
import { z } from "zod";
import { toast } from "../../services/toast";
import AuthShell from "./AuthShell";
import { resetPassword } from "../../auth/liveAuth.ts";
import { toServiceError } from "../../services/api/errors.ts";

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
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
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

    if (!token) {
      setErrors({ form: "This reset link is missing its token. Request a new link." });
      return;
    }
    setSubmitting(true);
    try {
      await resetPassword(token, result.data.newPassword);
      toast.success("Password updated. Sign in with your new password.");
      navigate("/login", { replace: true });
    } catch (requestError) {
      const failure = toServiceError(requestError);
      setErrors({ ...failure.errors, form: failure.error });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Choose a new password"
      subtitle="Make it something you'll remember: at least 10 characters with an uppercase letter and a number."
      backTo="/forgetpassword"
      backLabel="Back"
      art={{ src: "/art/auth-art.jpg", alt: "Student using a smartphone on campus" }}
      footer={
        <p>
          Changed your mind?{" "}
          <Link to="/login" className="font-medium text-brand-dark underline">
            Back to login
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="mt-7">
        <label htmlFor="newPassword" className={labelClass}>
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

        <button
          type="submit"
          disabled={submitting}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3.5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-70"
        >
          {submitting && <Loader2 size={16} className="animate-spin" />}
          {submitting ? "Updating…" : "Update password"}
        </button>
      </form>
    </AuthShell>
  );
}

export default ResetPassword;
