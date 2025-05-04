import { httpRouter } from "convex/server";
import { WebhookEvent } from "@clerk/nextjs/server";
import { Webhook } from "svix";
import { api } from "./_generated/api";
import { httpAction } from "./_generated/server";

const http = httpRouter();

http.route({
  path: "/clerk-webhook",  // ✅ THIS IS THE ONLY VALID ROUTE

  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    if (!webhookSecret) throw new Error("Missing CLERK_WEBHOOK_SECRET");

    const svix_id = request.headers.get("svix-id");
    const svix_signature = request.headers.get("svix-signature");
    const svix_timestamp = request.headers.get("svix-timestamp");

    if (!svix_id || !svix_signature || !svix_timestamp) {
      return new Response("Missing SVIX headers", { status: 400 });
    }

    const payload = await request.json();
    const body = JSON.stringify(payload);
    let evt: WebhookEvent;

    try {
      const wh = new Webhook(webhookSecret);
      evt = wh.verify(body, {
        "svix-id": svix_id,
        "svix-timestamp": svix_timestamp,
        "svix-signature": svix_signature,
      }) as WebhookEvent;
    } catch (err) {
      console.error("Webhook verification failed:", err);
      return new Response("Invalid signature", { status: 400 });
    }

    const eventType = evt.type;

    if (eventType === "user.created" || eventType === "user.updated") {
      const userData = evt.data;

      // Log the entire payload for debugging
      console.log("Webhook Event Data:", JSON.stringify(userData, null, 2));

      // Type guard to ensure userData has expected properties
      if (
        typeof userData === "object" &&
        userData !== null &&
        "id" in userData &&
        "email_addresses" in userData &&
        Array.isArray(userData.email_addresses)
      ) {
        const id = userData.id as string;
        const first_name = (userData as any).first_name || "";
        const last_name = (userData as any).last_name || "";
        const email_addresses = userData.email_addresses;
        const image_url = (userData as any).image_url;

        const name = `${first_name} ${last_name}`.trim();
        const email = email_addresses[0]?.email_address;

        if (!email) {
          return new Response("No email found", { status: 400 });
        }

        if (eventType === "user.created") {
          await ctx.runMutation(api.users.syncUser, { // Correctly reference the syncUser mutation
            email,
            name,
            image: image_url,
            clerkId: id,
          });
        } else if (eventType === "user.updated") {
          await ctx.runMutation(api.users.updateUser, { // Correctly reference the updateUser mutation
            email,
            name,
            image: image_url,
            clerkId: id,
          });
        }
        return new Response("Webhook processed", { status: 200 });
      } else {
        console.error("Invalid user data:", JSON.stringify(userData, null, 2));
        return new Response("Invalid user data", { status: 400 });
      }
    }

    // If the event type is not handled
    return new Response("Event type not handled", { status: 200 });
  }),
});

export default http;
