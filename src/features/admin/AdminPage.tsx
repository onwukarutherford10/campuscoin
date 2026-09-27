import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BarChart3, Eye, EyeOff, FolderOpen, LogOut, Megaphone, Search, ShieldCheck, Users } from "lucide-react";
import { BrandMark } from "../../components/BrandMark";
import { Card, EmptyState, ErrorState } from "../../components/StateViews";
import AuthShell from "../auth/AuthShell";
import { adminLogin, logout, restoreSession } from "../../auth/liveAuth";
import { useLiveAuth } from "../../auth/useLiveAuth";
import { adminApi, type AdminContent, type AdminUsage } from "../../services/adminApi";
import { toServiceError } from "../../services/api/errors";
import type { ApiCategory, ApiUser } from "../../services/api/dto";
import { toast } from "../../services/toast";

type Tab = "overview" | "users" | "categories" | "content";
const tabs: { id: Tab; label: string; icon: typeof BarChart3 }[] = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "users", label: "Users", icon: Users },
  { id: "categories", label: "Categories", icon: FolderOpen },
  { id: "content", label: "Announcements & tips", icon: Megaphone },
];
const button = "rounded-xl border border-line px-3 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50";

function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await adminLogin(email.trim(), password);
      navigate("/admin", { replace: true });
    } catch (cause) {
      setError(toServiceError(cause).error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Administrator access" subtitle="Sign in to manage Campus Coin accounts and defaults."
      art={{ src: "/art/auth-art.jpg", alt: "Campus Coin campus scene" }}
      footer={<p>Student account? <Link to="/login" className="font-medium text-brand-dark underline">Use student login</Link></p>}>
      <form onSubmit={(event) => void submit(event)} className="mt-7 space-y-5">
        <div><label htmlFor="admin-email" className="text-[13px] font-medium text-gray-700">Email address</label>
          <input id="admin-email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)}
            className="mt-1.5 h-12 w-full rounded-xl border border-line px-3.5 text-sm outline-none focus:border-brand" /></div>
        <div><label htmlFor="admin-password" className="text-[13px] font-medium text-gray-700">Password</label>
          <div className="relative"><input id="admin-password" type={showPassword ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)}
            className="mt-1.5 h-12 w-full rounded-xl border border-line px-3.5 pr-12 text-sm outline-none focus:border-brand" />
            <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((shown) => !shown)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-gray-400 hover:text-gray-700">
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button></div></div>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={busy} className="h-12 w-full rounded-xl bg-brand font-medium text-white transition hover:bg-brand-dark disabled:opacity-60">
          {busy ? "Signing in…" : "Sign in to control panel"}
        </button>
        <Link to="/forgetpassword?admin=1" className="block w-fit text-[13px] font-medium text-brand-dark underline">Forgot password?</Link>
      </form>
    </AuthShell>
  );
}

export default function AdminPage() {
  const auth = useLiveAuth();
  useEffect(() => { void restoreSession(); }, []);
  if (auth.status === "loading") return <main className="p-10 text-center text-gray-600">Checking administrator session…</main>;
  if (auth.status === "error") return <main className="p-10 text-center"><ErrorState onRetry={() => void restoreSession()} /></main>;
  if (!auth.user) return <AdminLogin />;
  if (auth.user.role !== "admin") return (
    <main className="mx-auto max-w-xl p-8 text-center">
      <ShieldCheck className="mx-auto mb-4 text-brand" size={36} />
      <h1 className="text-xl font-semibold">Administrator access required</h1>
      <p className="mt-2 text-sm text-gray-600">You are signed in with a student account. Sign out before using an administrator account.</p>
      <button onClick={() => void logout()} className="mt-5 rounded-xl bg-brand px-5 py-3 text-sm font-medium text-white">Sign out</button>
    </main>
  );
  return <AdminDashboard user={auth.user} />;
}

function AdminDashboard({ user }: { user: ApiUser }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [usage, setUsage] = useState<AdminUsage | null>(null);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [content, setContent] = useState<AdminContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"income" | "expense">("expense");
  const [contentKind, setContentKind] = useState<"announcement" | "tip_template">("announcement");
  const [contentTitle, setContentTitle] = useState("");
  const [contentBody, setContentBody] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [nextUsage, nextUsers, nextCategories, nextContent] = await Promise.all([adminApi.usage(), adminApi.users(), adminApi.categories(), adminApi.content()]);
      setUsage(nextUsage); setUsers(nextUsers); setCategories(nextCategories); setContent(nextContent);
    } catch (cause) { setError(toServiceError(cause).error); }
    finally { setLoading(false); }
  }
  useEffect(() => { void Promise.resolve().then(load); }, []);

  async function act(key: string, operation: () => Promise<unknown>, message: string) {
    setBusy(key);
    try { await operation(); await load(); toast.success(message); return true; }
    catch (cause) { toast.error(toServiceError(cause).error); return false; }
    finally { setBusy(""); }
  }

  const filtered = users.filter((item) => `${item.name} ${item.email}`.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="min-h-screen bg-canvas text-gray-900">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5">
          <div className="flex items-center gap-4"><BrandMark /><span className="rounded-full bg-brand-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-brand-dark">Admin</span></div>
          <button onClick={() => void logout()} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"><LogOut size={17} /> Sign out</button>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-5 py-8">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-brand-dark">Campus Coin / Administration</p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <div><h1 className="font-display text-3xl font-semibold">Control panel</h1><p className="mt-1 text-sm text-gray-500">Welcome back, {user.name}. Manage the essentials from one place.</p></div>
          <span className="rounded-full border border-line bg-white px-3 py-1.5 text-xs text-gray-500">{user.email}</span>
        </div>
        <nav aria-label="Admin sections" className="mt-8 flex gap-2 overflow-x-auto border-b border-line">
          {tabs.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => setTab(id)} aria-current={tab === id ? "page" : undefined}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition ${tab === id ? "border-brand text-brand-dark" : "border-transparent text-gray-500 hover:text-gray-900"}`}><Icon size={16} />{label}</button>)}
        </nav>
        {loading ? <p role="status" className="py-12 text-sm text-gray-500">Loading admin data…</p> : error ? <div className="mt-8"><ErrorState onRetry={() => void load()} /></div> : (
          <div className="mt-7">
            {tab === "overview" && usage && <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[["Active users", usage.active_users], ["Total users", usage.users], ["Transactions logged", usage.total_transactions_logged], ["Budgets", usage.budgets], ["Notifications", usage.notifications], ["Jobs", usage.jobs]].map(([label, value]) =>
                  <Card key={label}><p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p><p className="mt-3 font-display text-3xl font-semibold text-gray-900">{Number(value).toLocaleString()}</p></Card>)}
              </div>
              <Card title="Most-used categories" className="mt-5">{usage.most_used_categories.length ? <ol className="mt-2 space-y-3">{usage.most_used_categories.map((category, index) => <li key={category.id} className="flex items-center justify-between gap-3 text-sm"><span>{index + 1}. {category.name} <span className="text-gray-500">({category.type})</span></span><span className="font-semibold">{category.transactions.toLocaleString()}</span></li>)}</ol> : <p className="text-sm text-gray-500">No transactions logged yet.</p>}</Card>
              <Card title="System announcements & tip templates" className="mt-5"><p className="text-sm text-gray-500">{content.filter((item) => item.is_active && item.kind === "announcement").length} active announcements · {content.filter((item) => item.is_active && item.kind === "tip_template").length} active tip templates</p><button type="button" className="mt-3 text-sm font-medium text-brand-dark underline" onClick={() => setTab("content")}>Manage content</button></Card>
            </>}
            {tab === "users" && <>
              <div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">User accounts <span className="text-gray-400">({users.length})</span></h2>
                <div className="relative"><Search size={16} className="absolute left-3 top-2.5 text-gray-400" /><input aria-label="Search users" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search users" className="rounded-xl border border-line bg-white py-2 pl-9 pr-3 text-sm" /></div></div>
              {filtered.length === 0 ? <EmptyState title="No users found" description="Try a different name or email." /> : <div className="space-y-3">{filtered.map((item) =>
                <Card key={item.id}><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="font-medium">{item.name} <span className="ml-2 text-xs text-gray-400">{item.role}</span></p><p className="text-sm text-gray-500">{item.email}</p><p className={`mt-1 text-xs ${item.is_active ? "text-brand-dark" : "text-red-600"}`}>{item.is_active ? "Active" : "Disabled"}</p></div>
                  <div className="flex flex-wrap gap-2"><button disabled={Boolean(busy)} className={button} onClick={() => void act(item.id, () => adminApi.revokeSessions(item.id), "Sessions revoked")}>Revoke sessions</button>
                    <button disabled={Boolean(busy) || !item.is_active} className={button} onClick={() => void act(item.id, async () => { const result = await adminApi.sendResetCode(item.id); if (!result.data.initiated) throw new Error("Could not send a code. Try again shortly."); }, "Reset code emailed")}>Send reset code</button>
                    <button disabled={Boolean(busy) || !item.is_active || item.id === user.id} className={`${button} text-red-600`} onClick={() => { if (window.confirm(`Disable ${item.name}? Their sessions will be revoked.`)) void act(item.id, () => adminApi.disableUser(item.id), "Account disabled"); }}>Disable</button></div></div></Card>)}</div>}
            </>}
            {tab === "categories" && <>
              <h2 className="text-lg font-semibold">Default categories</h2><p className="mt-1 text-sm text-gray-500">Available to every student. Deactivation keeps existing transaction history intact.</p>
              <form className="mt-5 flex flex-wrap gap-3 rounded-2xl bg-white p-4" onSubmit={(event) => { event.preventDefault(); if (!name.trim()) return; void act("category", () => adminApi.createCategory(name.trim(), kind), "Category created").then((saved) => { if (saved) setName(""); }); }}>
                <input aria-label="Category name" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} required placeholder="New category name" className="min-w-48 flex-1 rounded-xl border border-line px-3 py-2 text-sm" />
                <select aria-label="Category type" value={kind} onChange={(event) => setKind(event.target.value as "income" | "expense")} className="rounded-xl border border-line bg-white px-3 py-2 text-sm"><option value="expense">Expense</option><option value="income">Income</option></select>
                <button disabled={Boolean(busy)} className="rounded-xl bg-brand px-5 py-2 text-sm font-medium text-white disabled:opacity-50">Add category</button>
              </form>
              <div className="mt-5 grid gap-4 md:grid-cols-2">{categories.filter((item) => item.is_active).map((item) => <Card key={item.id}>
                <div className="flex items-center justify-between gap-2"><div><p className="font-medium">{item.name}</p><p className="text-xs capitalize text-gray-500">{item.type}</p></div><div className="flex gap-2">
                  <button disabled={Boolean(busy)} className={button} onClick={() => { const next = window.prompt("Category name", item.name)?.trim(); if (next && next !== item.name) void act(item.id, () => adminApi.renameCategory(item.id, next), "Category updated"); }}>Rename</button>
                  <button disabled={Boolean(busy)} className={`${button} text-red-600`} onClick={() => { if (window.confirm(`Deactivate ${item.name}?`)) void act(item.id, () => adminApi.removeCategory(item.id), "Category deactivated"); }}>Remove</button>
                </div></div></Card>)}</div>
            </>}
            {tab === "content" && <>
              <h2 className="text-lg font-semibold">System messages</h2><p className="mt-1 text-sm text-gray-500">Announcements reach students through notifications. Active tip templates appear alongside personalized saving tips.</p>
              <form className="mt-5 space-y-3 rounded-2xl border border-line bg-white p-5" onSubmit={(event) => { event.preventDefault(); if (!contentTitle.trim() || !contentBody.trim()) return; void act("content", () => adminApi.createContent({ kind: contentKind, title: contentTitle.trim(), body: contentBody.trim() }), "Message published").then((saved) => { if (saved) { setContentTitle(""); setContentBody(""); } }); }}>
                <select aria-label="Message type" value={contentKind} onChange={(event) => setContentKind(event.target.value as typeof contentKind)} className="rounded-xl border border-line bg-white px-3 py-2 text-sm"><option value="announcement">Announcement</option><option value="tip_template">Tip template</option></select>
                <input aria-label="Message title" value={contentTitle} onChange={(event) => setContentTitle(event.target.value)} maxLength={100} required placeholder="Title" className="block w-full rounded-xl border border-line px-3 py-2 text-sm" />
                <textarea aria-label="Message body" value={contentBody} onChange={(event) => setContentBody(event.target.value)} maxLength={2000} required rows={3} placeholder="Message for students" className="block w-full rounded-xl border border-line px-3 py-2 text-sm" />
                <button disabled={Boolean(busy)} className="rounded-xl bg-brand px-5 py-2 text-sm font-medium text-white disabled:opacity-50">Publish</button>
              </form>
              <div className="mt-5 space-y-3">{content.map((item) => <Card key={item.id}><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0 flex-1"><p className="text-xs font-semibold uppercase tracking-wider text-brand-dark">{item.kind === "announcement" ? "Announcement" : "Tip template"} · {item.is_active ? "Active" : "Inactive"}</p><h3 className="mt-1 font-semibold">{item.title}</h3><p className="mt-1 whitespace-pre-wrap text-sm text-gray-600">{item.body}</p></div><div className="flex gap-2"><button className={button} disabled={Boolean(busy)} onClick={() => { const title = window.prompt("Title", item.title); if (title === null) return; const body = window.prompt("Message", item.body); if (body !== null) void act(item.id, () => adminApi.updateContent(item.id, { title, body }), "Message updated"); }}>Edit</button><button className={button} disabled={Boolean(busy)} onClick={() => void act(item.id, () => adminApi.updateContent(item.id, { is_active: !item.is_active }), item.is_active ? "Message paused" : "Message activated")}>{item.is_active ? "Pause" : "Activate"}</button><button className={`${button} text-red-600`} disabled={Boolean(busy) || !item.is_active} onClick={() => { if (window.confirm(`Deactivate ${item.title}?`)) void act(item.id, () => adminApi.removeContent(item.id), "Message deactivated"); }}>Remove</button></div></div></Card>)}{content.length === 0 && <EmptyState title="No messages yet" description="Publish an announcement or tip template above." />}</div>
            </>}
          </div>
        )}
      </div>
    </div>
  );
}
