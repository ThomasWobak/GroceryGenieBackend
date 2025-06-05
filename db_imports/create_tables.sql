-- Drop triggers
DROP TRIGGER IF EXISTS increment_item_count ON item;
DROP TRIGGER IF EXISTS decrement_item_count ON item;

-- Drop trigger function
DROP FUNCTION IF EXISTS update_shopping_list_item_count();

-- Drop dependent tables in correct order
DROP TABLE IF EXISTS user_has_shopping_list CASCADE;
DROP TABLE IF EXISTS item CASCADE;
DROP TABLE IF EXISTS shopping_list CASCADE;
DROP TABLE IF EXISTS "user" CASCADE;

-- Create tables

CREATE TABLE "user" (
  "id" SERIAL PRIMARY KEY,
  "auth0_key" varchar UNIQUE
);

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
  "unit" varchar(15),
  "last_update" timestamp DEFAULT (CURRENT_TIMESTAMP),
  "recurrence_days" integer DEFAULT NULL,
  "active" boolean DEFAULT true
);

CREATE TABLE "user_has_shopping_list" (
  "shopping_list_id" integer NOT NULL,
  "user_id" integer NOT NULL,
  PRIMARY KEY ("shopping_list_id", "user_id")
);

-- Foreign keys

ALTER TABLE "shopping_list"
  ADD FOREIGN KEY ("creator_id") REFERENCES "user" ("id");

ALTER TABLE "item"
  ADD FOREIGN KEY ("shopping_list_id") REFERENCES "shopping_list" ("id");

ALTER TABLE "user_has_shopping_list"
  ADD FOREIGN KEY ("shopping_list_id") REFERENCES "shopping_list" ("id");

ALTER TABLE "user_has_shopping_list"
  ADD FOREIGN KEY ("user_id") REFERENCES "user" ("id");

-- Trigger function for incrementing item_count
CREATE OR REPLACE FUNCTION update_shopping_list_item_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE shopping_list
    SET item_count = item_count + 1
    WHERE id = NEW.shopping_list_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE shopping_list
    SET item_count = item_count - 1
    WHERE id = OLD.shopping_list_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER increment_item_count
AFTER INSERT ON item
FOR EACH ROW
EXECUTE FUNCTION update_shopping_list_item_count();

CREATE TRIGGER decrement_item_count
AFTER DELETE ON item
FOR EACH ROW
EXECUTE FUNCTION update_shopping_list_item_count();
