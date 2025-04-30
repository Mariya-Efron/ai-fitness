import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Create user if not exists
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
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (!existingUser) {
      await ctx.db.insert("users", {
        email: args.email,
        name: args.name,
        image: args.image,
        clerkId: args.clerkId,
      });
    }
  },
});

// Update user info
export const updateUser = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    image: v.optional(v.string()),
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, {
      email: args.email,
      name: args.name,
      image: args.image,
    });
  },
});
