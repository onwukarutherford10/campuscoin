import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { postLoginDestination, saveSession } from "../../auth/session";
import { getProfileSync } from "../../services/profileService";
import { firstNameOf } from "../../utils/format";
import { toast } from "../../services/toast";
import AuthShell from "./AuthShell";
import { DATA_MODE } from "../../services/api/config.ts";
import { login } from "../../auth/liveAuth.ts";
import { toServiceError } from "../../services/api/errors.ts";

const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type LoginValues = z.infer<typeof loginSchema>;

const inputClass =
  "mt-1.5 h-12 w-full rounded-xl border border-line px-3.5 text-sm outline-none transition focus:border-brand";
const labelClass = "block text-[13px] font-medium text-gray-700";

function Login() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function loginUser(data: LoginValues) {
    if (DATA_MODE === "live") {
      try {
        const user = await login(data.email, data.password);
        toast.success(`Welcome back, ${firstNameOf(user.name)}!`);
        navigate(user.email_verified ? "/onboarding" : "/otp");
      } catch (error) {
        const result = toServiceError(error);
        setError("root", { message: result.error });
      }
      return;
    }
    // Prefer the name the student actually set (profile → signup name → email).
    const name =
      getProfileSync().fullName.trim() ||
      localStorage.getItem("userName") ||
      firstNameOf(data.email.split("@")[0]);
    saveSession({ name, email: data.email });
    toast.success(`Welcome back, ${firstNameOf(name)}!`);
    navigate(postLoginDestination());
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to pick up your budgets, transactions and insights where you left off."
      art={{
        src: "/art/auth-art.jpg",
        alt: "Student using a smartphone on campus",
      }}
      footer={
        <p>
          New to Campus Coin?{" "}
          <Link to="/signup" className="font-medium text-brand-dark underline">
            Create an account
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit(loginUser)} className="mt-7">
        <label htmlFor="email" className={labelClass}>
          Email address
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          {...register("email")}
          className={inputClass}
        />
        {errors.email && <p className="mt-1 text-[13px] text-red-600">{errors.email.message}</p>}

        <label htmlFor="password" className={`mt-5 ${labelClass}`}>
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Your password"
            {...register("password")}
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
        {errors.password && <p className="mt-1 text-[13px] text-red-600">{errors.password.message}</p>}
        {errors.root && <p className="mt-3 text-[13px] text-red-600">{errors.root.message}</p>}

        <Link
          to="/forgetpassword"
          className="mt-3 block w-fit text-[13px] font-medium text-brand-dark underline transition hover:text-brand"
        >
          Forgot password?
        </Link>

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3.5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-70"
        >
          {isSubmitting && <Loader2 size={16} className="animate-spin" />}
          {isSubmitting ? "Logging in…" : "Log in"}
        </button>
      </form>
    </AuthShell>
  );
}

export default Login;
