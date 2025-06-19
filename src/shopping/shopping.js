const express = require("express");
const router = express.Router();
const pool = require("../pool");
const {auth} = require("express-oauth2-jwt-bearer");
const auth0API = require("../auth0api/Auth0ManagementApi")

//TODO AUTHENTICATION for all methods

//Get specific shopping list
router.get("/list/:listId", async (req, res) => {
    try {
        if (isNaN(req.params.listId)) {
            return res.status(400).send("Incorrect Input");

        } else {
            const auth0_key = req.auth.payload.sub;
            const userHasListCheck = await pool.query(
                'SELECT * FROM user_has_shopping_list uhsl INNER JOIN "user" ON uhsl.user_id = "user".id WHERE uhsl.shopping_list_id = $1 AND "user".auth0_key= $2', [req.params.listId, auth0_key]
            )
            if (userHasListCheck.rowCount === 0) {
                return res.status(403).send("You are not allowed to access this list");
            }

            let query ="SELECT item.id,item.name,item.shopping_list_id, item.amount,item.unit as unit_string,item.last_update,item.recurrence_days,item.active,shopping_list.title as shopping_list_title,shopping_list.symbol as shopping_list_symbol FROM item JOIN shopping_list ON item.shopping_list_id = shopping_list.id";
            query += " WHERE shopping_list.id = $1";
            query += " ORDER BY item.active DESC, item.last_update DESC;";

            const allListings = await pool.query(query, [req.params.listId]);

            res.status(200).json(allListings.rows);
        }
    } catch (error) {
        res.status(500).send(`Server Error: ${error}`);
    }
});

router.post("/share/:listId", async (req, res) => {
    const listId = parseInt(req.params.listId, 10);
    const auth0_key = req.auth.payload.sub;
    try {
      const shoppingListCheck = await pool.query(
          'SELECT * FROM shopping_list sl inner join public."user" u on u.id = sl.creator_id where sl.id = $1 AND u.auth0_key = $2', [listId, auth0_key]
      )
      if (shoppingListCheck.rowCount === 0) {
          return res.status(403).json({ error: 'You are not allowed to share this list' });
      }

      const existingLink = await pool.query(
          'SELECT share_id FROM shopping_list where id = $1', [listId]
      )
      if (existingLink.rowCount > 0 && existingLink.rows[0].share_id !== null) {
        return res.status(200).json({ shareId: existingLink.rows[0].share_id });
      }else{
        let result = null
        let shareId = null
        do{
          shareId = Math.random().toString(36).substring(2, 10);
          result = await pool.query(
              'SELECT share_id FROM shopping_list WHERE share_id = $1', [shareId])
        }while(result.rowCount > 0)
        await pool.query(
            'UPDATE shopping_list SET share_id = $1 WHERE id = $2', [shareId, listId]
        )
        return res.status(200).json({shareId: shareId});
      }
    }catch (err){
        console.error('Error sharing shopping list:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
})

router.get("/share/:shareId", async (req, res) => {
    const auth0_key = req.auth.payload.sub;
    const shareId = req.params.shareId;
    try {
      const listToShare = await pool.query(
          'SELECT shopping_list.id FROM shopping_list WHERE share_id = $1', [shareId])
        if (listToShare.rowCount === 0) {
            return res.status(404).json({ error: 'Shopping list not found' });
        }
        const userCheck = await pool.query(
            'SELECT * FROM "user" WHERE auth0_key = $1', [auth0_key])
        if (userCheck.rowCount === 0) {
          return res.status(403).json({ error: 'You user does not exist'});
        }
        const userHasListCheck = await pool.query(
            'SELECT * FROM user_has_shopping_list WHERE shopping_list_id = $1 AND user_id = $2', [listToShare.rows[0].id, userCheck.rows[0].id])
        if (userHasListCheck.rowCount > 0) {
            return res.status(200).json({ message: 'You are already part of this list' });
        }
        await pool.query(
            'INSERT INTO user_has_shopping_list (shopping_list_id, user_id) VALUES ($1, $2)', [listToShare.rows[0].id, userCheck.rows[0].id]
        )
        return res.status(200).json({ message: 'You have been added to the shopping list' });
    }catch (err){
        console.error('Error sharing shopping list:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
})



let profilePictures = {
  last_update: 0,
  pictures: null
}
//Get all shopping lists from a user
router.get("/user/lists", async (req, res) => {
    const userId = req.auth.payload.sub
    try {
           // const query = 'SELECT item.id AS item_id, item.name AS item_name, item.shopping_list_id AS shopping_list_id, item.amount AS item_amount, item.unit AS unit_string, item.last_update, item.recurrence_days, item.active, shopping_list.title AS shopping_list_title, shopping_list.symbol AS shopping_list_symbol, shopping_list.item_count FROM shopping_list INNER JOIN user_has_shopping_list uhsl ON shopping_list.id = uhsl.shopping_list_id INNER JOIN "user" u ON uhsl.user_id = u.id INNER JOIN item ON item.shopping_list_id = shopping_list.id WHERE u.auth0_key = $1';
            const query = 'SELECT shopping_list.id as shopping_list_id, shopping_list.title AS shopping_list_title, shopping_list.symbol AS shopping_list_symbol, shopping_list.item_count FROM shopping_list INNER JOIN user_has_shopping_list uhsl ON shopping_list.id = uhsl.shopping_list_id INNER JOIN "user" u ON uhsl.user_id = u.id WHERE u.auth0_key = $1';

            if(profilePictures.last_update < Date.now() - 60 * 1000) { // Update profile pictures every minute
              try {
                profilePictures.pictures = await auth0API.getAllUserProfilePictures();
                profilePictures.last_update = Date.now();
              }catch (error) {
                console.error("Error fetching profile pictures:", error);
                return res.status(500).json({ error: 'Failed to fetch profile pictures' });
              }
            }
            const allLists = await pool.query(query, [userId]);
            const promises = allLists.rows.map(
                async row => {
                    const result = await pool.query('SELECT u.auth0_key FROM user_has_shopping_list uhsl INNER JOIN public."user" u on uhsl.user_id = u.id WHERE shopping_list_id = $1', [row.shopping_list_id])
                    const userProfileImages = result.rows.map(userRow => {
                        const picture = profilePictures.pictures.find(picture => picture.user_id === userRow.auth0_key);
                        if(picture){
                            return picture.picture
                        }else{
                            return undefined
                        }
                    }).filter(picture => picture !== undefined);

                    return {
                        ...row,
                        userProfileImages: userProfileImages
                    };
                }
            )
            const result = await Promise.all(promises);
            res.status(200).json(result);

    } catch (error) {
        res.status(500).send(`Server Error: ${error}`);
    }
});

//Update item
router.put('/item/:item_id', async (req, res) => {

  const { item_id } = req.params;
  const { name, amount, unit, recurrence_days, active } = req.body;
  const userid = req.auth.payload.sub

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

    const permissionCheck = await client.query(
        'SELECT shopping_list_id FROM item WHERE id = $1 AND shopping_list_id IN (SELECT shopping_list_id FROM user_has_shopping_list WHERE user_id = (SELECT id FROM "user" WHERE auth0_key = $2))', [item_id, userid]
    )
    if (permissionCheck.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(403).json({ error: 'You are not allowed to update this item. Or the item does not exist' });
    }

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

router.post('/item/bulk', async (req, res) => {
  const  items  = req.body;
  const userid = req.auth.payload.sub

  // Validate input
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: '"items" must be a non-empty array' });
  }

  const client = await pool.connect();
  const insertedItems = []


  try {
    await client.query("BEGIN")

    const allowedLists = (await client.query(
        'SELECT shopping_list_id FROM user_has_shopping_list uhsl INNER JOIN public."user" u on u.id = uhsl.user_id WHERE u.auth0_key = $1', [userid]
    )).rows.map(row => row['shopping_list_id']);


    for(const item of items){
      const { shopping_list_id, name, amount, unit, recurrence_days, active } = item;

      if (!Number.isInteger(shopping_list_id) || shopping_list_id <= 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: '"shopping_list_id" must be a positive integer' });
      }

      if(!allowedLists.includes(shopping_list_id)){
        await client.query('ROLLBACK');
        return res.status(403).json({ error: 'You are not allowed to add items to this list' });
      }

      if (typeof name !== 'string' || name.trim().length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: '"name" is required and must be a non-empty string' });
      }

      if (amount !== undefined && (typeof amount !== 'number' || isNaN(amount)||amount<0)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: '"amount" must be a valid number' });
      }

      if (unit !== undefined && (typeof unit !== 'string' || unit.length > 15)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: '"unit" must be a string with max length 15' });
      }

      if (recurrence_days !== undefined && (!Number.isInteger(recurrence_days) || isNaN(recurrence_days)||recurrence_days<0)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: '"recurrence_days" must be an integer' });
      }

      if (active !== undefined && typeof active !== 'boolean') {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: '"active" must be a boolean' });
      }

      const listCheck = await client.query(
          "SELECT id FROM shopping_list WHERE id = $1",
          [shopping_list_id]
      )
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
      insertedItems.push(insertResult.rows[0])
    }
    await client.query('COMMIT');
    res.status(201).json({insertedItems});

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error inserting item:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }

})

//insert new item into list
router.post('/item', async (req, res) => {
  const { shopping_list_id, name, amount, unit, recurrence_days, active } = req.body;
  const auth0_key = req.auth.payload.sub
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

  if (unit !== undefined && (typeof unit !== 'string' || unit.length > 15)) {
    return res.status(400).json({ error: '"unit" must be a string with max length 15' });
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

    const userCheck = await client.query(
        'SELECT shopping_list_id FROM user_has_shopping_list WHERE shopping_list_id = $1 AND user_id = (SELECT id FROM "user" WHERE auth0_key = $2)', [shopping_list_id, auth0_key]
    )
    if (userCheck.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(403).json({ error: 'You are not allowed to add items to this list' });
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
  const creator_auth0_key = req.auth.payload.sub
  const { title, symbol } = req.body;
  console.log("Creating new shopping list with", creator_auth0_key, title, symbol);

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
  const auth0id = req.auth.payload.sub
  // Validate item_id
  const itemId = parseInt(item_id, 10);
  if (!Number.isInteger(itemId) || itemId <= 0) {
    return res
      .status(400)
      .json({ error: '"item_id" path param must be a positive integer' });
  }

  // Validate auth0 key
  if (typeof auth0id !== 'string' || auth0id.trim().length === 0) {
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
      [auth0id.trim()]
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

//remove user from list. If the user is the last one in the list, delete the list and all items
//if query param "force" is set to true, the creator of the list can delete the list for everyone
router.delete('/user/lists/:shopping_list_id', async (req, res) => {
  const auth0_key = req.auth.payload.sub
  const force = req.query.force === 'true'; // Check if force deletion is requested
  const { shopping_list_id } = req.params;

  const listId = parseInt(shopping_list_id, 10);
  if (!Number.isInteger(listId) || listId <= 0) {
      return res
      .status(400)
      .json({ error: '"shopping_list_id" path param must be a positive integer' });
  }
  if (typeof auth0_key !== 'string' || auth0_key.trim().length === 0) {
    return res
      .status(400)
      .json({ error: '"auth0_key" needs to be encoded in auth header and must be a non-empty string' });
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN');
    const userRes = await client.query(
        'SELECT id FROM public."user" WHERE auth0_key = $1', [auth0_key]
    )
    if( userRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res
        .status(403)
        .json({ error: 'Did not find user with that auth0_key' });
    }
    const userId = userRes.rows[0].id;

    const shoppingList = await client.query("SELECT id FROM shopping_list WHERE id = $1", [listId])
    if (!shoppingList.rowCount === 0) {
      await client.query('ROLLBACK');
      return res
        .status(404)
        .json({ error: `Shopping list ${listId} not found` });
    }

    if(!force) {
      const deleteUserList = await client.query(
          "DELETE FROM user_has_shopping_list WHERE shopping_list_id = $1 AND user_id = $2", [listId, userId]
      )
      if (deleteUserList.rowCount === 0) {
        await client.query('ROLLBACK');
        return res
            .status(404)
            .json({error: `User is not part of shopping list ${listId}`});
      }

      const remainingUsers = await client.query(
          "SELECT * FROM user_has_shopping_list WHERE shopping_list_id = $1", [listId]
      )
      if (remainingUsers.rowCount === 0) {
        //delete all items
        await client.query(
            "DELETE FROM item WHERE shopping_list_id = $1", [listId]
        )
        //and the list itself
        await client.query(
            "DELETE FROM shopping_list WHERE id = $1", [listId]
        )
      }
    }else {
      if (userRes.rows[0].id !== shoppingList.rows[0].creator_id) {
        await client.query('ROLLBACK');
        return res
          .status(403)
          .json({ error: 'You are not allowed to delete this list' });
      }else{
        //delete all items
        await client.query(
            "DELETE FROM item WHERE shopping_list_id = $1", [listId]
        )
        //delete all members of the list
        await client.query(
            "DELETE FROM user_has_shopping_list WHERE shopping_list_id = $1", [listId]
        )
        //and the list itself
        await client.query(
            "DELETE FROM shopping_list WHERE id = $1", [listId]
        )
      }
    }
    await client.query('COMMIT');
    return res.sendStatus(204) //no content
  }catch (err) {
    await client.query('ROLLBACK');
    console.error('Error deleting user from shopping list:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }

})

module.exports = router;