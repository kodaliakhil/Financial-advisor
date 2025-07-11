"use server";

import { db } from "@/lib/prisma";
import authenticateUser from "./utils/authenticateUser";
import { revalidatePath } from "next/cache";
import { request } from "@arcjet/next";
import aj from "@/lib/arcjet/arcjet";
import { GoogleGenAI } from "@google/genai";

const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY);

const serializeAmount = (obj) => ({
  ...obj,
  amount: obj.amount.toNumber(),
});

export async function createTransaction(data) {
  try {
    const user = await authenticateUser();

    //Get request data for ArcJet
    const req = await request();
    //Check rate Limit
    const decision = await aj.protect(req, { userId: user.id, requested: 1 });
    if (decision.isDenied()) {
      if (decision.reason.isRateLimit()) {
        const { remaining, reset } = decision.reason;
        console.log({
          code: "RATE_LIMIT_EXCEEDED",
          details: {
            remaining,
            resetInSeconds: reset,
          },
        });
        throw new Error("Too many requests, please try again later.");
      }
      throw new Error("Request denied.");
    }
    const account = await db.account.findUnique({
      where: { id: data.accountId, userId: user.id },
    });
    if (!account) {
      throw new Error("Account not found");
    }

    const balanceChange = data.type === "INCOME" ? data.amount : -data.amount;
    const newBalance = account.balance.toNumber() + balanceChange;
    const transaction = await db.$transaction(async (tx) => {
      const newTransaction = await tx.transaction.create({
        data: {
          ...data,
          userId: user.id,
          nextRecurringDate:
            data.isRecurring && data.recurringInterval
              ? calculateNextRecurringDate(data.date, data.recurringInterval)
              : null,
        },
      });
      await tx.account.update({
        where: { id: data.accountId },
        data: { balance: newBalance },
      });
      return newTransaction;
    });
    revalidatePath("/dashboard");
    revalidatePath(`/account/${transaction.accountId}`);
    return { success: true, data: serializeAmount(transaction) };
  } catch (error) {
    throw new Error(error.message);
  }
}

function calculateNextRecurringDate(startDate, interval) {
  const date = new Date(startDate);
  switch (interval) {
    case "DAILY":
      date.setDate(date.getDate() + 1);
      break;
    case "WEEKLY":
      date.setDate(date.getDate() + 7);
      break;
    case "MONTHLY":
      date.setMonth(date.getMonth() + 1);
      break;
    case "YEARLY":
      date.setFullYear(date.getFullYear() + 1);
      break;
    default:
      break;
  }
  return date;
}

export async function scanReceipt(file) {
  try {
    // Convert file to Array buffer
    const arrayBuffer = await file.arrayBuffer();
    // Convert array buffer to base64
    const base64String = Buffer.from(arrayBuffer).toString("base64");
    const prompt = `Analyze this receipt image and extract the following information in JSON format:
      - Total amount (just the number)
      - Date (in ISO format)
      - Description or items purchased (brief summary)
      - Merchant/store name
      - Suggested category (one of: housing,transportation,groceries,utilities,entertainment,food,shopping,healthcare,education,personal,travel,insurance,gifts,bills,other-expense )
      
      Only respond with valid JSON in this exact format:
      {
        "amount": number,
        "date": "ISO date string",
        "description": "string",
        "merchantName": "string",
        "category": "string"
      }

      If its not a recipt, return an empty object`;

    const result = await genAI.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [
        {
          inlineData: {
            data: base64String,
            mimeType: file.type,
          },
        },
        prompt,
      ],
    });
    const text = await result.text;
    const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();
    try {
      const data = JSON.parse(cleanedText);
      return {
        amount: parseFloat(data.amount),
        date: new Date(data.date),
        description: data.description,
        merchantName: data.merchantName,
        category: data.category,
      };
    } catch (parseError) {
      console.error("Error parsing JSON:", parseError);
      throw new Error("Invalid response format from Gemini");
    }
  } catch (error) {
    console.error("Error scanning receipt:", error);
    throw new Error("Error scanning receipt");
  }
}
