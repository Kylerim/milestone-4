const { Client } = require("@elastic/elasticsearch");
// const session = require("express-session");
const express = require("express");
const bodyParser = require("body-parser");
const { PROD_IP, GROUP_ID, IS_PRODUCTION_MODE } = require("./common.js");

const args = require("minimist")(process.argv.slice(2));

const client = new Client({
    node: "http://localhost:9200",
});
const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
// app.use(
//     session({
//         secret: "secret-key",
//         saveUninitialized: true,
//         resave: false,
//         store: sessionStore,
//         cookie: { secure: false },
//         expires: new Date(Date.now() + 1 * 86400 * 1000), //expire 1 day
//     })
// );

app.use(function (req, res, next) {
    res.setHeader("X-CSE356", GROUP_ID);
    next();
});

const searchIndex = async (req, res) => {
    // if (!req.session.user) {
    //     //response.setHeader('X-CSE356', GROUP_ID);
    //     res.json({ error: true, message: "Not logged in" });
    //     return;
    // }
    const query = req.query.q;
    console.log("Search query is", query);

    const result = await client.search({
        index: "documents",
        size: 10,
        // query: {
        //     match: {
        //         content: query,
        //     },
        // },
        query: {
            multi_match: {
                type: "phrase",
                query: query,
                fields: ["title", "content"],
            },
        },
        highlight: {
            fields: {
                content: {
                    fragment_size: 600,
                },
            },
            boundary_scanner: "sentence",
            boundary_max_scan: 50,
        },
    });
    // console.log("results");
    // console.log(result.hits.hits);
    const toSend = result.hits.hits.map((doc) => {
        console.log(doc._id);
        return {
            docid: doc._id,
            name: doc._source.title,
            snippet: doc.highlight.content[0] || "",
        };
    });
    res.json(toSend);
};

const suggestIndex = async (req, res) => {
    // if (!req.session.user) {
    //     //response.setHeader('X-CSE356', GROUP_ID);
    //     res.json({ error: true, message: "Not logged in" });
    //     return;
    // }
    const query = req.query.q;
    console.log("Suggest query is", query);
    const result = await client.search({
        size: 10,
        index: "documents",
        query: {
            prefix: { content: query },
        },
        highlight: {
            pre_tags: "<<>>",
            post_tags: "<<>>",
            fields: {
                content: {
                    fragment_size: 0,
                    number_of_fragments: 1,
                    boundary_chars: "",
                },
            },
        },
    });
    // res.json(result.hits);
    const ret = new Set();
    // console.log("results");
    // console.log(result.hits.hits);
    result.hits.hits.forEach((doc) => {
        const splited = doc.highlight.content[0].split("<<>>");
        console.log(doc._id);
        splited.forEach((part) => {
            if (part.startsWith(query)) {
                ret.add(part);
            }
        });
    });
    res.json(Array.from(ret));
};

// app.post("/index/create", async (req, res) => {
//     const newtitle = req.body.title;
//     const newContent = req.body.content;
//     const id = req.body.id;

//     // console.log("title", newtitle)
//     try {
//         const result = await client.index({
//             refresh: true,
//             index: "documents",
//             id: id,
//             document: {
//                 title: newtitle,
//                 content: newContent,
//             },
//         });
//         res.json({ result });
//     } catch (error) {
//         res.json({ error });
//     }
// });

// app.post("/index/update", async (req, res) => {
//     const newContent = req.body.content;
//     const id = req.body.id;

//     console.log("Body", req.body);

//     const result = await client.update({
//         refresh: true,
//         index: "documents",
//         id: id,
//         doc: {
//             content: newContent,
//         },
//     });

//     res.json({ result });
// });

// app.get("/index/search", async (req, res) => {
//     const query = req.query.q;
//     console.log("Search query is", query);

//     const result = await client.search({
//         index: "documents",
//         query: {
//             multi_match: {
//                 query: query,
//                 fields: ["title^2", "content"],
//                 type: "phrase_prefix",
//             },
//         },
//         highlight: {
//             fields: {
//                 content: {},
//             },
//             // boundary_max_scan: 50,
//             // boundary_scanner: "sentence",
//         },
//     });

//     const toSend = result.hits.hits.map((doc) => {
//         return {
//             id: doc._id,
//             name: doc._source.title,
//             snippet: doc.highlight.content,
//         };
//     });
//     res.json(toSend);
// });

app.get("/index/search", searchIndex);
app.get("/index/suggest", suggestIndex);

const ELASTIC_PORT = !IS_PRODUCTION_MODE ? 6001 : args.port ? args.port : 6001;

app.listen(ELASTIC_PORT, PROD_IP, () =>
    console.log(`CSE356 Milestone 3: listening on port ${ELASTIC_PORT}`)
);

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
// async function run() {
//     // Let's start by indexing some data
//     await client.index({
//         index: 'documents',
//         document: {
//             title: 'Ned Stark',
//             quote: 'Winter is coming.'
//         }
//     });

//     await client.index({
//         index: 'documents',
//         document: {
//             character: 'Daenerys Targaryen',
//             quote: 'I am the blood of the dragon.'
//         }
//     });

//     await client.index({
//         index: 'documents',
//         document: {
//             character: 'Tyrion Lannister',
//             quote: 'A mind needs books like a sword needs a whetstone.'
//         }
//     });

//     // // here we are forcing an index refresh, otherwise we will not
//     // // get any result in the consequent search
//     await client.indices.refresh({ index: 'documents' })

//     // Let's search!
//     const result = await client.search({
//         index: 'documents',
//         query: {
//             match: { quote: 'winter' }
//         }
//     });

//     console.log(result.hits.hits)
// }

// run().catch(console.log);
