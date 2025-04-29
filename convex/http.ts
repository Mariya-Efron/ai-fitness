
import { httpRouter, httpActionGeneric } from "convex/server";

import { Webhook } from "svix";
import { api } from "./_generated/api";
import type { WebhookEvent } from "@clerk/backend";

const http = httpRouter();

http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: httpActionGeneric(async (ctx, request) => {

    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error("Missing CLERK_WEBHOOK_SECRET environment variable");
    }

    const svixId = request.headers.get("svix-id") ?? "";
    const svixSignature = request.headers.get("svix-signature") ?? "";
    const svixTimestamp = request.headers.get("svix-timestamp") ?? "";

    if (!svixId || !svixSignature || !svixTimestamp) {
      return new Response("Missing Svix headers", { status: 400 });
    }

    const payload = await request.text();
    const wh = new Webhook(webhookSecret);
    let evt: WebhookEvent;

    try {
      evt = wh.verify(payload, {
        "svix-id": svixId,
        "svix-signature": svixSignature,
        "svix-timestamp": svixTimestamp,
      }) as WebhookEvent;
    } catch (err) {
      console.error("❌ Webhook verification failed:", err);
      return new Response("Invalid webhook signature", { status: 400 });
    }

    if (evt.type === "user.created") {
      const { id, first_name, last_name, image_url, email_addresses } = evt.data;
      const email = email_addresses?.[0]?.email_address ?? "";
      const name = `${first_name || ""} ${last_name || ""}`.trim();

      try {
        await ctx.runMutation(api.users.syncUser, {
          email,
          name,
          image: image_url,
          clerkId: id,
        });
      } catch (error) {
        console.error("❌ Error syncing user:", error);
        return new Response("Error syncing user", { status: 500 });
      }
    }

    return new Response("✅ Webhook processed successfully", { status: 200 });
  }),
});

export default http;
