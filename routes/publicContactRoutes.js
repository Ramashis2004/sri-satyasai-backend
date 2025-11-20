const express = require("express");
const router = express.Router();

const contactCtrl = require("../controllers/contactController");

router.post("/contact", contactCtrl.submit);

module.exports = router;
