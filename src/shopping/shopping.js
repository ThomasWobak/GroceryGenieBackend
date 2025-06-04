const express = require("express");
const router = express.Router();
const pool = require("../pool");

//TODO AUTHENTICATION for all methods

//Get specific shopping list
router.get("/list/:product_id", async (req, res) => {
    try {
        if (isNaN(req.params.product_id)) {
            return res.status(400).send("Incorrect Input");

        } else {

            let query ="SELECT item.id,item.name,item.shopping_list_id, item.amount,item.unit as unit_string,item.last_update,item.recurrence_days,item.active,shopping_list.title as shopping_list_title,shopping_list.symbol as shopping_list_symbol FROM item JOIN shopping_list ON item.shopping_list_id = shopping_list.id";
            query += " WHERE shopping_list.id = $1";
            query += " ORDER BY item.active DESC, item.last_update DESC;";

            const allListings = await pool.query(query, [req.params.product_id]);

            res.status(200).json(allListings.rows);
        }
    } catch (error) {
        res.status(500).send(`Server Error: ${error}`);
    }
});


//Get all shopping lists from a user
router.get("/user/:user_id", async (req, res) => {

    try {
           // const query = 'SELECT item.id AS item_id, item.name AS item_name, item.shopping_list_id AS shopping_list_id, item.amount AS item_amount, item.unit AS unit_string, item.last_update, item.recurrence_days, item.active, shopping_list.title AS shopping_list_title, shopping_list.symbol AS shopping_list_symbol, shopping_list.item_count FROM shopping_list INNER JOIN user_has_shopping_list uhsl ON shopping_list.id = uhsl.shopping_list_id INNER JOIN "user" u ON uhsl.user_id = u.id INNER JOIN item ON item.shopping_list_id = shopping_list.id WHERE u.auth0_key = $1';
            const query = 'SELECT shopping_list.id as shopping_list_id, shopping_list.title AS shopping_list_title, shopping_list.symbol AS shopping_list_symbol, shopping_list.item_count FROM shopping_list INNER JOIN user_has_shopping_list uhsl ON shopping_list.id = uhsl.shopping_list_id INNER JOIN "user" u ON uhsl.user_id = u.id WHERE u.auth0_key = $1';

            const allLists = await pool.query(query, [req.params.user_id]);

            //TODO: Actually load the profile images from auth0
            const response = allLists.rows.map(
                row => ({
                  ...row,
                  userProfileImages: ["https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTyzTWQoCUbRNdiyorem5Qp1zYYhpliR9q0Bw&s", "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTyzTWQoCUbRNdiyorem5Qp1zYYhpliR9q0Bw&s"]
                })
            )
            res.status(200).json(response);

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
  try{
    if (amount !== undefined) {
        parsedAmount=parseInt(amount,10)
            if(!Number.isInteger(parsedAmount) || isNaN(parsedAmount) || parsedAmount<0){
                return res.status(400).json({error: "Invalid value for amount."})
            }
        updates.push(`amount = $${idx++}`);
        values.push(parsedAmount);
      }
     if (recurrence_days !== undefined) {
        parsedRecurrence_days=parseInt(recurrence_days,10)
         if(!Number.isInteger(parsedRecurrence_days) || isNaN(parsedRecurrence_days)||parsedRecurrence_days<0){
             return res.status(400).json({error: "Invalid value for recurrence_days."})
         }
       updates.push(`recurrence_days = $${idx++}`);
       values.push(parsedRecurrence_days);
     }
  }catch{
    return res.status(400).json({error: "Invalid input for amount or recurrence_days"})
  }

  if (unit !== undefined) {
    updates.push(`unit = $${idx++}`);
    values.push(unit);
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



// add new shopping list by auth0 key
router.post('/list', async (req, res) => {
  const { creator_auth0_key, title, symbol } = req.body;

  // Input validation done by ChatGPT
  if (typeof creator_auth0_key !== 'string' || creator_auth0_key.trim().length === 0) {
    return res
      .status(400)
      .json({ error: '"creator_auth0_key" is required and must be a non-empty string' });
  }

  if (typeof title !== 'string' || title.trim().length === 0) {
    return res
      .status(400)
      .json({ error: '"title" is required and must be a non-empty string' });
  }

  if (symbol !== undefined && (typeof symbol !== 'string' || symbol.length > 10)) {
    return res
      .status(400)
      .json({ error: '"symbol" must be a string (10 characters max)' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Lookup user by auth0_key
    const userCheck = await client.query(
      `SELECT id FROM "user" WHERE auth0_key = $1`,
      [creator_auth0_key.trim()]
    );
    if (userCheck.rowCount === 0) {
      await client.query('ROLLBACK');
      return res
        .status(400)
        .json({ error: 'Invalid creator_auth0_key: user does not exist' });
    }
    const creatorId = userCheck.rows[0].id;

    // Insert shopping list
    const queryList='INSERT INTO shopping_list (creator_id, title, symbol) VALUES ($1, $2, $3) RETURNING *;';
    const listInsert = await client.query(queryList, [creatorId, title.trim(), symbol ?? null]);
    const newList = listInsert.rows[0];

    // Also insert into user_has_shopping_list
    const queryUser='INSERT INTO user_has_shopping_list (shopping_list_id, user_id) VALUES ($1, $2);';
    await client.query(queryUser, [newList.id, creatorId]);

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
router.post('/list/user/:list_id', async (req, res) => {
  const { list_id } = req.params;
  const { user_id } = req.body;

//Input field validation done by ChatGPT
  if (!Number.isInteger(parseInt(list_id))) {
    return res.status(400).json({ error: '"list_id" must be a valid integer' });
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
      [list_id]
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
      [list_id, user_id]
    );
    if (alreadyAdded.rowCount > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'User is already part of the shopping list' });
    }

    // Add user to the list
    await client.query(
      'INSERT INTO user_has_shopping_list (shopping_list_id, user_id) VALUES ($1, $2)',
      [list_id, user_id]
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


// remove an item from a shopping list, only if the user is part of that list
router.delete('/item/:item_id', async (req, res) => {
  const { item_id } = req.params;
  const  { user_auth0_key }  = req.headers

  // Validate item_id
  const itemId = parseInt(item_id, 10);
  if (!Number.isInteger(itemId) || itemId <= 0) {
    return res
      .status(400)
      .json({ error: '"item_id" path param must be a positive integer' });
  }

  // Validate auth0 key
  if (typeof user_auth0_key !== 'string' || user_auth0_key.trim().length === 0) {
    return res
      .status(400)
      .json({ error: '"user_auth0_key" is required in headers and must be a non-empty string' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Lookup the user by auth0_key
    const userRes = await client.query(
      `SELECT id FROM "user" WHERE auth0_key = $1`,
      [user_auth0_key.trim()]
    );
    if (userRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res
        .status(403)
        .json({ error: 'Invalid user_auth0_key: user not found' });
    }
    const userId = userRes.rows[0].id;

    // Fetch the item and its shopping_list_id
    const itemRes = await client.query(
      `SELECT shopping_list_id FROM item WHERE id = $1`,
      [itemId]
    );
    if (itemRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res
        .status(404)
        .json({ error: 'Item not found' });
    }
    const listId = itemRes.rows[0].shopping_list_id;

    // Verify the user is associated with that shopping list
    const assocRes = await client.query(
      `SELECT 1
         FROM user_has_shopping_list
        WHERE shopping_list_id = $1
          AND user_id = $2`,
      [listId, userId]
    );
    if (assocRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res
        .status(403)
        .json({ error: 'You do not have permission to modify this list' });
    }

    //Delete the item
    const delRes = await client.query(
      `DELETE FROM item
        WHERE id = $1
      RETURNING *`,
      [itemId]
    );
    await client.query('COMMIT');

    res
      .status(200)
      .json({ message: 'Item deleted', item: delRes.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error deleting item:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});


//remove user from list
router.delete('/list/user/:list_id', async (req, res) => {
  const list_id = parseInt(req.params.list_id);
  const user_id = parseInt(req.body.user_id);


  if (!Number.isInteger(list_id) || list_id <= 0) {
    return res.status(400).json({ error: '"list_id" must be a positive integer' });
  }

  if (!Number.isInteger(user_id) || user_id <= 0) {
    return res.status(400).json({ error: '"userId" must be a positive integer' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Check if user is part of the list
    const check = await client.query(
      'SELECT 1 FROM user_has_shopping_list WHERE shopping_list_id = $1 AND user_id = $2',
      [list_id, user_id]
    );

    if (check.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'User is not part of this shopping list' });
    }

    // Delete the relationship
    await client.query(
      'DELETE FROM user_has_shopping_list WHERE shopping_list_id = $1 AND user_id = $2',
      [list_id, user_id]
    );

    await client.query('COMMIT');
    res.status(200).json({ message: 'User removed from shopping list' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error removing user from list:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});



// delete a shopping list (and its related data) by auth0 key
router.delete('/list/:shopping_list_id', async (req, res) => {
  const { shopping_list_id } = req.params;
  const auth0_key = req.headers.get("user_auth0_key")

  // Validate path param
  const listId = parseInt(shopping_list_id, 10);
  if (!Number.isInteger(listId) || listId <= 0) {
    return res
      .status(400)
      .json({ error: '"shopping_list_id" path param must be a positive integer' });
  }

  // Validate body
  if (typeof auth0_key !== 'string' || auth0_key.trim().length === 0) {
    return res
      .status(400)
      .json({ error: '"auth0_key" is required in body and must be a non-empty string' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    //  Lookup user by auth0_key
    const userRes = await client.query(
      'SELECT u.id FROM public."user" u where u.auth0_key=$1',
      [auth0_key.trim()]
    );
    if (userRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res
        .status(403)
        .json({ error: 'Invalid auth0_key: user not found or not authorized' });
    }
    const userId = userRes.rows[0].id;

    // Ensure the shopping list exists and is owned by that user
    const listRes = await client.query(
      'SELECT creator_id FROM shopping_list WHERE id = $1',
      [listId]
    );
    if (listRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res
        .status(404)
        .json({ error: `Shopping list ${listId} not found` });
    }
    if (listRes.rows[0].creator_id !== userId) {
      await client.query('ROLLBACK');
      return res
        .status(403)
        .json({ error: 'You are not the creator of this shopping list' });
    }

    // Remove all entries in user_has_shopping_list for that list
    await client.query(
      'DELETE FROM user_has_shopping_list WHERE shopping_list_id = $1',
      [listId]
    );

    // Remove all items belonging to that shopping list
    await client.query(
      'DELETE FROM item WHERE shopping_list_id = $1',
      [listId]
    );

    // Remove the shopping_list itself
    await client.query(
      'DELETE FROM shopping_list WHERE id = $1',
      [listId]
    );

    await client.query('COMMIT');
    // 204 No Content indicates successful deletion with no body
    return res.sendStatus(204);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error deleting shopping list:', err);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

module.exports = router;