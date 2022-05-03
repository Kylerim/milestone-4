const mongoose = require("mongoose");

mongoose.connect("mongodb://localhost:27017/milestone4", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});
exports.mongooseConnection = mongoose.connection;
