const { Schema, model } = require("mongoose");
const { mongooseConnection } = require("../db/connectDB");
const docSchema = new Schema({
    _id: String,
    ops: [],
    _type: String,
    _v: Number,
    _m: { ctime: Number, mtime: Number },
});

const Document = mongooseConnection.model("Documents", docSchema);
exports.Document = Document;
