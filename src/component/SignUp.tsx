import { useState, type FormEvent } from "react";
import { Eye, EyeOff, Check, X } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { FaApple } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";

const styles = {
  label:
    "text-[15px] pt-[10px] mb-[3.5px] text-(--grey) max-[804px]:text-[14px] max-[480px]:text-[13px]",
  input:
    "border-[1.5px] border-(--grey) w-full rounded-[13px] text-[13px] text-(--grey) pl-[10px] focus:outline-none focus:ring-0",
  icon: "w-[10%] h-full flex justify-center items-center text-(--grey) cursor-pointer",
  inputContainer:
    "flex border-[1.5px] border-(--grey) w-full rounded-[13px] text-[13px] text-(--grey) pl-[10px] focus:outline-none focus:ring-0",
  button: "w-[100%] rounded-[13px] mt-[24px] mb-[15px]",
};

const accountSchema = z
  .object({
    email: z.string().email("Invalid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
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

function SignUp() {
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2>(1);

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [name, setName] = useState<string>("");

  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [nameError, setNameError] = useState<string>("");

  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumberOrSymbol = /[0-9!@#$%^&*]/.test(password);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const allRequirementsMet = hasMinLength && hasUppercase && hasNumberOrSymbol && passwordsMatch;

  const showRequirements = password.length > 0;

  const fieldHeight = showRequirements ? "h-[52px]" : "h-[46px]";
  const buttonHeight = showRequirements ? "h-[52px]" : "h-[46px]";

  function togglePassword() {
    setShowPassword((prev) => !prev);
  }

  function toggleConfirmPassword() {
    setShowConfirmPassword((prev) => !prev);
  }

  function resetForm() {
    setStep(1);
    setName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
  }

  function handleAccountSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    const result = accountSchema.safeParse({ email, password, confirmPassword });

    if (!result.success) {
      console.log(result.error.flatten().fieldErrors);
      alert("Validation failed: " + JSON.stringify(result.error.flatten().fieldErrors));
      setIsSubmitting(false);
      return;
    }

    setEmail(result.data.email);
    setPassword(result.data.password);
    setIsSubmitting(false);
    setStep(2);
  }

  function handleNameSubmit(e: FormEvent) {
    e.preventDefault();

    const result = nameSchema.safeParse({ name });

    if (!result.success) {
      setNameError(result.error.flatten().fieldErrors.name?.[0] ?? "Invalid name");
      return;
    }

    localStorage.setItem("userName", result.data.name);
    resetForm();
    navigate("/dashboard");
  }

  return (
    <section className="w-full min-h-screen overflow-x-hidden bg-(--primaryColor) flex max-[804px]:flex-col">
      <section className="w-[60%] flex flex-col justify-center items-center py-[40px] max-[804px]:w-full">
        {step === 1 && (
          <>
            <p className="font-medium text-2xl max-[480px]:text-xl">Sign Up</p>
            <p className="mt-[2px] text(--grey) text-[15px] max-[480px]:text-[13px]">
              One Step Closer to Something Great
            </p>

            <form
              className="w-[50%] flex flex-col mt-[5px] max-[804px]:w-[65%] max-[670px]:w-[75%] max-[480px]:w-[90%]"
              onSubmit={handleAccountSubmit}
            >
              <label className={styles.label} htmlFor="email">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="Example@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`${styles.input} ${fieldHeight}`}
                required
              />

              <label className={styles.label} htmlFor="password">
                Password
              </label>
              <section className={`${styles.inputContainer} ${fieldHeight}`}>
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  placeholder="Enter a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full outline-0"
                  required
                />
                <span className={styles.icon} onClick={togglePassword}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </span>
              </section>

              <label className={styles.label} htmlFor="confirmPassword">
                Confirm Password
              </label>
              <section className={`${styles.inputContainer} ${fieldHeight}`}>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  name="confirmPassword"
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full outline-0"
                  required
                />
                <span className={styles.icon} onClick={toggleConfirmPassword}>
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </span>
              </section>

              {showRequirements && (
                <ul className="text-[12px] mt-[6px] space-y-[3px]">
                  <li className={`flex items-center gap-[5px] ${hasMinLength ? "text-green-600" : "text-red-500"}`}>
                    {hasMinLength ? <Check size={14} /> : <X size={14} />}
                    At least 8 characters long
                  </li>
                  <li className={`flex items-center gap-[5px] ${hasUppercase ? "text-green-600" : "text-red-500"}`}>
                    {hasUppercase ? <Check size={14} /> : <X size={14} />}
                    Contains 1 uppercase character
                  </li>
                  <li className={`flex items-center gap-[5px] ${hasNumberOrSymbol ? "text-green-600" : "text-red-500"}`}>
                    {hasNumberOrSymbol ? <Check size={14} /> : <X size={14} />}
                    Contains 1 number or symbol
                  </li>
                  <li className={`flex items-center gap-[5px] ${passwordsMatch ? "text-green-600" : "text-red-500"}`}>
                    {passwordsMatch ? <Check size={14} /> : <X size={14} />}
                    Passwords match
                  </li>
                </ul>
              )}

              <button
                type="submit"
                disabled={!allRequirementsMet || isSubmitting}
                className={`${styles.button} ${buttonHeight} ${
                  allRequirementsMet && !isSubmitting
                    ? "bg-(--secondaryColor) cursor-pointer"
                    : "bg-gray-300 cursor-not-allowed"
                }`}
              >
                {isSubmitting ? "Signing in..." : "Next"}
              </button>
            </form>

            <section className="flex justify-center">
              <p className="text-[12px] text-[var(--grey)] mt-[10px]">(Or Continue With)</p>
            </section>

            <section className="w-[50%] h-[48px] flex justify-between mt-[17px] max-[804px]:w-[65%] max-[480px]:w-[90%]">
              <section className="w-[45%] h-full border-[1.5px] rounded-[13px] flex justify-center items-center">
                <FcGoogle size={22} />
              </section>
              <section className="w-[45%] h-full border-[1.5px] rounded-[13px] flex justify-center items-center">
                <FaApple size={22} />
              </section>
            </section>

            <section className="flex gap-[3px] mt-[8px]">
              <p className="text-[12px] text-[var(--grey)]">Already have an Account?</p>
              <Link className="text-[12px] underline text-[var(--secondaryColor)]" to="/">
                Login
              </Link>
            </section>
          </>
        )}

        {step === 2 && (
          <>
            <p className="font-medium text-2xl max-[480px]:text-xl">What's your name?</p>
            <p className="mt-[2px] text(--grey) text-[15px] max-[480px]:text-[13px]">
              This is what we'll call you
            </p>

            <form
              className="w-[50%] flex flex-col mt-[5px] max-[804px]:w-[65%] max-[670px]:w-[75%] max-[480px]:w-[90%]"
              onSubmit={handleNameSubmit}
            >
              <label className={styles.label} htmlFor="name">
                Full Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`${styles.input} h-[52px]`}
                required
              />
              {nameError && (
                <p className="text-[12px] text-red-500 mt-[4px]">{nameError}</p>
              )}

              <button
                type="submit"
                className="w-[100%] h-[52px] rounded-[13px] mt-[24px] mb-[15px] bg-(--secondaryColor) cursor-pointer"
              >
                Sign in
              </button>
            </form>
          </>
        )}
      </section>
      <section className="w-[40%] min-h-screen bg-(--secondaryColor) rounded-tl-[22px] rounded-bl-[22px] max-[804px]:hidden"></section>
    </section>
  );
}

export default SignUp;