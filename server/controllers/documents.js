const { application } = require('express');
const { Document } = require('../models/Document');
const { GROUP_ID } = require('../common');
exports.getDocLists = (req, res) => {
    res.setHeader('X-CSE356', GROUP_ID)
    Document.find().limit(10).exec((err, docs) => {
        if (docs) {
            console.log(`Document Lists : \n ${docs}`);
            const formatted = docs.map((doc) => ({
                id: doc._id,
                name: doc.name
            }))
            res.json(formatted);
        }
    })
}