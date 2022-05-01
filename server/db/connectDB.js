const mongoose = require("mongoose");

mongoose.connect("mongodb://localhost:27017/milestone3", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});
exports.mongooseConnection = mongoose.connection;
