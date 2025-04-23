CREATE TABLE "shopping_list" (
  "id" SERIAL PRIMARY KEY,
  "creator_id" integer NOT NULL,
  "title" varchar NOT NULL,
  "symbol" varchar,
  "item_count" integer DEFAULT 0,
  "created_at" timestamp DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE "item" (
  "id" SERIAL PRIMARY KEY,
  "shopping_list_id" integer NOT NULL,
  "name" varchar NOT NULL,
  "amount" float,
  "unit" varchar(10),
  "last_update" timestamp DEFAULT (CURRENT_TIMESTAMP),
  "recurrence_days" integer DEFAULT NULL,
  "active" boolean DEFAULT true
);

CREATE TABLE "user" (
  "id" SERIAL PRIMARY KEY,
  "auth0_key" varchar UNIQUE,
  "username" varchar NOT NULL,
  "email" varchar UNIQUE NOT NULL,
  "password" varchar NOT NULL,
  "profile_picture" varchar,
  "created_at" timestamp DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE "user_has_shopping_list" (
  "shopping_list_id" integer NOT NULL,
  "user_id" integer NOT NULL,
  PRIMARY KEY ("shopping_list_id", "user_id")
);

ALTER TABLE "shopping_list" ADD FOREIGN KEY ("creator_id") REFERENCES "user" ("id");

ALTER TABLE "item" ADD FOREIGN KEY ("shopping_list_id") REFERENCES "shopping_list" ("id");

ALTER TABLE "user_has_shopping_list" ADD FOREIGN KEY ("shopping_list_id") REFERENCES "shopping_list" ("id");

ALTER TABLE "user_has_shopping_list" ADD FOREIGN KEY ("user_id") REFERENCES "user" ("id");