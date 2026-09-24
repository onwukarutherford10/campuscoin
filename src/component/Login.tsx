import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { FcGoogle } from "react-icons/fc";
import { FaApple } from "react-icons/fa";

const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type LoginValues = z.infer<typeof loginSchema>;

function Login() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { 
      email: "", 
      password: "" 
    },
  });

  function loginUser(_data: LoginValues) {
    navigate("/dashboard");
  }

  return (
    <main className="flex min-h-screen bg-[var(--primaryColor)]">
      <section className="hidden w-[35%] bg-[var(--secondaryColor)] lg:block">

      </section>

      <section className="flex w-full flex-col items-center justify-center px-6 py-10 lg:w-[65%]">
        <h1 className="text-xl font-medium">Hello Again!</h1>
        <p className="mt-1 text-sm text-[var(--grey)]">Welcome back. You have been missed!</p>

        <form onSubmit={handleSubmit(loginUser)} className="mt-5 flex w-full max-w-md flex-col">
          <label htmlFor="email" className="mb-1 text-sm text-[var(--grey)]">Email Address</label>
          <input
            id="email"
            type="email"
            {...register("email")}
            className="h-11 border border-[var(--grey)] p-[10px] text-sm outline-none focus:border-[var(--secondaryColor)] rounded-[14px]"
          />
          {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}

          <label htmlFor="password" className="mb-1 mt-4 text-sm text-[var(--grey)]">Password</label>
          <div className="flex h-11 border border-[var(--grey)] rounded-[14px]">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              {...register("password")}
              className="w-full bg-transparent px-3 text-sm outline-none rounded-l-[14px]"
            />
            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword(!showPassword)}
              className="px-3 text-[var(--grey)] "
            >
              {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
            </button>
          </div>
          {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}

          <Link to="/forgetpassword" className="mt-2 self-end text-xs text-[var(--secondaryColor)] underline">
            Forgot Password
          </Link>

          <button type="submit" disabled={isSubmitting} className="rounded-[14px] mt-5 h-11 bg-[var(--secondaryColor)] text-sm text-white">
            {isSubmitting ? "Please hold..." : "Login"}
          </button>
        </form>

        <p className="mt-5 text-xs text-[var(--grey)]">(Or Continue With)</p>
        <div className="mt-4 flex w-full max-w-md justify-center gap-5">
          <button type="button" aria-label="Continue with Google" className="flex h-11 w-32 items-center justify-center border border-gray-300 rounded-[8px]">
            <FcGoogle size={22} />
          </button>
          <button type="button" aria-label="Continue with Apple" className="flex h-11 w-32 items-center justify-center border border-gray-300 rounded-[8px]">
            <FaApple size={22} />
          </button>
        </div>

        <p className="mt-3 text-xs text-[var(--grey)]">
          Do not have an account? <Link className="text-[var(--secondaryColor)] underline" to="/signup">Sign Up</Link>
        </p>
      </section>
    </main>
  );
}

export default Login;
