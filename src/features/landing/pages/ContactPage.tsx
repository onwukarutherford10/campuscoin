import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { Clock3, Mail, Send, ShieldCheck } from "lucide-react";
import { PageHero } from "../PageHero";
import { Reveal } from "../Motion";
import { toast } from "../../../services/toast";
import { usePageTitle } from "../usePageTitle";

const TOPICS = ["General question", "Feedback or idea", "Bug report", "Data & privacy"];

interface FormState {
  name: string;
  email: string;
  topic: string;
  message: string;
}

type FieldKey = keyof FormState;
type Errors = Partial<Record<FieldKey, string>>;

const BLANK: FormState = { name: "", email: "", topic: TOPICS[0], message: "" };

const FIELD_CLASS =
  "w-full rounded-xl border border-gray-200 bg-gray-50/60 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 transition focus:border-brand focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand/15";

function fieldClass(hasError: boolean): string {
  return `${FIELD_CLASS} ${hasError ? "border-error/70 focus:border-error focus:ring-error/15" : ""}`;
}

function validate(form: FormState): Errors {
  const errors: Errors = {};
  if (form.name.trim().length < 2) errors.name = "Please tell us your name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
    errors.email = "Enter a valid email address so we can reply.";
  if (form.message.trim().length < 10)
    errors.message = "Add a little more detail (at least 10 characters).";
  return errors;
}

const CHANNELS = [
  {
    icon: Mail,
    title: "Email",
    body: "hello@campuscoin.app",
    note: "Best for anything that needs a reply.",
  },
  {
    icon: Clock3,
    title: "Response time",
    body: "Within 2 business days",
    note: "Bug reports are triaged first.",
  },
  {
    icon: ShieldCheck,
    title: "Data & privacy",
    body: "We never ask for bank details",
    note: "Your records stay on your device.",
  },
];

/** Contact (`/contact`) — a validated message form plus the direct channels. */
export function ContactPage() {
  usePageTitle("Contact — Campus Coin");

  const [form, setForm] = useState<FormState>(BLANK);
  const [errors, setErrors] = useState<Errors>({});

  const update = (key: FieldKey, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      toast.error("Please fix the highlighted fields.");
      return;
    }

    // No backend in this build: hand the validated message to the mail client.
    const subject = `[${form.topic}] Message from ${form.name.trim()}`;
    const body = `${form.message.trim()}\n\n———\n${form.name.trim()}\n${form.email.trim()}`;
    window.location.href = `mailto:hello@campuscoin.app?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;

    toast.success("Opening your email app with the message ready to send.");
    setForm(BLANK);
    setErrors({});
  };

  return (
    <>
      <PageHero
        eyebrow="Contact"
        title={
          <>
            Say hello. <span className="text-mint">We read everything.</span>
          </>
        }
        subtitle="Feature ideas, bugs, partnerships or a question about your data — send it our way."
      />

      <section className="bg-canvas px-6 py-20 sm:py-24 lg:py-28">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-5 lg:gap-10">
          {/* Message form */}
          <Reveal className="lg:col-span-3">
            <form
              onSubmit={handleSubmit}
              noValidate
              className="h-full rounded-[2rem] border border-gray-200/70 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)] sm:p-9"
            >
              <h2 className="font-display text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                Send us a message
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">
                Fill this in and we'll open your email app with everything ready to send.
              </p>

              <div className="mt-7 grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="contact-name" className="text-[13px] font-bold text-gray-900">
                    Name
                  </label>
                  <input
                    id="contact-name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    placeholder="Ada Obi"
                    value={form.name}
                    onChange={(event) => update("name", event.target.value)}
                    aria-invalid={Boolean(errors.name)}
                    aria-describedby={errors.name ? "contact-name-error" : undefined}
                    className={`mt-2 ${fieldClass(Boolean(errors.name))}`}
                  />
                  {errors.name && (
                    <p id="contact-name-error" className="mt-1.5 text-[12px] font-medium text-error">
                      {errors.name}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="contact-email" className="text-[13px] font-bold text-gray-900">
                    Email
                  </label>
                  <input
                    id="contact-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@campus.edu"
                    value={form.email}
                    onChange={(event) => update("email", event.target.value)}
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={errors.email ? "contact-email-error" : undefined}
                    className={`mt-2 ${fieldClass(Boolean(errors.email))}`}
                  />
                  {errors.email && (
                    <p
                      id="contact-email-error"
                      className="mt-1.5 text-[12px] font-medium text-error"
                    >
                      {errors.email}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-5">
                <label htmlFor="contact-topic" className="text-[13px] font-bold text-gray-900">
                  What's this about?
                </label>
                <select
                  id="contact-topic"
                  name="topic"
                  value={form.topic}
                  onChange={(event) => update("topic", event.target.value)}
                  className={`mt-2 ${fieldClass(false)}`}
                >
                  {TOPICS.map((topic) => (
                    <option key={topic} value={topic}>
                      {topic}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-5">
                <label htmlFor="contact-message" className="text-[13px] font-bold text-gray-900">
                  Message
                </label>
                <textarea
                  id="contact-message"
                  name="message"
                  rows={6}
                  placeholder="Tell us what's on your mind — steps to reproduce a bug help a lot."
                  value={form.message}
                  onChange={(event) => update("message", event.target.value)}
                  aria-invalid={Boolean(errors.message)}
                  aria-describedby={errors.message ? "contact-message-error" : undefined}
                  className={`mt-2 resize-y ${fieldClass(Boolean(errors.message))}`}
                />
                {errors.message && (
                  <p
                    id="contact-message-error"
                    className="mt-1.5 text-[12px] font-medium text-error"
                  >
                    {errors.message}
                  </p>
                )}
              </div>

              <div className="mt-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="submit"
                  className="btn-press inline-flex items-center justify-center gap-2 rounded-full bg-ink px-8 py-3.5 text-sm font-bold text-white hover:-translate-y-0.5 hover:bg-brand-dark"
                >
                  <Send size={15} />
                  Send message
                </button>
                <p className="max-w-xs text-[11px] leading-snug text-gray-400">
                  This build has no server yet, so sending hands the message to your own email app.
                </p>
              </div>
            </form>
          </Reveal>

          {/* Direct channels */}
          <aside className="space-y-5 lg:col-span-2" aria-label="Other ways to reach us">
            {CHANNELS.map((channel, index) => (
              <Reveal key={channel.title} delay={index * 0.08}>
                <div className="rounded-3xl border border-gray-200/70 bg-white p-6">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink text-mint shadow-sm">
                    <channel.icon size={19} />
                  </span>
                  <h3 className="font-display mt-4 text-lg font-bold text-gray-900">
                    {channel.title}
                  </h3>
                  <p className="mt-1 text-sm font-semibold text-brand-dark">{channel.body}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-gray-500">{channel.note}</p>
                </div>
              </Reveal>
            ))}

            <Reveal delay={0.24}>
              <div className="rounded-3xl border border-brand/25 bg-brand-soft p-6">
                <h3 className="font-display text-lg font-bold text-gray-900">
                  Looking for a quick answer?
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-600">
                  Budgets, CSV import, exports and data storage are already covered in the FAQ.
                </p>
                <Link
                  to="/faq"
                  className="mt-4 inline-flex rounded-full bg-ink px-6 py-2.5 text-[13px] font-bold text-white transition hover:bg-brand-dark"
                >
                  Read the FAQ
                </Link>
              </div>
            </Reveal>
          </aside>
        </div>
      </section>
    </>
  );
}

export default ContactPage;
