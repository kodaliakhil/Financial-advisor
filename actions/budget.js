"use server";

import { db } from "@/lib/prisma";
import authenticateUser from "./utils/authenticateUser";
import { revalidatePath } from "next/cache";

export async function getCurrentBudget(accountId) {
  try {
    const user = await authenticateUser();
    const budget = await db.budget.findFirst({
      where: {
        userId: user.id,
      },
    });
    const currentDate = new Date();
    const startOfMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1
    );
    const endOfMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      0
    );

    const expenses = await db.transaction.aggregate({
      where: {
        userId: user.id,
        type: "EXPENSE",
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
        accountId,
      },
      _sum: {
        amount: true,
      },
    });
    return {
      budget: budget ? { ...budget, amount: budget.amount.toNumber() } : null,
      currentExpenses: expenses._sum.amount
        ? expenses._sum.amount.toNumber()
        : 0,
    };
  } catch (error) {
    console.log("Error getting current budget", error);
    throw error;
  }
}

export async function updateBudget(amount) {
  try {
    const user = await authenticateUser();

    const budget = await db.budget.upsert({
      where: {
        userId: user.id,
      },
      update: {
        amount,
      },
      create: {
        userId: user.id,
        amount,
      },
    });

    revalidatePath("/dashboard");
    return {
      success: true,
      data: { ...budget, amount: budget.amount.toNumber() },
    };
  } catch (error) {
    console.log("Error updating budget", error);
    throw { success: false, error: error.message };
  }
}
