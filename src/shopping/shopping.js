const express = require("express");
const router = express.Router();
const pool = require("../pool");

//TODO remove item from list
//TODO remove user from list
//TODO AUTHENTICATION for all methods

//Get specific shopping list
router.get("/list/:product_id", async (req, res) => {
    try {
        if (isNaN(req.params.product_id)) {
            res.status(400).send("Incorrect Input");
        } else {

            let query ="SELECT item.id,item.name,item.amount,item.unit,item.last_update,item.recurrence_days,item.active,shopping_list.title,shopping_list.symbol FROM item JOIN shopping_list ON item.shopping_list_id = shopping_list.id";
            query += " WHERE shopping_list.id = $1;";

            const allListings = await pool.query(query, [req.params.product_id]);

            if (allListings.rows.length === 0) {
                return res.status(404).json({ message: "No items found" });
            }
            res.status(200).json(allListings.rows);
        }
    } catch (error) {
        res.status(500).send(`Server Error: ${error}`);
    }
});
//Get all shopping lists from a user
router.get("/user/:user_id", async (req, res) => {
    try {
        if (isNaN(req.params.user_id)) {
            res.status(400).send("Incorrect Input");
        } else {

            let query ="SELECT sl.id AS shopping_list_id, sl.title AS shopping_list_title, sl.symbol, sl.item_count, sl.created_at AS list_created_at, i.id AS item_id, i.name AS item_name, i.amount, i.unit, i.last_update, i.recurrence_days, i.active ";
            query+="FROM shopping_list sl LEFT JOIN user_has_shopping_list uhsl ON sl.id = uhsl.shopping_list_id INNER JOIN item i ON i.shopping_list_id = sl.id "
            query+="WHERE uhsl.user_id = $1 ORDER BY sl.id, i.id;"


            const allLists = await pool.query(query, [req.params.user_id]);

            if (allLists.rows.length === 0) {
                return res.status(404).json({ message: "No items found" });
            }
            res.status(200).json(allLists.rows);
        }
    } catch (error) {
        res.status(500).send(`Server Error: ${error}`);
    }
});

//Update item
router.put('/item/:item_id', async (req, res) => {
  const { item_id } = req.params;
  const { name, amount, unit, recurrence_days, active } = req.body;

  const updates = [];
  const values = [];
  let idx = 1;

  if (name !== undefined) {
    updates.push(`name = $${idx++}`);
    values.push(name);
  }
  if (amount !== undefined) {
        if(!Number.isInteger(amount) || isNaN(amount) || amount<0){
            return res.status(400).json({error: "Invalid value for amount."})
        }
    updates.push(`amount = $${idx++}`);
    values.push(amount);
  }
  if (unit !== undefined) {
    updates.push(`unit = $${idx++}`);
    values.push(unit);
  }
  if (recurrence_days !== undefined) {
      if(!Number.isInteger(recurrence_days) || isNaN(recurrence_days)||recurrence_days<0){
          return res.status(400).json({error: "Invalid value for recurrence_days."})
      }
    updates.push(`recurrence_days = $${idx++}`);
    values.push(recurrence_days);
  }
  if (active !== undefined) {
    if(active!=true&&active!=false){
    return res.status(400).json({error: "Invalid value for active. Must be true or false"})
    }
    updates.push(`active = $${idx++}`);
    values.push(active);

  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }


  values.push(item_id); // WHERE clause

  const query = `
    UPDATE item
    SET ${updates.join(', ')}, last_update = CURRENT_TIMESTAMP
    WHERE id = $${idx}
    RETURNING *;
  `;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result = await client.query(query, values);
    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Item not found' });
    }

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Transaction error updating item:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});


//insert new item into list
router.post('/item', async (req, res) => {
  const { shopping_list_id, name, amount, unit, recurrence_days, active } = req.body;

  // Basic input validation done by ChatGPT
  if (!Number.isInteger(shopping_list_id) || shopping_list_id <= 0) {
    return res.status(400).json({ error: '"shopping_list_id" must be a positive integer' });
  }

  if (typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: '"name" is required and must be a non-empty string' });
  }

  if (amount !== undefined && (typeof amount !== 'number' || isNaN(amount)||amount<0)) {
    return res.status(400).json({ error: '"amount" must be a valid number' });
  }

  if (unit !== undefined && (typeof unit !== 'string' || unit.length > 10)) {
    return res.status(400).json({ error: '"unit" must be a string with max length 10' });
  }

  if (recurrence_days !== undefined && (!Number.isInteger(recurrence_days) || isNaN(recurrence_days)||recurrence_days<0)) {
    return res.status(400).json({ error: '"recurrence_days" must be an integer' });
  }

  if (active !== undefined && typeof active !== 'boolean') {
    return res.status(400).json({ error: '"active" must be a boolean' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Check if shopping_list_id exists
    const listCheck = await client.query(
      'SELECT id FROM shopping_list WHERE id = $1',
      [shopping_list_id]
    );

    if (listCheck.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid shopping_list_id: list does not exist' });
    }

    const fields = ['shopping_list_id', 'name'];
    const values = [shopping_list_id, name];
    const placeholders = ['$1', '$2'];
    let idx = 3;

    fields.push('amount');
    values.push(amount);
    placeholders.push(`$${idx++}`);



    fields.push('unit');
    values.push(unit);
    placeholders.push(`$${idx++}`);


    if (recurrence_days !== undefined) {
      fields.push('recurrence_days');
      values.push(recurrence_days);
      placeholders.push(`$${idx++}`);
    }


    fields.push('active');
    values.push(active === undefined ? true : active);
    placeholders.push(`$${idx++}`);


    const query = `
      INSERT INTO item (${fields.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING *;
    `;

    const insertResult = await client.query(query, values);

    await client.query('COMMIT');
    res.status(201).json(insertResult.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error inserting item:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});



//add new shopping list
router.post('/list', async (req, res) => {
  const { creator_id, title, symbol } = req.body;

  // Validate required fields done by Chatgpt
  if (!Number.isInteger(creator_id) || creator_id <= 0) {
    return res.status(400).json({ error: '"creator_id" must be a positive integer' });
  }

  if (typeof title !== 'string' || title.trim().length === 0) {
    return res.status(400).json({ error: '"title" is required and must be a non-empty string' });
  }

  if (symbol !== undefined && (typeof symbol !== 'string' || symbol.length > 10)) {
    return res.status(400).json({ error: '"symbol" must be a string (10 characters max)' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Validate creator_id exists
    const userCheck = await client.query('SELECT id FROM "user" WHERE id = $1', [creator_id]);
    if (userCheck.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid creator_id: user does not exist' });
    }

    // Insert shopping list
    const listInsert = await client.query(
      `
        INSERT INTO shopping_list (creator_id, title, symbol)
        VALUES ($1, $2, $3)
        RETURNING *;
      `,
      [creator_id, title, symbol ?? null]
    );

    const newList = listInsert.rows[0];

    // Also insert into user_has_shopping_list
    await client.query(
      `
        INSERT INTO user_has_shopping_list (shopping_list_id, user_id)
        VALUES ($1, $2);
      `,
      [newList.id, creator_id]
    );

    await client.query('COMMIT');
    res.status(201).json(newList);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating shopping list:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});


//add user to list
router.post('/list/user/:listId', async (req, res) => {
  const { listId } = req.params;
  const { user_id } = req.body;

//Input field validation done by ChatGPT
  if (!Number.isInteger(parseInt(listId))) {
    return res.status(400).json({ error: '"listId" must be a valid integer' });
  }

  if (!Number.isInteger(user_id) || user_id <= 0) {
    return res.status(400).json({ error: '"user_id" must be a positive integer' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Check if the list exists
    const listCheck = await client.query(
      'SELECT id FROM shopping_list WHERE id = $1',
      [listId]
    );
    if (listCheck.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Shopping list not found' });
    }

    // Check if the user exists
    const userCheck = await client.query(
      'SELECT id FROM "user" WHERE id = $1',
      [user_id]
    );
    if (userCheck.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user is already in the list
    const alreadyAdded = await client.query(
      'SELECT 1 FROM user_has_shopping_list WHERE shopping_list_id = $1 AND user_id = $2',
      [listId, user_id]
    );
    if (alreadyAdded.rowCount > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'User is already part of the shopping list' });
    }

    // Add user to the list
    await client.query(
      'INSERT INTO user_has_shopping_list (shopping_list_id, user_id) VALUES ($1, $2)',
      [listId, user_id]
    );

    await client.query('COMMIT');
    res.status(201).json({ message: 'User added to shopping list successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error adding user to shopping list:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

module.exports = router;