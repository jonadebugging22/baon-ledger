import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export type Transaction = {
  id: string;
  user_id: string;
  entry_date: string;
  category: string;
  note: string | null;
  amount: number;
  kind: "expense" | "topup";
  created_at: string;
};

export type BudgetSetting = {
  user_id: string;
  period_amount: number;
  period_type: "weekly" | "monthly";
  period_start: string;
};

export const CATEGORIES = [
  "Baon/Pagkain",
  "Pamasahe",
  "Printing/Projects",
  "Load/Internet",
  "Iba pa",
];
