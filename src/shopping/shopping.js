const express = require("express");
const router = express.Router();

const pool = require("../pool");


//TODO AUTHENTICATION
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
//TODO ADD AUTHENTICATION
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
module.exports = router;