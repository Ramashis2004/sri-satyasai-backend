const mongoose = require("mongoose");

const schoolRoleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
  },
  {
    timestamps: true,
    collection: "school_roles",
  }
);

module.exports = mongoose.model("SchoolRole", schoolRoleSchema);
