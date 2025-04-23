-- Created with ChatGPT

-- Users
INSERT INTO "user" ("auth0_key", "username", "email", "password", "profile_picture")
VALUES
  ('auth0|user001', 'alice', 'alice@example.com', 'hashedpassword1', 'https://example.com/images/alice.jpg'),
  ('auth0|user002', 'bob', 'bob@example.com', 'hashedpassword2', 'https://example.com/images/bob.jpg');

-- Shopping Lists
INSERT INTO "shopping_list" ("creator_id", "title", "symbol", "item_count")
VALUES
  (1, 'Weekly Groceries', '🛒', 5),
  (2, 'BBQ Party', '🍖', 4);

-- User has Shopping List (shared lists)
INSERT INTO "user_has_shopping_list" ("shopping_list_id", "user_id")
VALUES
  (1, 1),  -- Alice owns Weekly Groceries
  (1, 2),  -- Bob has access to Alice's list
  (2, 2);  -- Bob owns BBQ Party list

-- Items for "Weekly Groceries"
INSERT INTO "item" ("shopping_list_id", "name", "amount", "unit", "recurrence_days")
VALUES
  (1, 'Bananas', 6, 'pcs', 7),
  (1, 'Milk', 2, 'liters', 3),
  (1, 'Bread', 1, 'loaf', 2),
  (1, 'Eggs', 12, 'pcs', 7),
  (1, 'Tomatoes', 5, 'pcs', 5);

-- Items for "BBQ Party"
INSERT INTO "item" ("shopping_list_id", "name", "amount", "unit", "recurrence_days")
VALUES
  (2, 'Steaks', 4, 'pcs', NULL),
  (2, 'Corn on the cob', 6, 'pcs', NULL),
  (2, 'BBQ Sauce', 1, 'bottle', NULL),
  (2, 'Charcoal', 2, 'kg', NULL);
