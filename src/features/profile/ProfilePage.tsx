import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import { Camera, FolderCog, Trash2, UserRound } from "lucide-react";
import type { UserProfile } from "../../types";
import {
  closeAccount,
  getProfile,
  removeAvatar,
  setAvatar,
  updateProfile,
} from "../../services/profileService";
import PageHeader from "../../components/PageHeader";
import ConfirmDialog from "../../components/ConfirmDialog";
import { Card, ErrorState } from "../../components/StateViews";
import { ListSkeleton } from "../../components/Skeletons";
import { toast } from "../../services/toast";

interface LayoutContext {
  openMenu: () => void;
}

const inputClass =
  "mt-1.5 h-11 w-full rounded-xl border border-line px-3 text-sm outline-none transition focus:border-brand";
const labelClass = "block text-[13px] font-medium text-gray-700";

const MAX_AVATAR_BYTES = 1.5 * 1024 * 1024;

function initialsOf(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "CC"
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-[13px] text-red-600">{message}</p>;
}

/** Profile screen: photo, editable details and account closure (§ user story). */
export function ProfilePage() {
  const { openMenu } = useOutletContext<LayoutContext>();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [avatarError, setAvatarError] = useState("");
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [closing, setClosing] = useState(false);
  const [closeError, setCloseError] = useState("");

  const fileRef = useRef<HTMLInputElement>(null);

  const fetchProfile = useCallback(() => {
    getProfile()
      .then((result) => {
        setProfile(result);
        setFullName(result.fullName);
        setEmail(result.email);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  /** Retry runs from the error card's button, never from the effect. */
  function load() {
    setLoading(true);
    setError(false);
    fetchProfile();
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    const result = await updateProfile({ fullName, email });
    setSaving(false);

    if (!result.ok || !result.data) {
      setFormErrors(result.errors ?? {});
      return;
    }
    setFormErrors({});
    setProfile(result.data);
    toast.success("Profile updated.");
  }

  async function handleAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setAvatarError("");
    if (!file.type.startsWith("image/")) {
      setAvatarError("Choose an image file (JPG or PNG).");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setAvatarError("That photo is over 1.5 MB. Pick a smaller one.");
      return;
    }

    setAvatarBusy(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("read failed"));
        reader.readAsDataURL(file);
      });
      const result = await setAvatar(dataUrl);
      if (result.ok && result.data) {
        setProfile(result.data);
        toast.success("Profile photo updated.");
      } else {
        setAvatarError(result.error ?? "We couldn't save that photo.");
      }
    } catch {
      setAvatarError("We couldn't read that file. Try another image.");
    } finally {
      setAvatarBusy(false);
    }
  }

  async function handleRemoveAvatar() {
    setAvatarBusy(true);
    const result = await removeAvatar();
    setAvatarBusy(false);
    if (result.ok && result.data) {
      setProfile(result.data);
      toast.success("Profile photo removed.");
    }
  }

  async function handleCloseAccount() {
    setClosing(true);
    setCloseError("");
    const result = await closeAccount();
    if (!result.ok) {
      setClosing(false);
      setCloseError(result.error ?? "We couldn't close the account.");
      return;
    }
    toast.success("Your account has been closed. Sorry to see you go.");
    navigate("/login", { replace: true });
  }

  const initials = initialsOf(fullName || profile?.fullName || "");

  return (
    <>
      <PageHeader
        title="Profile & settings"
        subtitle="Your photo, your details, your account."
        onOpenMenu={openMenu}
      />

      {loading && (
        <Card>
          <ListSkeleton rows={4} />
        </Card>
      )}

      {error && (
        <Card>
          <ErrorState onRetry={load} />
        </Card>
      )}

      {profile && (
        <div className="grid gap-5 lg:grid-cols-3">
          {/* Photo */}
          <Card title="Profile photo">
            <div className="flex flex-col items-center gap-4 py-2">
              <span className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-brand-soft text-xl font-semibold text-brand-dark">
                {profile.avatar ? (
                  <img
                    src={profile.avatar}
                    alt="Your profile"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <UserRound size={36} className="text-brand-dark/70" />
                )}
              </span>

              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={avatarBusy}
                  className="flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
                >
                  <Camera size={15} />
                  {avatarBusy ? "Saving…" : profile.avatar ? "Change photo" : "Upload photo"}
                </button>
                {profile.avatar && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    disabled={avatarBusy}
                    className="flex items-center gap-1.5 text-[13px] text-gray-500 transition hover:text-red-600 disabled:opacity-60"
                  >
                    <Trash2 size={13} />
                    Remove photo
                  </button>
                )}
              </div>

              <p className="text-[12px] text-gray-400">JPG or PNG, up to 1.5 MB.</p>
              {avatarError && <p className="text-[13px] text-red-600">{avatarError}</p>}

              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleAvatar}
                className="hidden"
                aria-label="Choose profile photo"
              />
            </div>
          </Card>

          {/* Details */}
          <Card title="Your details" className="lg:col-span-2">
            <form onSubmit={handleSave}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="profile-name" className={labelClass}>
                    Full name
                  </label>
                  <input
                    id="profile-name"
                    type="text"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="Your name"
                    className={inputClass}
                  />
                  <FieldError message={formErrors.fullName} />
                </div>
                <div>
                  <label htmlFor="profile-email" className={labelClass}>
                    Email
                  </label>
                  <input
                    id="profile-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    className={inputClass}
                  />
                  <FieldError message={formErrors.email} />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-brand px-5 py-2.5 text-sm font-medium text-white transition hover:bg-brand-dark disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save changes"}
                </button>
                {initials && (
                  <span className="ml-auto text-[13px] text-gray-400">
                    Shown as <span className="font-medium text-gray-600">{initials}</span> when no
                    photo is set
                  </span>
                )}
              </div>
            </form>
          </Card>

          {/* Category management lives here, not in the primary sidebar. */}
          <Card title="Categories" className="lg:col-span-3">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-dark">
                  <FolderCog size={18} />
                </span>
                <div>
                  <p className="text-sm text-gray-700">
                    Create, edit and delete your personal income and expense categories, and choose
                    the icon each one uses across the app.
                  </p>
                  <p className="mt-1 text-[13px] text-gray-500">
                    Defaults like Food, Transport and Allowance are managed in the same place.
                  </p>
                </div>
              </div>
              <Link
                to="/categories"
                className="shrink-0 rounded-xl border border-line bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                Manage categories
              </Link>
            </div>
          </Card>

          {/* Danger zone */}
          <Card title="Close account" className="lg:col-span-3 border border-red-100">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Closing your account removes your profile, transactions, budgets, categories,
                  insights and saved tips from this device.
                </p>
                <p className="mt-1 text-[13px] text-gray-500">This can't be undone.</p>
                {closeError && <p className="mt-2 text-[13px] text-red-600">{closeError}</p>}
              </div>
              <button
                type="button"
                onClick={() => setConfirmClose(true)}
                className="shrink-0 rounded-xl border border-red-200 bg-white px-5 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
              >
                Close account
              </button>
            </div>
          </Card>
        </div>
      )}

      {confirmClose && (
        <ConfirmDialog
          title="Close your account?"
          message="Your profile, transactions, budgets and categories will be permanently removed from this device. There is no way to get them back."
          confirmLabel={closing ? "Closing…" : "Close account"}
          danger
          onConfirm={handleCloseAccount}
          onCancel={() => {
            if (!closing) setConfirmClose(false);
          }}
        >
          {closeError && <p className="mt-3 text-[13px] text-red-600">{closeError}</p>}
        </ConfirmDialog>
      )}
    </>
  );
}

export default ProfilePage;
