"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient, Transaction, BudgetSetting, CATEGORIES } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";

const supabase = createClient();

export default function Home() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="font-mono text-inkFaint text-sm">binubuksan ang ledger…</p>
      </main>
    );
  }

  return session ? <Ledger session={session} /> : <AuthGate />;
}

function AuthGate() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);
    const fn =
      mode === "signin"
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({ email, password });
    const { error } = await fn;
    setLoading(false);
    if (error) setError(error.message);
    else if (mode === "signup") setNotice("Nagawa na ang account. Mag-sign in ka na.");
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 bg-paper">
      <div className="w-full max-w-sm fade-in">
        <div className="text-center mb-8">
          <h1 className="font-display italic font-semibold text-3xl text-ink">
            Baon Ledger
          </h1>
          <p className="font-mono text-xs text-inkFaint mt-1 tracking-wide">
            araw-araw na tala ng gastos
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-paper border border-paperLine p-6 shadow-[3px_3px_0_#C9C2B4]"
        >
          <label className="block font-mono text-xs text-inkFaint mb-1">email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-transparent border-b border-paperLine focus:border-ledger outline-none py-2 mb-4 font-body text-ink"
            placeholder="ikaw@halimbawa.com"
          />
          <label className="block font-mono text-xs text-inkFaint mb-1">password</label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-transparent border-b border-paperLine focus:border-ledger outline-none py-2 mb-5 font-body text-ink"
            placeholder="••••••••"
          />

          {error && <p className="text-warn text-sm mb-3">{error}</p>}
          {notice && <p className="text-ledger text-sm mb-3">{notice}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-ledger hover:bg-ledgerDark text-paper font-body font-medium py-2.5 transition-colors disabled:opacity-60"
          >
            {loading ? "sandali…" : mode === "signin" ? "Mag-sign in" : "Gumawa ng account"}
          </button>
        </form>

        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="w-full text-center text-sm text-inkFaint mt-4 underline decoration-paperLine underline-offset-4"
        >
          {mode === "signin" ? "Wala pang account? Mag-sign up" : "May account na? Mag-sign in"}
        </button>
      </div>
    </main>
  );
}

function Ledger({ session }: { session: Session }) {
  const userId = session.user.id;
  const [budget, setBudget] = useState<BudgetSetting | null>(null);
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);

  async function loadAll() {
    setLoading(true);
    const [b, t] = await Promise.all([
      supabase.from("budget_settings").select("*").eq("user_id", userId).maybeSingle(),
      supabase
        .from("transactions")
        .select("*")
        .eq("user_id", userId)
        .order("entry_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(100),
    ]);
    setBudget(b.data as BudgetSetting | null);
    setTxns((t.data as Transaction[]) ?? []);
    setLoading(false);
    if (!b.data) setShowSetup(true);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { spent, remaining, periodLabel } = useMemo(() => {
    if (!budget) return { spent: 0, remaining: 0, periodLabel: "" };
    const start = new Date(budget.period_start);
    const now = new Date();
    let cursor = new Date(start);
    const spanDays = budget.period_type === "weekly" ? 7 : 30;
    while (
      Math.floor((now.getTime() - cursor.getTime()) / 86400000) >= spanDays
    ) {
      cursor = new Date(cursor.getTime() + spanDays * 86400000);
    }
    const periodTxns = txns.filter((t) => new Date(t.entry_date) >= cursor);
    const spentAmt = periodTxns
      .filter((t) => t.kind === "expense")
      .reduce((s, t) => s + Number(t.amount), 0);
    const topupAmt = periodTxns
      .filter((t) => t.kind === "topup")
      .reduce((s, t) => s + Number(t.amount), 0);
    const label = `${cursor.toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
    })} – ${budget.period_type === "weekly" ? "linggo" : "buwan"} na ito`;
    return {
      spent: spentAmt,
      remaining: budget.period_amount + topupAmt - spentAmt,
      periodLabel: label,
    };
  }, [budget, txns]);

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    txns
      .filter((t) => t.kind === "expense")
      .forEach((t) => {
        map[t.category] = (map[t.category] || 0) + Number(t.amount);
      });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [txns]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="font-mono text-inkFaint text-sm">binubuksan ang ledger…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-paper pb-24">
      <header className="border-b border-paperLine px-5 py-4 flex items-center justify-between sticky top-0 bg-paper/95 backdrop-blur z-10">
        <h1 className="font-display italic font-semibold text-xl text-ink">
          Baon Ledger
        </h1>
        <button
          onClick={() => supabase.auth.signOut()}
          className="font-mono text-xs text-inkFaint underline underline-offset-4"
        >
          sign out
        </button>
      </header>

      <div className="max-w-md mx-auto px-5">
        {showSetup || !budget ? (
          <BudgetSetup
            userId={userId}
            existing={budget}
            onSaved={(b) => {
              setBudget(b);
              setShowSetup(false);
            }}
            onCancel={() => setShowSetup(false)}
          />
        ) : (
          <>
            <section className="tape mt-8 mb-6 bg-white/40 border border-paperLine p-5 text-center fade-in">
              <p className="font-mono text-xs text-inkFaint uppercase tracking-widest">
                {periodLabel}
              </p>
              <p
                className={`font-mono text-4xl font-semibold mt-2 ${
                  remaining < 0 ? "text-warn" : "text-ledgerDark"
                }`}
              >
                ₱{remaining.toFixed(2)}
              </p>
              <p className="font-body text-sm text-inkFaint mt-1">natitira</p>
              <div className="flex justify-between font-mono text-xs text-inkFaint mt-4 pt-3 border-t border-paperLine">
                <span>gastos: ₱{spent.toFixed(2)}</span>
                <span>allowance: ₱{Number(budget.period_amount).toFixed(2)}</span>
              </div>
              <button
                onClick={() => setShowSetup(true)}
                className="mt-3 font-mono text-[11px] text-inkFaint underline underline-offset-4"
              >
                baguhin ang allowance
              </button>
            </section>

            {byCategory.length > 0 && (
              <section className="mb-6">
                <h2 className="font-mono text-xs text-inkFaint uppercase tracking-widest mb-2">
                  saan napunta
                </h2>
                <div className="space-y-2">
                  {byCategory.map(([cat, amt]) => {
                    const pct = spent > 0 ? (amt / spent) * 100 : 0;
                    return (
                      <div key={cat}>
                        <div className="flex justify-between font-body text-sm text-ink mb-1">
                          <span>{cat}</span>
                          <span className="font-mono">₱{amt.toFixed(2)}</span>
                        </div>
                        <div className="h-1.5 bg-paperLine/50 w-full">
                          <div
                            className="h-1.5 bg-ledger"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            <AddEntry
              userId={userId}
              onAdded={(t) => setTxns((prev) => [t, ...prev])}
            />

            <section className="mt-8">
              <h2 className="font-mono text-xs text-inkFaint uppercase tracking-widest mb-2">
                mga tala
              </h2>
              <div className="border-t border-paperLine">
                {txns.length === 0 && (
                  <p className="font-body text-sm text-inkFaint py-6 text-center">
                    Wala pang entry. Idagdag ang una mong gastos sa itaas.
                  </p>
                )}
                {txns.map((t) => (
                  <div
                    key={t.id}
                    className="ledger-rule py-3 flex items-center justify-between fade-in"
                  >
                    <div>
                      <p className="font-body text-sm text-ink">
                        {t.category}
                        {t.note && (
                          <span className="text-inkFaint"> — {t.note}</span>
                        )}
                      </p>
                      <p className="font-mono text-[11px] text-inkFaint mt-0.5">
                        {new Date(t.entry_date).toLocaleDateString("en-PH", {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <p
                      className={`font-mono text-sm font-medium ${
                        t.kind === "topup" ? "text-ledger" : "text-ink"
                      }`}
                    >
                      {t.kind === "topup" ? "+" : "−"}₱{Number(t.amount).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function BudgetSetup({
  userId,
  existing,
  onSaved,
  onCancel,
}: {
  userId: string;
  existing: BudgetSetting | null;
  onSaved: (b: BudgetSetting) => void;
  onCancel: () => void;
}) {
  const [amount, setAmount] = useState(existing ? String(existing.period_amount) : "");
  const [type, setType] = useState<"weekly" | "monthly">(
    existing?.period_type ?? "weekly"
  );
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const payload: BudgetSetting = {
      user_id: userId,
      period_amount: parseFloat(amount) || 0,
      period_type: type,
      period_start: existing?.period_start ?? new Date().toISOString().slice(0, 10),
    };
    const { data } = await supabase
      .from("budget_settings")
      .upsert(payload)
      .select()
      .single();
    setSaving(false);
    if (data) onSaved(data as BudgetSetting);
  }

  return (
    <section className="mt-8 bg-white/40 border border-paperLine p-5 fade-in">
      <h2 className="font-display font-semibold text-lg text-ink mb-4">
        Itakda ang allowance
      </h2>
      <label className="block font-mono text-xs text-inkFaint mb-1">halaga (₱)</label>
      <input
        type="number"
        inputMode="decimal"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="500"
        className="w-full bg-transparent border-b border-paperLine focus:border-ledger outline-none py-2 mb-4 font-mono text-lg text-ink"
      />
      <label className="block font-mono text-xs text-inkFaint mb-2">bawat</label>
      <div className="flex gap-2 mb-5">
        {(["weekly", "monthly"] as const).map((opt) => (
          <button
            key={opt}
            onClick={() => setType(opt)}
            className={`flex-1 py-2 font-body text-sm border ${
              type === opt
                ? "bg-ledger text-paper border-ledger"
                : "border-paperLine text-inkFaint"
            }`}
          >
            {opt === "weekly" ? "linggo" : "buwan"}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        {existing && (
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 font-body text-sm border border-paperLine text-inkFaint"
          >
            kanselahin
          </button>
        )}
        <button
          onClick={save}
          disabled={saving || !amount}
          className="flex-1 bg-ledger hover:bg-ledgerDark text-paper font-body text-sm font-medium py-2.5 disabled:opacity-60"
        >
          {saving ? "sinesave…" : "i-save"}
        </button>
      </div>
    </section>
  );
}

function AddEntry({
  userId,
  onAdded,
}: {
  userId: string;
  onAdded: (t: Transaction) => void;
}) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"expense" | "topup">("expense");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;
    setSaving(true);
    const { data } = await supabase
      .from("transactions")
      .insert({
        user_id: userId,
        entry_date: new Date().toISOString().slice(0, 10),
        category: kind === "topup" ? "Top-up" : category,
        note: note || null,
        amount: amt,
        kind,
      })
      .select()
      .single();
    setSaving(false);
    if (data) {
      onAdded(data as Transaction);
      setAmount("");
      setNote("");
      setOpen(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full bg-ink text-paper font-body font-medium py-3 mt-2"
      >
        + Idagdag ang gastos
      </button>
    );
  }

  return (
    <section className="mt-2 bg-white/40 border border-paperLine p-5 fade-in">
      <div className="flex gap-2 mb-4">
        {(["expense", "topup"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={`flex-1 py-2 font-body text-sm border ${
              kind === k
                ? "bg-ink text-paper border-ink"
                : "border-paperLine text-inkFaint"
            }`}
          >
            {k === "expense" ? "gastos" : "dagdag na pera"}
          </button>
        ))}
      </div>

      {kind === "expense" && (
        <>
          <label className="block font-mono text-xs text-inkFaint mb-1">kategorya</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-transparent border-b border-paperLine focus:border-ledger outline-none py-2 mb-4 font-body text-ink"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </>
      )}

      <label className="block font-mono text-xs text-inkFaint mb-1">halaga (₱)</label>
      <input
        type="number"
        inputMode="decimal"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="50"
        className="w-full bg-transparent border-b border-paperLine focus:border-ledger outline-none py-2 mb-4 font-mono text-lg text-ink"
      />

      <label className="block font-mono text-xs text-inkFaint mb-1">note (opsyonal)</label>
      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="hal. jeep papuntang school"
        className="w-full bg-transparent border-b border-paperLine focus:border-ledger outline-none py-2 mb-5 font-body text-sm text-ink"
      />

      <div className="flex gap-2">
        <button
          onClick={() => setOpen(false)}
          className="flex-1 py-2.5 font-body text-sm border border-paperLine text-inkFaint"
        >
          kanselahin
        </button>
        <button
          onClick={submit}
          disabled={saving || !amount}
          className="flex-1 bg-ledger hover:bg-ledgerDark text-paper font-body text-sm font-medium py-2.5 disabled:opacity-60"
        >
          {saving ? "sinesave…" : "i-save"}
        </button>
      </div>
    </section>
  );
}
