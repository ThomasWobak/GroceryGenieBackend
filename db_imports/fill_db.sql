-- Thanks ChatGPT. This script was written by the homie

-- Delete all data and reset identity sequences
TRUNCATE TABLE "item" RESTART IDENTITY CASCADE;
TRUNCATE TABLE "user_has_shopping_list" RESTART IDENTITY CASCADE;
TRUNCATE TABLE "shopping_list" RESTART IDENTITY CASCADE;
TRUNCATE TABLE "user" RESTART IDENTITY CASCADE;

-- Insert Users
INSERT INTO "user" ("auth0_key") VALUES
  ('auth0|user001'),
  ('auth0|user002'),
  ('auth0|user003'),
  ('auth0|user004'),
  ('auth0|user005'),
  ('auth0|user006'),
  ('auth0|user007'),
  ('auth0|user008'),
  ('auth0|user009'),
  ('auth0|user010');

-- Insert Shopping Lists
INSERT INTO "shopping_list" ("creator_id", "title", "symbol") VALUES
  (1, 'Weekly Groceries', '🛒'),
  (2, 'BBQ Party', '🍖'),
  (3, 'Camping Trip', '🏕️'),
  (4, 'Christmas Dinner', '🎄'),
  (1, 'Vegan Week', '🌱'),
  (5, 'Birthday Bash', '🎉'),
  (6, 'Family Reunion', '👨‍👩‍👧‍👦'),
  (7, 'New Year’s Eve', '🎆'),
  (8, 'Office Potluck', '🥗');

-- User-List Relations
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

-- Items: Weekly Groceries
INSERT INTO "item" ("shopping_list_id", "name", "amount", "unit", "recurrence_days") VALUES
  (1, 'Bananas', 6, 'pcs', 7),
  (1, 'Milk', 2, 'L', 3),
  (1, 'Bread', 1, 'pcs', 2),
  (1, 'Eggs', 12, 'pcs', 7),
  (1, 'Tomatoes', 5, 'pcs', 5);

-- Items: BBQ Party
INSERT INTO "item" ("shopping_list_id", "name", "amount", "unit", "recurrence_days") VALUES
  (2, 'Steaks', 4, 'pcs', 0),
  (2, 'Corn on the cob', 6, 'pcs', 0),
  (2, 'BBQ Sauce', 1, 'oz', 0),
  (2, 'Charcoal', 2, 'kg', 0);

-- Items: Camping Trip
INSERT INTO "item" ("shopping_list_id", "name", "amount", "unit", "recurrence_days") VALUES
  (3, 'Canned Beans', 5, 'pcs', 0),
  (3, 'Instant Noodles', 10, 'pcs', 0),
  (3, 'Matches', 2, 'pcs', 0),
  (3, 'Tent Pegs', 8, 'pcs', 0),
  (3, 'Sunscreen', 1, 'oz', 0),
  (3, 'Bug Spray', 1, 'oz', 0);

-- Items: Christmas Dinner
INSERT INTO "item" ("shopping_list_id", "name", "amount", "unit", "recurrence_days") VALUES
  (4, 'Turkey', 1, 'pcs', 0),
  (4, 'Stuffing Mix', 2, 'pcs', 0),
  (4, 'Cranberry Sauce', 1, 'oz', 0),
  (4, 'Mashed Potatoes', 3, 'kg', 0),
  (4, 'Gravy', 1, 'cups', 0),
  (4, 'Green Beans', 2, 'kg', 0),
  (4, 'Wine', 2, 'oz', 0),
  (4, 'Pumpkin Pie', 1, 'pcs', 0);

-- Items: Vegan Week
INSERT INTO "item" ("shopping_list_id", "name", "amount", "unit", "recurrence_days") VALUES
  (5, 'Tofu', 3, 'pcs', 3),
  (5, 'Almond Milk', 2, 'L', 4),
  (5, 'Chickpeas', 2, 'pcs', 7),
  (5, 'Spinach', 1, 'pcs', 2),
  (5, 'Avocados', 4, 'pcs', 5),
  (5, 'Whole Grain Bread', 1, 'pcs', 3),
  (5, 'Quinoa', 1, 'kg', 7);

-- Items: Birthday Bash
INSERT INTO "item" ("shopping_list_id", "name", "amount", "unit", "recurrence_days") VALUES
  (6, 'Cake', 1, 'pcs', 0),
  (6, 'Soda', 6, 'oz', 0),
  (6, 'Chips', 4, 'pcs', 0);

-- Items: Family Reunion
INSERT INTO "item" ("shopping_list_id", "name", "amount", "unit", "recurrence_days") VALUES
  (7, 'Pasta Salad', 3, 'kg', 0),
  (7, 'Lemonade', 4, 'L', 0),
  (7, 'Paper Plates', 40, 'pcs', 0),
  (7, 'Napkins', 100, 'pcs', 0),
  (7, 'Fruit Platter', 1, 'pcs', 0),
  (7, 'Ice Cream', 2, 'L', 0);

-- Items: New Year's Eve
INSERT INTO "item" ("shopping_list_id", "name", "amount", "unit", "recurrence_days") VALUES
  (8, 'Champagne', 2, 'oz', 0),
  (8, 'Fireworks', 1, 'pcs', 0),
  (8, 'Snacks', 5, 'pcs', 0),
  (8, 'Party Hats', 10, 'pcs', 0),
  (8, 'Confetti', 1, 'pcs', 0);

-- Items: Office Potluck
INSERT INTO "item" ("shopping_list_id", "name", "amount", "unit", "recurrence_days") VALUES
  (9, 'Pasta Bake', 1, 'pcs', 0),
  (9, 'Spring Rolls', 20, 'pcs', 0),
  (9, 'Juice Boxes', 10, 'pcs', 0),
  (9, 'Cookies', 30, 'pcs', 0);
