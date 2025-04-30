const express = require("express");
const router = express.Router();
const pool = require("../pool");

//TODO add new shopping list
//TODO remove item from list
//TODO add user to list
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
router.put('/items/:item_id', async (req, res) => {
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


//TODO insert new item into list


module.exports = router;