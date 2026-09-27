import { useEffect, useState, type FormEvent } from "react";
import { useOutletContext } from "react-router-dom";
import { UserRound } from "lucide-react";
import PageHeader from "../../components/PageHeader";
import { Card, ErrorState } from "../../components/StateViews";
import { ListSkeleton } from "../../components/Skeletons";
import { api } from "../../services/api";
import type { ApiUser } from "../../services/api/dto";
import { toServiceError } from "../../services/api/errors";
import { updateLiveProfile } from "../../auth/liveAuth";
import { toast } from "../../services/toast";

interface LayoutContext {
  openMenu: () => void;
}

const inputClass = "mt-1.5 h-11 w-full rounded-xl border border-line px-3 text-sm outline-none transition focus:border-brand disabled:bg-gray-50 disabled:text-gray-500";

export function LiveProfilePage() {
  const { openMenu } = useOutletContext<LayoutContext>();
  const [profile, setProfile] = useState<ApiUser | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingAi, setSavingAi] = useState(false);
  const [error, setError] = useState("");

  function load() {
    setLoading(true);
    setError("");
    api.request<ApiUser>("/users/me")
      .then((response) => {
        setProfile(response.data);
        setName(response.data.name);
      })
      .catch((requestError) => setError(toServiceError(requestError).error))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    api.request<ApiUser>("/users/me")
      .then((response) => {
        setProfile(response.data);
        setName(response.data.name);
      })
      .catch((requestError) => setError(toServiceError(requestError).error))
      .finally(() => setLoading(false));
  }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError("Enter your name.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const updated = await updateLiveProfile({ name: name.trim() });
      setProfile(updated);
      toast.success("Profile updated.");
    } catch (requestError) {
      setError(toServiceError(requestError).error);
    } finally {
      setSaving(false);
    }
  }

  async function toggleAi() {
    if (!profile || savingAi) return;
    setSavingAi(true);
    setError("");
    try {
      const updated = await updateLiveProfile({ ai_consent: !profile.ai_consent });
      setProfile(updated);
      toast.success(updated.ai_consent ? "AI suggestions enabled." : "AI suggestions disabled.");
    } catch (requestError) {
      setError(toServiceError(requestError).error);
    } finally {
      setSavingAi(false);
    }
  }

  return (
    <>
      <PageHeader title="Profile & settings" subtitle="Your saved Campus Coin account details." onOpenMenu={openMenu} />
      {loading && <Card><ListSkeleton rows={4} /></Card>}
      {!loading && error && !profile && <Card><ErrorState onRetry={load} /></Card>}
      {profile && (
        <div className="grid gap-5 lg:grid-cols-3">
          <Card title="Profile photo">
            <div className="flex flex-col items-center gap-3 py-3 text-center">
              <span className="flex h-24 w-24 items-center justify-center rounded-full bg-brand-soft text-brand-dark"><UserRound size={36} /></span>
              <p className="text-sm text-gray-600">Profile photo uploads are not available yet.</p>
            </div>
          </Card>
          <Card title="Your details" className="lg:col-span-2">
            <form onSubmit={save}>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-[13px] font-medium text-gray-700">Full name
                  <input value={name} onChange={(event) => setName(event.target.value)} className={inputClass} />
                </label>
                <label className="text-[13px] font-medium text-gray-700">Email
                  <input value={profile.email} disabled className={inputClass} />
                  <span className="mt-1 block font-normal text-gray-500">Email changes require a verification flow and are not available yet.</span>
                </label>
              </div>
              {error && <p className="mt-3 text-[13px] text-red-600">{error}</p>}
              <button type="submit" disabled={saving} className="mt-5 rounded-xl bg-brand px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60">
                {saving ? "Saving…" : "Save name"}
              </button>
            </form>
          </Card>
          <Card title="Onboarding profile" className="lg:col-span-3">
            <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div><dt className="text-gray-500">Academic level</dt><dd className="mt-1 font-medium">{profile.academic_year || "Not set"}</dd></div>
              <div><dt className="text-gray-500">Monthly income baseline</dt><dd className="mt-1 font-medium">₦{Number(profile.allowance_baseline).toLocaleString()}</dd></div>
              <div><dt className="text-gray-500">Savings goal</dt><dd className="mt-1 font-medium">₦{Number(profile.savings_goal).toLocaleString()}</dd></div>
              <div><dt className="text-gray-500">Timezone</dt><dd className="mt-1 font-medium">{profile.timezone}</dd></div>
            </dl>
          </Card>
          <Card title="AI category suggestions" className="lg:col-span-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-gray-700">Ask Luna to suggest categories when local rules cannot match.</p>
                <p className="mt-1 text-xs text-gray-500">Off by default. When on, a shortened, redacted transaction description may be sent to OpenAI only after you request a suggestion. You always choose the final category.</p>
              </div>
              <label className="flex shrink-0 items-center gap-2 text-sm font-medium" htmlFor="ai-consent">
                <input id="ai-consent" type="checkbox" role="switch" checked={profile.ai_consent} disabled={savingAi} onChange={() => void toggleAi()} className="h-5 w-5 accent-brand" />
                {profile.ai_consent ? "On" : "Off"}
              </label>
            </div>
          </Card>
          <Card title="Close account" className="lg:col-span-3 border border-red-100">
            <p className="text-sm text-gray-600">Self-service account closure is not available yet. No local-only deletion will be reported as account closure.</p>
            <button type="button" disabled className="mt-4 rounded-xl border border-red-100 px-5 py-2.5 text-sm font-medium text-red-300">Close account unavailable</button>
          </Card>
        </div>
      )}
    </>
  );
}
