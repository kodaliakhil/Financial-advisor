import { inngest } from "@/lib/inngest/client";
import {
  checkBudgetAlert,
  generateMonthlyReports,
  processRecurringRTransactions,
  triggerRecurringRTransactions,
} from "@/lib/inngest/functions";
import { serve } from "inngest/next";

// Create an API that serves zero functions
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    checkBudgetAlert,
    triggerRecurringRTransactions,
    processRecurringRTransactions,
    generateMonthlyReports,
  ],
});
