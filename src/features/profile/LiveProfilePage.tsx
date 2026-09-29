import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { Camera, Trash2, UserRound } from "lucide-react";
import PageHeader from "../../components/PageHeader";
import ConfirmDialog from "../../components/ConfirmDialog";
import { Card, ErrorState } from "../../components/StateViews";
import { ListSkeleton } from "../../components/Skeletons";
import { api } from "../../services/api";
import type { ApiUser } from "../../services/api/dto";
import { toServiceError } from "../../services/api/errors";
import { updateLiveProfile } from "../../auth/liveAuth";
import { toast } from "../../services/toast";
import { ThemeSettings } from "./ThemeSettings";
import {
  deleteLiveAccount,
  removeProfileAvatar,
  uploadProfileAvatar,
} from "../../services/liveProfile";

interface LayoutContext {
  openMenu: () => void;
  darkMode: boolean;
  toggleTheme: () => void;
}

const inputClass = "mt-1.5 h-11 w-full rounded-xl border border-line px-3 text-sm outline-none transition focus:border-brand disabled:bg-gray-50 disabled:text-gray-500";
const MAX_AVATAR_BYTES = 1.5 * 1024 * 1024;
const AVATAR_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function LiveProfilePage() {
  const { openMenu, darkMode, toggleTheme } = useOutletContext<LayoutContext>();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<ApiUser | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

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

  async function handleAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setAvatarError("");
    if (!AVATAR_TYPES.has(file.type)) {
      setAvatarError("Choose a JPG, PNG or WebP image.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setAvatarError("That photo is over 1.5 MB. Pick a smaller one.");
      return;
    }
    setAvatarBusy(true);
    try {
      setProfile(await uploadProfileAvatar(file));
      toast.success("Profile photo updated.");
    } catch (requestError) {
      setAvatarError(
        requestError instanceof Error
          ? requestError.message
          : "The profile photo could not be uploaded.",
      );
    } finally {
      setAvatarBusy(false);
    }
  }

  async function handleRemoveAvatar() {
    setAvatarBusy(true);
    setAvatarError("");
    try {
      setProfile(await removeProfileAvatar());
      toast.success("Profile photo removed.");
    } catch (requestError) {
      setAvatarError(toServiceError(requestError).error);
    } finally {
      setAvatarBusy(false);
    }
  }

  async function handleDeleteAccount() {
    if (deleting) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await deleteLiveAccount();
      toast.success("Your account has been deleted.");
      navigate("/", { replace: true });
    } catch (requestError) {
      setDeleteError(toServiceError(requestError).error);
      setDeleting(false);
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
              <span className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-brand-soft text-brand-dark">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="Your profile" className="h-full w-full object-cover" />
                ) : (
                  <UserRound size={36} />
                )}
              </span>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={avatarBusy}
                className="flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
              >
                <Camera size={15} />
                {avatarBusy ? "Saving…" : profile.avatar_url ? "Change photo" : "Upload photo"}
              </button>
              {profile.avatar_url && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  disabled={avatarBusy}
                  className="flex items-center gap-1.5 text-[13px] text-gray-500 transition hover:text-red-600 disabled:opacity-60"
                >
                  <Trash2 size={13} /> Remove photo
                </button>
              )}
              <p className="text-xs text-gray-400">JPG, PNG or WebP, up to 1.5 MB.</p>
              {avatarError && <p className="text-[13px] text-red-600">{avatarError}</p>}
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleAvatar}
                className="hidden"
                aria-label="Choose profile photo"
              />
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
          <ThemeSettings darkMode={darkMode} onToggle={toggleTheme} />
          <Card title="Delete account" className="lg:col-span-3 border border-red-100">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">Permanently delete your profile and all of its financial data.</p>
                <p className="mt-1 text-[13px] text-gray-500">This cannot be undone.</p>
                {deleteError && <p className="mt-2 text-[13px] text-red-600">{deleteError}</p>}
              </div>
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="shrink-0 rounded-xl border border-red-200 bg-white px-5 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
              >
                Delete account
              </button>
            </div>
          </Card>
        </div>
      )}
      {confirmDelete && (
        <ConfirmDialog
          title="Delete your account?"
          message="Your profile, transactions, budgets, categories and profile photo will be permanently deleted. Are you sure?"
          confirmLabel={deleting ? "Deleting…" : "Delete account"}
          danger
          onConfirm={handleDeleteAccount}
          onCancel={() => { if (!deleting) setConfirmDelete(false); }}
        >
          {deleteError && <p className="mt-3 text-[13px] text-red-600">{deleteError}</p>}
        </ConfirmDialog>
      )}
    </>
  );
}
