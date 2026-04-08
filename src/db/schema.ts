import { pgTable, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

export const rooms = pgTable("rooms", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  shareCode: text("share_code").notNull().unique(),
  status: text("status", { enum: ["waiting", "rolling", "complete"] })
    .notNull()
    .default("waiting"),
  currentRound: integer("current_round").notNull().default(1),
  diceMax: integer("dice_max").notNull().default(6),
  creatorPlayerId: text("creator_player_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const players = pgTable("players", {
  id: text("id").primaryKey(),
  roomId: text("room_id")
    .notNull()
    .references(() => rooms.id),
  name: text("name").notNull(),
  isEliminated: boolean("is_eliminated").notNull().default(false),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
});

export const rolls = pgTable("rolls", {
  id: text("id").primaryKey(),
  playerId: text("player_id")
    .notNull()
    .references(() => players.id),
  roomId: text("room_id")
    .notNull()
    .references(() => rooms.id),
  round: integer("round").notNull(),
  value: integer("value").notNull(),
  rolledAt: timestamp("rolled_at").notNull().defaultNow(),
});
