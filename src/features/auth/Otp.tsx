import { useEffect, useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2, Loader2, MailCheck } from "lucide-react";
import AuthShell from "./AuthShell";
import { postLoginDestination } from "../../auth/session";
import { toast } from "../../services/toast";

const CODE_LENGTH = 6;
const RESEND_SECONDS = 30;

function randomCode(): string {
  return Array.from({ length: CODE_LENGTH }, () => Math.floor(Math.random() * 10)).join("");
}

const boxClass =
  "h-12 w-full rounded-xl border border-line bg-white text-center text-lg font-semibold text-gray-900 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/25";

/**
 * Email verification after signup: six boxes with auto-advance, backspace
 * and paste support, a resend with countdown, plus loading, invalid and
 * success states. The mock "sent" code is shown on screen for the demo.
 */
export function OtpPage() {
  const navigate = useNavigate();
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [code, setCode] = useState(randomCode);
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = window.setTimeout(() => setSecondsLeft((prev) => Math.max(prev - 1, 0)), 1000);
    return () => window.clearTimeout(timer);
  }, [secondsLeft]);

  function setDigit(index: number, value: string) {
    setDigits((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function handleChange(index: number, raw: string) {
    const value = raw.replace(/\D/g, "").slice(-1);
    setDigit(index, value);
    setError("");
    if (value && index < CODE_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace") {
      if (digits[index]) {
        setDigit(index, "");
      } else if (index > 0) {
        event.preventDefault();
        setDigit(index - 1, "");
        inputRefs.current[index - 1]?.focus();
      }
      setError("");
    } else if (event.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (event.key === "ArrowRight" && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handlePaste(index: number, event: ClipboardEvent<HTMLInputElement | HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, CODE_LENGTH - index);
    if (!pasted) return;
    setDigits((prev) => {
      const next = [...prev];
      pasted.split("").forEach((char, offset) => {
        next[index + offset] = char;
      });
      return next;
    });
    setError("");
    const landing = Math.min(index + pasted.length, CODE_LENGTH - 1);
    inputRefs.current[landing]?.focus();
  }

  function handleResend() {
    if (secondsLeft > 0) return;
    setCode(randomCode());
    setDigits(Array(CODE_LENGTH).fill(""));
    setError("");
    setSecondsLeft(RESEND_SECONDS);
    toast.success("A new code is on its way.");
    inputRefs.current[0]?.focus();
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const entry = digits.join("");
    if (entry.length < CODE_LENGTH) {
      setError("Enter all six digits of your code.");
      return;
    }

    setVerifying(true);
    window.setTimeout(() => {
      setVerifying(false);
      if (entry !== code) {
        setDigits(Array(CODE_LENGTH).fill(""));
        setError("That code isn't right. Check it and try again.");
        inputRefs.current[0]?.focus();
        return;
      }
      setVerified(true);
      toast.success("Email verified. Welcome aboard!");
      window.setTimeout(() => navigate(postLoginDestination()), 900);
    }, 900);
  }

  return (
    <AuthShell
      title="Verify your account"
      subtitle="We sent a 6-digit verification code to your email. Enter it below to finish creating your account."
      backTo="/signup"
      backLabel="Back to sign up"
      art={{ src: "/art/auth-art.jpg", alt: "Student using a smartphone on campus" }}
      footer={
        <p>
          Didn't get it? Check your spam folder, or{" "}
          <button
            type="button"
            onClick={handleResend}
            disabled={secondsLeft > 0}
            className={`font-medium underline ${
              secondsLeft > 0 ? "cursor-not-allowed text-gray-400" : "text-brand-dark hover:text-brand"
            }`}
          >
            {secondsLeft > 0 ? `Resend in ${secondsLeft}s` : "Resend code"}
          </button>
        </p>
      }
    >
      {verified ? (
        <div className="mt-8 flex flex-col items-center rounded-2xl border border-brand/30 bg-brand-soft/50 px-6 py-10 text-center">
          <CheckCircle2 size={40} className="text-brand-dark pop-in" />
          <p className="mt-3 text-sm font-semibold text-gray-900">You're verified!</p>
          <p className="mt-1 text-[13px] text-gray-500">Taking you to your dashboard setup…</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-7">
          <div className="flex items-center gap-2 rounded-xl bg-canvas px-3.5 py-2.5 text-[13px] text-gray-600">
            <MailCheck size={15} className="shrink-0 text-brand-dark" />
            <span>
              Demo mode: your code is{" "}
              <span className="font-semibold tracking-widest text-gray-900">{code}</span>
            </span>
          </div>

          <div
            className="mt-5 grid grid-cols-6 gap-2 sm:gap-3"
            onPaste={(event) => handlePaste(0, event)}
          >
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(element) => {
                  inputRefs.current[index] = element;
                }}
                type="text"
                inputMode="numeric"
                autoComplete={index === 0 ? "one-time-code" : "off"}
                maxLength={CODE_LENGTH}
                aria-label={`Digit ${index + 1} of ${CODE_LENGTH}`}
                value={digit}
                onChange={(event) => handleChange(index, event.target.value)}
                onKeyDown={(event) => handleKeyDown(index, event)}
                onPaste={(event) => handlePaste(index, event)}
                disabled={verifying}
                className={boxClass}
              />
            ))}
          </div>

          {error && <p className="mt-3 text-[13px] text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={verifying}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3.5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-70"
          >
            {verifying && <Loader2 size={16} className="animate-spin" />}
            {verifying ? "Verifying…" : "Verify & continue"}
          </button>

          <p className="mt-4 text-center text-[13px] text-gray-500">
            Wrong email?{" "}
            <Link to="/signup" className="font-medium text-brand-dark underline">
              Start over
            </Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}

export default OtpPage;
