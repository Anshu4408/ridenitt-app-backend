import { prisma } from "./prisma";
import "./config";

async function main() {
  try {
    const subs = await prisma.pushSubscription.findMany();
    console.log("Found total subscriptions in database:", subs.length);
    
    const expoSubs = subs.filter(sub => 
      sub.endpoint.startsWith("ExponentPushToken") || 
      sub.endpoint.startsWith("ExpoPushToken")
    );
    
    console.log("Expo push tokens found:", expoSubs.length);
    if (expoSubs.length > 0) {
      console.log("Expo tokens details:", JSON.stringify(expoSubs, null, 2));
    }
    
    if (expoSubs.length === 0) {
      console.log("\n❌ No Expo push tokens registered in the database yet.");
      console.log("Make sure you are logged in on a physical device, and the token was saved successfully.");
      return;
    }
    
    console.log("\n🚀 Sending test push notification to Expo Push Service...");
    
    for (const sub of expoSubs) {
      console.log(`Sending to User ID: ${sub.userId} | Token: ${sub.endpoint}`);
      try {
        const response = await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Accept-encoding": "gzip, deflate",
          },
          body: JSON.stringify({
            to: sub.endpoint,
            title: "🔔 RideNITT Test Push",
            body: "If you see this, push notifications are working successfully!",
            data: { url: "/" },
            sound: "default",
          }),
        });
        
        const result = await response.json();
        console.log(`Response status: ${response.status}`);
        console.log("Expo Response Payload:", JSON.stringify(result, null, 2));
      } catch (postErr) {
        console.error("HTTP POST request to Expo failed:", postErr);
      }
    }
    
  } catch (err) {
    console.error("Database query failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
