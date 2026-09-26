import { useState, type FormEvent } from "react";
import { Check, Eye, EyeOff, Loader2, Mail, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { resetOnboarding, saveSession } from "../../auth/session";
import AuthShell from "./AuthShell";
import { DATA_MODE } from "../../services/api/config.ts";
import { register as registerAccount } from "../../auth/liveAuth.ts";
import { toServiceError } from "../../services/api/errors.ts";
import { toast } from "../../services/toast.ts";

const accountSchema = z
  .object({
    email: z.string().email("Invalid email address"),
    password: z
      .string()
      .min(10, "Password must be at least 10 characters")
      .regex(/[A-Z]/, "Must contain an uppercase letter")
      .regex(/[0-9!@#$%^&*]/, "Must contain a number or symbol"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const nameSchema = z.object({
  name: z.string().min(1, "Name is required"),
});

const inputClass =
  "mt-1.5 h-12 w-full rounded-xl border border-line px-3.5 text-sm outline-none transition focus:border-brand";
const labelClass = "block text-[13px] font-medium text-gray-700";

function SignUp() {
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2>(1);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const hasMinLength = password.length >= 10;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumberOrSymbol = /[0-9!@#$%^&*]/.test(password);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const allRequirementsMet = hasMinLength && hasUppercase && hasNumberOrSymbol && passwordsMatch;
  const showRequirements = password.length > 0;

  function handleAccountSubmit(event: FormEvent) {
    event.preventDefault();
    const result = accountSchema.safeParse({ email, password, confirmPassword });

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      setErrors({
        email: fieldErrors.email?.[0] ?? "",
        password: fieldErrors.password?.[0] ?? "",
        confirmPassword: fieldErrors.confirmPassword?.[0] ?? "",
      });
      return;
    }
    setErrors({});
    setStep(2);
  }

  async function handleNameSubmit(event: FormEvent) {
    event.preventDefault();
    const result = nameSchema.safeParse({ name });
    if (!result.success) {
      setErrors({ name: result.error.flatten().fieldErrors.name?.[0] ?? "Invalid name" });
      return;
    }

    setSubmitting(true);
    if (DATA_MODE === "live") {
      try {
        const account = await registerAccount(result.data.name, email, password);
        if (!account.verification_sent) {
          toast.error("Your account was created, but the verification email could not be sent. Use resend on the next screen.");
        }
        navigate("/otp");
      } catch (error) {
        const failure = toServiceError(error);
        setErrors({ ...failure.errors, form: failure.error });
      } finally {
        setSubmitting(false);
      }
      return;
    }
    localStorage.setItem("userName", result.data.name);
    saveSession({ name: result.data.name, email });
    resetOnboarding();
    // Short "creating…" beat, then email verification (OTP).
    window.setTimeout(() => navigate("/otp"), 600);
  }

  return (
    <AuthShell
      title={step === 1 ? "Create your account" : "What should we call you?"}
      subtitle={
        step === 1
          ? "Set up budgets, insights and saving tips for student life in under a minute."
          : "This is the name you'll see across Campus Coin."
      }
      art={{
        src: "/art/auth-art.jpg",
        alt: "Student using a smartphone on campus",
      }}
      onBack={step === 2 ? () => setStep(1) : undefined}
      backLabel="Back"
      footer={
        step === 1 ? (
          <p>
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-brand-dark underline">
              Log in
            </Link>
          </p>
        ) : undefined
      }
    >
      {step === 1 && (
        <form onSubmit={handleAccountSubmit} className="mt-7">
          <label htmlFor="email" className={labelClass}>
            Email address
          </label>
          <input
            type="email"
            id="email"
            name="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={inputClass}
          />
          {errors.email && <p className="mt-1 text-[13px] text-red-600">{errors.email}</p>}

          <label htmlFor="password" className={`mt-5 ${labelClass}`}>
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              name="password"
              autoComplete="new-password"
              placeholder="Create a password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
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
          {errors.password && <p className="mt-1 text-[13px] text-red-600">{errors.password}</p>}

          <label htmlFor="confirmPassword" className={`mt-5 ${labelClass}`}>
            Confirm password
          </label>
          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              id="confirmPassword"
              name="confirmPassword"
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
            disabled={!allRequirementsMet}
            className={`mt-6 w-full rounded-xl py-3.5 text-sm font-semibold transition ${
              allRequirementsMet
                ? "bg-brand text-white hover:bg-brand-dark"
                : "cursor-not-allowed bg-gray-200 text-gray-500"
            }`}
          >
            Continue
          </button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleNameSubmit} className="mt-2">
          <label htmlFor="name" className={labelClass}>
            Full name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            autoComplete="name"
            placeholder="e.g. Ada Lovelace"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={inputClass}
          />
          {errors.name && <p className="mt-1 text-[13px] text-red-600">{errors.name}</p>}
          {errors.form && <p className="mt-3 text-[13px] text-red-600">{errors.form}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3.5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-70"
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {submitting ? "Creating account…" : "Create account"}
          </button>

          <p className="mt-4 flex items-center justify-center gap-1.5 text-[13px] text-gray-400">
            <Mail size={13} />
            We'll verify your email next.
          </p>
        </form>
      )}
    </AuthShell>
  );
}

export default SignUp;
