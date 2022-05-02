const { Client } = require("@elastic/elasticsearch");
const { PROD_IP, ELASTIC_PORT, GROUP_ID, LOCAL_IP } = require("../common.js");
const QuillDeltaToHtmlConverter =
    require("quill-delta-to-html").QuillDeltaToHtmlConverter;
const async = require("async");
// const elastic_id = uuidv4();
const { convert } = require("html-to-text");
const client = new Client({
    node: "http://209.94.59.103:9200",
    auth: {
        username: "elastic",
        password: "kylerim123",
    },
});

exports.contentFormatter = function (id, delta) {
    let converter = new QuillDeltaToHtmlConverter(delta, {});
    let html = converter.convert();
    let content = convert(html, {
        wordwrap: null,
    });
    content = content.replace(/(\r\n|\n|\r)/gm, " ");
    return [
        {
            update: {
                _id: id,
                _index: "documents",
                retry_on_conflict: 3,
                _source: false,
            },
        },
        {
            doc: {
                content,
            },
        },
    ];
};

const bulkQueueCallback = async function ({ operations }) {
    // const content = toPlaintext(delta);
    // const result = await client.update({
    //     refresh: true,
    //     retry_on_conflict: 2,
    //     index: "documents",
    //     id: id,
    //     doc: {
    //         content: content,
    //     },
    // });
    console.log(operations);

    const result = await client.bulk({
        _source: false,
        operations,
        refresh: true,
    });

    // if (result) {
    //     completed(null, operations.length);
    // }
    // } else {
    //     completed(result.errors, operations.length);
    // }
};

const queueCallback = async function ({ id, delta }) {
    let converter = new QuillDeltaToHtmlConverter(delta, {});
    let html = converter.convert();
    let content = convert(html, {
        wordwrap: null,
    });
    content = content.replace(/(\r\n|\n|\r)/gm, " ");
    // const content = toPlaintext(delta);
    console.log("Updating content", content);
    // const result = await client.update({
    //     refresh: true,
    //     retry_on_conflict: 2,
    //     index: "documents",
    //     id: id,
    //     doc: {
    //         content: content,
    //     },
    // });
    const result = await client.update({
        refresh: true,
        retry_on_conflict: 3,
        index: "documents",
        id: id,
        doc: {
            content: content,
        },
    });
    // if (result) {
    //     completed(null, id);
    // }
};

const queue = async.queue(queueCallback, 10);

const bulkQueue = async.queue(bulkQueueCallback, 10);
bulkQueue.error(function (err, task) {
    console.error("task experienced an error", err, task);
});
exports.createIndex = async function (id, title, content) {
    // console.log("elastic client id", elastic_id);
    const result = await client.index({
        refresh: true,
        index: "documents",
        id,
        document: {
            title: title,
            content: content,
        },
    });
    return result;
};

exports.deleteIndex = async function (id) {
    const result = await client.delete({
        refresh: true,
        index: "documents",
        id,
    });
    return result;
};

exports.updateIndex = function (id, delta) {
    queue.push({ id, delta });

    //     (error, docid) => {
    //     if (error) {
    //         console.log(`An error occurred while processing task${error}`);
    //     } else {
    //         console.log(`Finished processing task ${docid}
    //                tasks remaining`);
    //     }
    // });
};

exports.updateBulk = function (operations) {
    // const completed = (error, number) => {
    //     if (error) {
    //         console.log(`An error occurred while processing task ${error}`);
    //     } else {
    //         console.log(`Finished processing ${number} updates`);
    //     }
    // };
    if (operations.length > 0) {
        console.log("update Bulk is called operations ", operations);
        bulkQueue.push({ operations });
    }
};

// exports.searchIndex = async (req, res) => {
//     if (!req.session.user) {
//         //response.setHeader('X-CSE356', GROUP_ID);
//         res.json({ error: true, message: "Not logged in" });
//         return;
//     }
//     const query = req.query.q;
//     console.log("Search query is", query);

//     const result = await client.search({
//         index: "documents",
//         size: 10,
//         // query: {
//         //     match: {
//         //         content: query,
//         //     },
//         // },
//         query: {
//             multi_match: {
//                 type: "phrase",
//                 query: query,
//                 fields: ["title", "content"],
//             },
//         },
//         highlight: {
//             fields: {
//                 content: {
//                     fragment_size: 300,
//                 },
//             },
//         },
//     });
//     // console.log(result.hits.hits);
//     const toSend = result.hits.hits.map((doc) => {
//         return {
//             docid: doc._id,
//             name: doc._source.title,
//             snippet: doc.highlight.content[0] || "",
//         };
//     });
//     res.json(toSend);
// };

// exports.suggestIndex = async (req, res) => {
//     if (!req.session.user) {
//         //response.setHeader('X-CSE356', GROUP_ID);
//         res.json({ error: true, message: "Not logged in" });
//         return;
//     }
//     const query = req.query.q;
//     console.log("Suggest query is", query);
//     const result = await client.search({
//         size: 10,
//         index: "documents",
//         query: {
//             prefix: { content: query },
//         },
//         highlight: {
//             pre_tags: "<<>>",
//             post_tags: "<<>>",
//             fields: {
//                 content: {
//                     fragment_size: 0,
//                     number_of_fragments: 1,
//                     boundary_chars: "",
//                 },
//             },
//         },
//     });
//     // res.json(result.hits);
//     const ret = new Set();
//     result.hits.hits.forEach((doc) => {
//         const splited = doc.highlight.content[0].split("<<>>");
//         splited.forEach((part) => {
//             if (part.startsWith(query)) {
//                 ret.add(part);
//             }
//         });
//     });
//     res.json(Array.from(ret));
// };

// exports.suggestIndex = async (req, res) => {
//     if (!req.session.user) {
//         //response.setHeader('X-CSE356', GROUP_ID);
//         res.json({ error: true, message: "Not logged in" });
//         return;
//     }
//     const query = req.query.q;
//     console.log("Suggest query is", query);
//     const result = await client.search({
//         index: "documents",
//         suggest: {
//             suggester: {
//                 text: query,
//                 term: {
//                     field: "content",
//                     suggest_mode: "popular",
//                     prefix_length: query.length,
//                     min_word_length: query.length + 1,
//                     string_distance: "ngram",
//                     // sort: "frequency",
//                 },
//             },
//         },
//     });
//     console.log(result.suggest.suggester);
//     const toSend = result.suggest.suggester[0].options.map((opt) => opt.text);
//     res.json(toSend);
// };

// curl -X PUT "localhost:9200/documents?pretty" -H 'Content-Type: application/json' -d'
// {
//   "settings": {
//     "number_of_shards": 1
//   },
//   "mappings": {
//     "properties": {
//       "title": { "type": "text", "analyzer":"english" }, "content": {"type": "text", "analyzer": "english"}
//     }
//   }
// }
// '

// POST documents/_search
// {
//   "suggest": {
//     "suggester" : {
//       "text": "ston",
//       "term" : {
//         "field" : "content",
//         "suggest_mode": "always",
//         "prefix_length": 3,
//         "min_word_length": 3,
//         "string_distance": "ngram",
//         "sort": "frequency"
//       }
//     }
//   }
// }
