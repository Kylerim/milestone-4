const mongoose = require("mongoose");
const { shareDBMongoDBServer } = require("./common.js");

mongoose.connect(`mongodb:${shareDBMongoDBServer}//:27017/milestone4`, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});
exports.mongooseConnection = mongoose.connection;
