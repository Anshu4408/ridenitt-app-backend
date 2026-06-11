import { prisma } from "./prisma";
import "./config";

async function main() {
  try {
    const subs = await prisma.pushSubscription.findMany();
    console.log("Subscriptions in database:", JSON.stringify(subs, null, 2));
  } catch (err) {
    console.error("Database query failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
