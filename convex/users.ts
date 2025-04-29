import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const syncUser = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    image: v.optional(v.string()),
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (existingUser) return;

    await ctx.db.insert("users", {
      email: args.email,
      name: args.name,
      image: args.image,
      clerkId: args.clerkId,
    });
  },
});
