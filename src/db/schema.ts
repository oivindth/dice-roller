import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const rooms = sqliteTable("rooms", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  shareCode: text("share_code").notNull().unique(),
  status: text("status", { enum: ["waiting", "rolling", "complete"] })
    .notNull()
    .default("waiting"),
  currentRound: integer("current_round").notNull().default(1),
  creatorPlayerId: text("creator_player_id"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const players = sqliteTable("players", {
  id: text("id").primaryKey(),
  roomId: text("room_id")
    .notNull()
    .references(() => rooms.id),
  name: text("name").notNull(),
  isEliminated: integer("is_eliminated", { mode: "boolean" })
    .notNull()
    .default(false),
  joinedAt: integer("joined_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const rolls = sqliteTable("rolls", {
  id: text("id").primaryKey(),
  playerId: text("player_id")
    .notNull()
    .references(() => players.id),
  roomId: text("room_id")
    .notNull()
    .references(() => rooms.id),
  round: integer("round").notNull(),
  value: integer("value").notNull(),
  rolledAt: integer("rolled_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});
