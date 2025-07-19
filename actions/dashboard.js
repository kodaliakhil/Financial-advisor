"use server";

import { db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import serializeTransaction from "./utils/serializeTransaction";
import authenticateUser from "./utils/authenticateUser";

// const serializeTransaction = (obj) => {
//   const serialized = { ...obj };

//   // if(obj.balance) {
//   //     serialized.balance = obj.balance.toString();
//   // }
//   if (obj.balance) {
//     serialized.balance = obj.balance.toNumber();
//   }
//   if (obj.amount) {
//     serialized.amount = obj.amount.toNumber();
//   }
//   return serialized;
// };

export async function createAccount(data) {
  try {
    const user = await authenticateUser();

    // Convert balance to float before saving
    const balanceFloat = parseFloat(data.balance);
    if (isNaN(balanceFloat)) {
      throw new Error("Invalid balance amount");
    }
    const existingAccounts = await db.account.findMany({
      where: { userId: user.id },
    });
    //If the account is the first one, make it default or if the user wants to make it default
    const shouldBeDefault =
      existingAccounts.length === 0 ? true : data.isDefault;
    // If one of the account is selected to be default, Uset other acount that is default already.
    if (shouldBeDefault) {
      await db.account.updateMany({
        where: { userId: user.id, isDefault: true },
        data: { isDefault: false },
      });
    }
    const account = await db.account.create({
      data: {
        ...data,
        balance: balanceFloat,
        userId: user.id,
        isDefault: shouldBeDefault,
      },
    });

    const serializedAccount = serializeTransaction(account);

    revalidatePath("/dashboard");
    return { success: true, data: serializedAccount };
  } catch (error) {
    throw new Error(error.message);
  }
}

export async function getUserAccounts() {
  try {
    const user = await authenticateUser();
    const accounts = await db.account.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            transactions: true,
          },
        },
      },
    });
    const serializedAccount = accounts.map(serializeTransaction);
    return serializedAccount;
  } catch (error) {
    throw new Error(error.message);
  }
}

export async function getDashboardData() {
  try {
    const user = await authenticateUser();

    //Get all user Transactions
    const transactions = await db.transaction.findMany({
      where: { userId: user.id },
      orderBy: { date: "desc" },
    });
    return transactions.map(serializeTransaction);
  } catch (error) {
    console.log(error);
  }
}
