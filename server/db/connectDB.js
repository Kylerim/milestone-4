const mongoose = require("mongoose");
const { MongoDBServer } = require("../common");

mongoose.connect(`mongodb://${MongoDBServer}:27017/milestone4`, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});
exports.mongooseConnection = mongoose.connection;
