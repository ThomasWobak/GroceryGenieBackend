-- Thanks ChatGPT. This script was written by the homie
-- Delete all data and reset identity sequences
TRUNCATE TABLE "item" RESTART IDENTITY CASCADE;
TRUNCATE TABLE "user_has_shopping_list" RESTART IDENTITY CASCADE;
TRUNCATE TABLE "shopping_list" RESTART IDENTITY CASCADE;
TRUNCATE TABLE "user" RESTART IDENTITY CASCADE;

-- INSERT USERS
INSERT INTO "user" ("auth0_key", "username", "email", "password", "profile_picture") VALUES
  ('auth0|user001', 'alice', 'alice@example.com', 'hashedpassword1', 'https://example.com/images/alice.jpg'),
  ('auth0|user002', 'bob', 'bob@example.com', 'hashedpassword2', 'https://example.com/images/bob.jpg'),
  ('auth0|user003', 'charlie', 'charlie@example.com', 'hashedpassword3', 'https://example.com/images/charlie.jpg'),
  ('auth0|user004', 'diana', 'diana@example.com', 'hashedpassword4', 'https://example.com/images/diana.jpg'),
  ('auth0|user005', 'eve', 'eve@example.com', 'hashedpassword5', 'https://example.com/images/eve.jpg'),
  ('auth0|user006', 'frank', 'frank@example.com', 'hashedpassword6', 'https://example.com/images/frank.jpg'),
  ('auth0|user007', 'grace', 'grace@example.com', 'hashedpassword7', 'https://example.com/images/grace.jpg'),
  ('auth0|user008', 'henry', 'henry@example.com', 'hashedpassword8', 'https://example.com/images/henry.jpg'),
  ('auth0|user009', 'irene', 'irene@example.com', 'hashedpassword9', 'https://example.com/images/irene.jpg'),
  ('auth0|user010', 'jack', 'jack@example.com', 'hashedpassword10', 'https://example.com/images/jack.jpg');

-- INSERT SHOPPING LISTS
INSERT INTO "shopping_list" ("creator_id", "title", "symbol", "item_count") VALUES
  (1, 'Weekly Groceries', '🛒', 5),
  (2, 'BBQ Party', '🍖', 4),
  (3, 'Camping Trip', '🏕️', 6),
  (4, 'Christmas Dinner', '🎄', 8),
  (1, 'Vegan Week', '🌱', 7),
  (5, 'Birthday Bash', '🎉', 3),
  (6, 'Family Reunion', '👨‍👩‍👧‍👦', 6),
  (7, 'New Year’s Eve', '🎆', 5),
  (8, 'Office Potluck', '🥗', 4);

-- INSERT USER-SHOPPING LIST RELATIONSHIPS
INSERT INTO "user_has_shopping_list" ("shopping_list_id", "user_id") VALUES
  (1, 1), (1, 2), (1, 3), (1, 4), (1, 5),
  (2, 2), (2, 3), (2, 6),
  (3, 3), (3, 4), (3, 7), (3, 8),
  (4, 4), (4, 1), (4, 6), (4, 9),
  (5, 1), (5, 5), (5, 10),
  (6, 5), (6, 6), (6, 7),
  (7, 6), (7, 7), (7, 8), (7, 9), (7, 10),
  (8, 7), (8, 8), (8, 9), (8, 10),
  (9, 8), (9, 9), (9, 10);

-- INSERT ITEMS
-- Weekly Groceries
INSERT INTO "item" ("shopping_list_id", "name", "amount", "unit", "recurrence_days") VALUES
  (1, 'Bananas', 6, 'pcs', 7),
  (1, 'Milk', 2, 'liters', 3),
  (1, 'Bread', 1, 'loaf', 2),
  (1, 'Eggs', 12, 'pcs', 7),
  (1, 'Tomatoes', 5, 'pcs', 5);

-- BBQ Party
INSERT INTO "item" ("shopping_list_id", "name", "amount", "unit", "recurrence_days") VALUES
  (2, 'Steaks', 4, 'pcs', NULL),
  (2, 'Corn on the cob', 6, 'pcs', NULL),
  (2, 'BBQ Sauce', 1, 'bottle', NULL),
  (2, 'Charcoal', 2, 'kg', NULL);

-- Camping Trip
INSERT INTO "item" ("shopping_list_id", "name", "amount", "unit", "recurrence_days") VALUES
  (3, 'Canned Beans', 5, 'cans', NULL),
  (3, 'Instant Noodles', 10, 'packs', NULL),
  (3, 'Matches', 2, 'boxes', NULL),
  (3, 'Tent Pegs', 8, 'pcs', NULL),
  (3, 'Sunscreen', 1, 'bottle', NULL),
  (3, 'Bug Spray', 1, 'can', NULL);

-- Christmas Dinner
INSERT INTO "item" ("shopping_list_id", "name", "amount", "unit", "recurrence_days") VALUES
  (4, 'Turkey', 1, 'whole', NULL),
  (4, 'Stuffing Mix', 2, 'packs', NULL),
  (4, 'Cranberry Sauce', 1, 'jar', NULL),
  (4, 'Mashed Potatoes', 3, 'kg', NULL),
  (4, 'Gravy', 1, 'bottle', NULL),
  (4, 'Green Beans', 2, 'kg', NULL),
  (4, 'Wine', 2, 'bottles', NULL),
  (4, 'Pumpkin Pie', 1, 'pcs', NULL);

-- Vegan Week
INSERT INTO "item" ("shopping_list_id", "name", "amount", "unit", "recurrence_days") VALUES
  (5, 'Tofu', 3, 'blocks', 3),
  (5, 'Almond Milk', 2, 'liters', 4),
  (5, 'Chickpeas', 2, 'cans', 7),
  (5, 'Spinach', 1, 'bag', 2),
  (5, 'Avocados', 4, 'pcs', 5),
  (5, 'Whole Grain Bread', 1, 'loaf', 3),
  (5, 'Quinoa', 1, 'kg', 7);

-- Birthday Bash
INSERT INTO "item" ("shopping_list_id", "name", "amount", "unit", "recurrence_days") VALUES
  (6, 'Cake', 1, 'pcs', NULL),
  (6, 'Soda', 6, 'bottles', NULL),
  (6, 'Chips', 4, 'bags', NULL);

-- Family Reunion
INSERT INTO "item" ("shopping_list_id", "name", "amount", "unit", "recurrence_days") VALUES
  (7, 'Pasta Salad', 3, 'kg', NULL),
  (7, 'Lemonade', 4, 'bottles', NULL),
  (7, 'Paper Plates', 40, 'pcs', NULL),
  (7, 'Napkins', 100, 'pcs', NULL),
  (7, 'Fruit Platter', 1, 'tray', NULL),
  (7, 'Ice Cream', 2, 'liters', NULL);

-- New Year’s Eve
INSERT INTO "item" ("shopping_list_id", "name", "amount", "unit", "recurrence_days") VALUES
  (8, 'Champagne', 2, 'bottles', NULL),
  (8, 'Fireworks', 1, 'box', NULL),
  (8, 'Snacks', 5, 'packs', NULL),
  (8, 'Party Hats', 10, 'pcs', NULL),
  (8, 'Confetti', 1, 'bag', NULL);

-- Office Potluck
INSERT INTO "item" ("shopping_list_id", "name", "amount", "unit", "recurrence_days") VALUES
  (9, 'Pasta Bake', 1, 'tray', NULL),
  (9, 'Spring Rolls', 20, 'pcs', NULL),
  (9, 'Juice Boxes', 10, 'pcs', NULL),
  (9, 'Cookies', 30, 'pcs', NULL);
