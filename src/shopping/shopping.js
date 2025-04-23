const express = require("express");
const router = express.Router();

const pool = require("../pool");



//Get specific shopping list
router.get("/:product_id", async (req, res) => {
    try {
        if (isNaN(req.params.product_id)) {
            res.status(400).send("Incorrect Input");
        } else {

            let query ="SELECT item.id,item.name,item.amount,item.unit,item.last_update,item.recurrence_days,item.active,shopping_list.title,shopping_list.symbol FROM item JOIN shopping_list ON item.shopping_list_id = shopping_list.id";
            query += " WHERE shopping_list.id = $1;";

            const allListings = await pool.query(query, [req.params.product_id]);

            if (allListings.rows.length === 0) {
                return res.status(404).json({ message: "No listings found" });
            }
            res.status(200).json(allListings.rows);
        }
    } catch (error) {
        res.status(500).send(`Server Error: ${error}`);
    }
});

router.get("/users/user-listings", async (req, res) => {
    try {
        const userExists = await pool.query(
            `
            SELECT user_id FROM users WHERE user_id = $1
            `,
            [req.session.user_id]
        );

        if (userExists.rows.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }
        let query ="SELECT item.id,item.name,item.amount,item.unit,item.last_update,item.recurrence_days,item.active,shopping_list.title,shopping_list.symbol FROM item JOIN shopping_list ON item.shopping_list_id = shopping_list.id";
        query += " WHERE shopping_list.id = $1;";
        const productId = req.params.product_id;
        const allListings = await pool.query(query, [req.session.user_id]);

        if (allListings.rows.length === 0) {
            return res.status(404).json({ message: "No listings found" });
        }

        res.status(200).json(allListings.rows);
    } catch (error) {
        res.status(500).send(`Server Error: ${error}`);
    }
});


module.exports = router;