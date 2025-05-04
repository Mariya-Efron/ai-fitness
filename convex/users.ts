import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Sync user mutation, to insert a new user if they don't exist
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
      // If no user is found, insert a new one
      await ctx.db.insert("users", {
        email: args.email,
        name: args.name,
        image: args.image,
        clerkId: args.clerkId,
      });
    }
  },
});

// Update user mutation, to modify an existing user's details
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
      // Fallback: create user if not found (same as syncUser logic)
      await ctx.db.insert("users", {
        email: args.email,
        name: args.name,
        image: args.image,
        clerkId: args.clerkId,
      });
      return;
    }

    await ctx.db.patch(user._id, {
      email: args.email,
      name: args.name,
      image: args.image,
    });
  },
});
