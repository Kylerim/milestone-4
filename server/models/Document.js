const { Schema, model } = require("mongoose")
const { mongooseConnection } = require('../db/connectDB');
const docSchema = new Schema({
    _id: String,
    name: String,
    content: Object,
})

const Document = mongooseConnection.model("Document", docSchema)
exports.Document = Document;