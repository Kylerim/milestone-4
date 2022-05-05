/* eslint no-console: ["error", { allow: ["warn", "error"] }] */
process.setMaxListeners(0);
// emitter.setMaxListeners(0);
const WebSocket = require("ws");
const express = require("express");
var ShareDB = require("sharedb/lib/client");
const session = require("express-session");
const { mongooseConnection } = require("./db/connectDB");
const MongoStore = require("connect-mongo");
const cors = require("cors");
const path = require("path");
const multer = require("multer");
const bodyParser = require("body-parser");
const richText = require("rich-text");
const { v4: uuidv4 } = require("uuid");
const mime = require("mime");
// const async = require("async");

const args = require("minimist")(process.argv.slice(2));
var QuillDeltaToHtmlConverter =
    require("quill-delta-to-html").QuillDeltaToHtmlConverter;
const {
    IS_PRODUCTION_MODE,
    PROD_IP,
    LOCAL_IP,
    GROUP_ID,
    websocketServer,
    MongoDBServer,
    shareDBServer,
} = require("./common.js");

if (args.s) {
    console = console || {};
    console.log = function () {};
}

const {
    adduser,
    login,
    logout,
    loginWithSession,
    verify,
} = require("./controllers/auth");

const {
    createIndex,
    updateIndex,
    deleteIndex,
    updateBulk,
    contentFormatter,
} = require("./controllers/elastic");
const { Document } = require("./models/Document");
// const { getDocLists } = require('./controllers/documents');

const PORT = !IS_PRODUCTION_MODE ? 5001 : args.port ? args.port : 5001;
//const PORT = 5001;
const IP = IS_PRODUCTION_MODE ? PROD_IP : LOCAL_IP;

const sessionStore = new MongoStore({
    client: mongooseConnection.getClient(),
    dbName: "milestone4",
    autoRemove: "native",
});

const app = express();
app.use(
    session({
        secret: "secret-key",
        saveUninitialized: true,
        resave: false,
        store: sessionStore,
        cookie: { secure: false },
        expires: new Date(Date.now() + 1 * 86400 * 1000), //expire 1 day
    })
);

//  app.get('*', (req, res) => {
//     //     res.sendFile(path.resolve(__dirname, '../client/build', 'index.html'));
//     // });

app.use(function (req, res, next) {
    res.setHeader("X-CSE356", GROUP_ID);
    next();
});
app.use(express.static(path.resolve(__dirname, "../client/build")));

app.get("/home", (req, res) => {
    console.log("ACCESSING... /home");
    res.sendFile(path.resolve(__dirname, "../client/build", "index.html"));
});
app.get("/doc/edit/:docId", (req, res) => {
    console.log("doc/edit/:docId");
    res.sendFile(path.resolve(__dirname, "../client/build", "index.html"));
});

app.use(bodyParser.urlencoded({ extended: true, limit: "100mb" }));
app.use(bodyParser.json({ limit: "100mb" }));

if (IS_PRODUCTION_MODE) {
    app.use(cors({ credentials: true }));
} else {
    app.use(cors({ credentials: true, origin: true }));
}

//ShareDB Connection
ShareDB.types.register(richText.type);

let sharedbServerPort = (parseInt(PORT) % 12) + 5555;
sharedbServerPort = sharedbServerPort.toString();
let websocketServerDynamic = `ws://${shareDBServer}:${sharedbServerPort}`;

const socket = new WebSocket(websocketServerDynamic);
const connection = new ShareDB.Connection(socket);

let docSessions = new Map();
let names = new Map();

function sendBulkUpdate() {
    toUpdate = [];
    docSessions.forEach((docSession, docId) => {
        if (docSession.isTouched) {
            console.log(
                "[Updated] Version of elastic: ",
                docSession.elasticVersion
            );
            // docSessions.get(docId).elasticVersion = version;
            let doc = connection.get("documents", docId);
            const formatted = contentFormatter(docId, doc.data.ops);
            console.log("Formatteed", JSON.stringify(formatted));
            toUpdate.push(...formatted);
            docSession.isTouched = false;
        }
    });
    updateBulk(toUpdate);
}

setInterval(sendBulkUpdate, 5000);
//EVENT STREAM
function eventsHandler(request, response) {
    const headers = {
        "Content-Type": "text/event-stream",
        Connection: "keep-alive",
        "Cache-Control": "no-cache",
        "X-CSE356": GROUP_ID,
    };
    response.writeHead(200, headers);
    response.write(`data:[]\n\n`);
    if (!request.session.user) {
        response.json({ error: true, message: "Not logged in" });
        return;
    }
    const clientId = request.params.connectionId;
    const docId = request.params.docId;

    // if no active docsession, add to current doc session map
    if (!docSessions.has(docId)) {
        const doc = connection.get("documents", docId);
        // const queue = async.queue(queueCallback, 1);
        if (!doc.subscribed) {
            doc.subscribe(function (err) {
                console.log("Subscribed to ", docId);
                if (err) throw err;
            });
        }

        docSessions.set(docId, {
            doc,
            elasticVersion: doc.version,
            clients: new Set(),
            // queue,
            isBeingProcessed: false,
        });
    }

    // read a docsession given a docId
    const docSession = docSessions.get(docId);
    let clients = docSession.clients;
    const doc = docSession.doc;
    const newClient = {
        id: clientId,
        name: request.session.user, //works now
        response,
    };

    // console.log("---------------------------------------------------");
    // console.log("---------------------------------------------------");

    // console.log(
    //     `[NEW CONNECTION] uid: ${request.session.user} | cid: ${clientId}`
    // );

    //push if not exist
    if (!clients.has(clientId)) {
        clients.add(newClient);
    }

    console.log("[USERS] Connected Users: ", clients.size);
    // console.log("---------------------------------------------------");
    // console.log("---------------------------------------------------");

    //return the initial doc to the user.
    // note, we are only connecting the user..!
    // clients.forEach((cl) => {
    //     if (cl.id === clientId) {

    if (doc && doc.data && doc.data.ops) {
        const ops = doc.data.ops;
        const formatted = { content: ops, version: doc.version };
        // console.log(
        //     `[DOC] Sending Out Initial Document Content & Version. \n data: ${JSON.stringify(
        //         formatted
        //     )}\n\n`
        // );
        response.write(`data: ${JSON.stringify(formatted)}\n\n`);
    }

    // });
    request.on("close", () => {
        if (doc && doc.data) {
            updateIndex(docId, doc.data.ops);
        }
        sendPresenceEventsToAll(request, docId, clientId, null);
        clients.delete(newClient);

        // console.log(`${clientId} Connection closed`);
        // console.log(
        //     `[LOST CONNECTION] uid: ${request.session.user} | cid: ${clientId}`
        // );
        if (clients.size === 0) {
            // doc.destroy();
            doc.unsubscribe(function (error) {
                if (error) throw error;
                console.log("docSessions.size", docSessions.size);
                docSessions.delete(docId);
                // console.log("---------------------------------------------------");
                // console.log(`${docId} session is now removed from session map. `);
                // console.log("docSessions.size", docSessions.size);
            });
        } else {
            // console.log("---------------------------------------------------");
            // console.log(
            //     "[USERS] Remaining Connected Users: ",
            //     Array.from(docSessions.get(docId).clients).map(
            //         (i) => "uid: " + i.name + "| cid: " + i.id
            //     )
            // );
            // console.log(
            //     "[USERS] Updated Connected Users: ",
            //     docSessions.get(docId).clients.size
            // );
            // console.log("---------------------------------------------------");
        }
    });
}

function sendOpToAll(request, docId, connectionId, data) {
    if (!request.session.user) {
        ////response.setHeader('X-CSE356', GROUP_ID);
        response.json({ error: true, message: "Not logged in" });
        return;
    }
    if (!docSessions.get(docId)) {
        response.json({
            error: true,
            message: "Document does not exit anymore",
        });
        return;
    }
    const clients = docSessions.get(docId).clients;
    console.log("Broadcasting OPs to ", clients.size - 1);
    try {
        clients.forEach((client) => {
            if (client.id != connectionId) {
                //send updates to all except the request sender
                console.log("[OP] Sending OP TO: ", client.id);
                client.response.write(`data: ${JSON.stringify(data)}\n\n`);
                console.log(`data: ${JSON.stringify(data)}`);
            }
        });
    } catch (e) {
        console.log(e);
    }
}

function sendAck(request, docId, connectionId, data, version) {
    if (!request.session.user) {
        ////response.setHeader('X-CSE356', GROUP_ID);
        response.json({ error: true, message: "Not logged in" });
        return;
    }
    if (!docSessions.get(docId)) {
        response.json({
            error: true,
            message: "Document does not exit anymore",
        });
        return;
    }
    const clients = docSessions.get(docId).clients;

    clients.forEach((client) => {
        if (client.id == connectionId) {
            const ackData = { ack: data };
            client.response.write(`data: ${JSON.stringify(ackData)}\n\n`);
            console.log(
                "[ACK] Sending TO (itself):",
                connectionId,
                "  [Version]: ",
                version
            );
            console.log(`Ack Data: ${JSON.stringify(ackData.ack)}`);
        }
    });
}

function sendPresenceEventsToAll(request, docId, connectionId, cursor) {
    // console.log("[PRESENCE] Sending to all... FROM:", connectionId);
    if (!docSessions.get(docId)) {
        return;
    }
    if (!docSessions.get(docId)) {
        response.json({
            error: true,
            message: "Document does not exit anymore",
        });
        return;
    }
    const clients = docSessions.get(docId).clients;

    if (cursor) cursor.name = request.session.user;
    const data = {
        presence: {
            id: connectionId,
            cursor: cursor,
        },
    };

    try {
        clients.forEach((client) => {
            if (client.id != connectionId) {
                // console.log("[PRESENCE] Sending... TO:", client.id);
                client.response.write(`data: ${JSON.stringify(data)}\n\n`);
                // console.log(`data: ${JSON.stringify(presence)}`)
            }
        });
        console.log("[Presences Sent]");
    } catch (e) {
        console.log(e);
    }
}

function updateOpsQueue(request, response) {
    const docId = request.params.docId;
    if (!docSessions.has(docId)) {
        response.json({
            error: true,
            message: "Document does not exit anymore",
        });
        return;
    }
    // const queue = docSessions.get(docId).queue;
    // queue.push({ request, response }, (error, { connectionId }) => {
    //     if (error) {
    //         console.log(`An error occurred while processing task ${task}`);
    //     } else {
    //         console.log(`Finished processing task ${connectionId}
    //                tasks remaining`);
    //     }
    // });

    if (!request.session.user) {
        //response.setHeader('X-CSE356', GROUP_ID);
        response.json({ error: true, message: "Not logged in" });
        return;
    }

    let connectionId = request.params.connectionId;
    let doc = connection.get("documents", docId);
    let content = request.body.op;
    let version = request.body.version;
    // let remaining = 0;
    // if (docSessions.has(docId)) {
    //     remaining = docSessions.get(docId).queue.length;
    // }

    // if (
    //     docSessions.has(docId) &&
    //     Math.abs(version - docSessions.get(docId).elasticVersion) > 20
    // ) {
    //     console.log(
    //         "Version of elastic: ",
    //         docSessions.get(docId).elasticVersion,
    //         " Version:",
    //         version
    //     );
    //     docSessions.get(docId).elasticVersion = version;
    //     updateIndex(docId, doc.data.ops);
    // }
    console.log("******************************************");
    console.log("******************************************");

    // console.log("VERSION OP : ", version, "VERSION DOC : ", doc.version);
    // console.log("FROM: ", JSON.stringify(connectionId));
    // console.log("CONTENT: ", JSON.stringify(content));
    // console.log("------------------------------------------");

    if (version < doc.version || version > doc.version) {
        console.log("Sending retry back");
        // completed(null, { connectionId });
        response.json({ status: "retry" });
        response.end();
        return;
    } else if (version == doc.version) {
        console.log("Version Ok. Preparing to submit doc...");

        if (docSessions.get(docId).isBeingProcessed) {
            console.log("[ERROR] Doc is busy. Sending retry back");
            response.json({ status: "retry" });
            response.end();
            return;
        } else {
            docSessions.get(docId).isBeingProcessed = true;

            doc.submitOp(content, { source: connectionId }, (err) => {
                if (err) {
                    console.log(
                        "Unable to submit OP to sharedb: ",
                        JSON.stringify(err)
                    );
                    // response.setHeader('X-CSE356', GROUP_ID);
                    response.json({
                        error: true,
                        message: "Failed to update ops",
                    });
                    response.end();
                    return;
                    // EDIT THE VERSIONS
                } else {
                    console.log(
                        "OP Submission to Sharedb Complete. From: ",
                        connectionId,
                        "Version: ",
                        version
                    );
                    // console.log("Content: ", content);
                    // console.log("Preparing to send acknowledgement back...");

                    sendOpToAll(request, docId, connectionId, content);
                    sendAck(request, docId, connectionId, content, version);
                    // completed(null, { connectionId });
                    docSessions.get(docId).isTouched = true;
                    docSessions.get(docId).isBeingProcessed = false;
                    response.json({ status: "ok" });
                    response.end();
                    return;
                }
            });
        }
    }
    // else {
    //     console.log("[VERSION ERROR]: Client is ahead of server");
    //     response.json({
    //         error: true,
    //         message: "[Impossible] Client is ahead of server",
    //     });
    //     response.end();
    //     return;
    // }
}

function updateCursor(request, response) {
    if (!request.session.user) {
        //response.setHeader('X-CSE356', GROUP_ID);
        response.json({ error: true, message: "Not logged in" });
        return;
    }
    const connectionId = request.params.connectionId;
    const docId = request.params.docId;

    const doc = docSessions.get(docId).doc;
    // console.log("[PRESENCE] New Presence Info Received");
    console.log(request.body);
    const cursor = request.body;

    // localPresence.submit(cursor, function (error) {
    //     if (error) throw error;
    // });
    sendPresenceEventsToAll(request, docId, connectionId, cursor);
    cursor.name = request.session.user;
    // doc.submitOp(cursor, { source: connectionId })
    //     , (err) => {

    //     if (err) {
    //         response.setHeader('X-CSE356', GROUP_ID);
    //         response.json({
    //             error: true,
    //             message: "Failed to update cursor"
    //         });
    //         response.end()
    //         // EDIT THE VERSIONS
    //     }
    // })
    console.log("[Cursor] Update Completed ");

    response.json({});
    response.end();
    return;
}

async function createDoc(request, response) {
    if (!request.session.user) {
        //response.setHeader('X-CSE356', GROUP_ID);
        response.json({ error: true, message: "Not logged in" });
        return;
    }

    const name = request.body.name;
    const docid = uuidv4();
    names.set(docid, name);

    console.log("docId: " + docid);
    const doc = connection.get("documents", docid);
    //adding document to index
    await createIndex(docid, name, "");
    doc.fetch(function (err) {
        response.setHeader("X-CSE356", GROUP_ID);

        if (err) {
            response.json({ error: true, message: "Error: createDoc" });
            throw err;
        }
        if (doc.type === null) {
            // doc.create({name: name});
            doc.create([], "rich-text", function (error) {
                if (error) throw error;
                console.log("Document is created and sending docId back");
                // response.writeHead(200, headers);
                response.json({ docid }); //
            });
        }
    });
}

async function deleteDoc(request, response) {
    if (!request.session.user) {
        //response.setHeader('X-CSE356', GROUP_ID);
        response.json({ error: true, message: "Not logged in" });
        return;
    }

    const docId = request.body.docid;

    console.log("deleting docId: " + docId);
    // let doc = docSessions.get(docId).doc;
    // if (doc === undefined)
    await deleteIndex(docId);
    Document.findOne({ _id: docId }).exec((err, document) => {
        if (err) {
            response.json({
                error: true,
                message: "Error in fetching data from db",
            });
            return;
        } else if (!document) {
            response.json({
                error: true,
                message: "No user with corresponding docid",
            });
            return;
        }
    });

    const doc = connection.get("documents", docId);
    doc.del({}, function (error) {
        // response.setHeader('X-CSE356', GROUP_ID);
        if (error) {
            response.json({
                error: true,
                message: "Failed to delete document",
            });
            throw error;
        }
        docSessions.delete(docId);
        names.delete(docId);

        Document.deleteOne({ _id: docId }).exec((err) => {
            if (err) {
                response.json({
                    error: true,
                    message: "Cannot delete the document from mongodb",
                });
            }
        });
        response.json({
            status: "ok",
            message: "Successfully deleted the document: " + docId,
        }); //
    });
}

function sendHtml(request, response) {
    //response.setHeader('X-CSE356', GROUP_ID);

    if (!request.session.user) {
        response.json({ error: true, message: "Not logged in" });
        return;
    }

    const clientId = request.params.connectionId;
    const docId = request.params.docId;
    const doc = connection.get("documents", docId);

    doc.fetch(function (error) {
        if (error) throw error;
        let converter = new QuillDeltaToHtmlConverter(doc.data.ops, {});
        let html = converter.convert();
        console.log(html);
        response.send(html);
    });
}

function getDocLists(req, res) {
    //response.setHeader('X-CSE356', GROUP_ID);
    console.log(req.session.user);
    if (!req.session.user) {
        res.json({ error: true, message: "Not logged in" });
        return;
    }
    connection.createFetchQuery(
        "documents",
        {
            $sort: { "_m.mtime": -1 },
            $limit: 10,
        },
        {},
        (error, results) => {
            // results is an array of Doc instances with their data populated

            if (error) {
                res.json({ error: true, message: "Error in getting doc list" });
                throw error;
            }
            // ADD ERROR!! AND HEADER w/ ERR!!
            console.log(`Document Lists size : \n ${results.length}`);
            const formatted = results.map((doc) => ({
                id: doc.id,
                // name: doc.id.split(":")[1],
                name: names.get(doc.id),
            }));
            res.json(formatted);
        }
    );
}

//img uploads---------------------------------

app.get("/media/access/:id", (request, response, next) => {
    if (!request.session.user) {
        response.json({
            error: true,
            message: "Not logged in: " + JSON.stringify(request.session),
        });
        return;
    }

    var fileName = request.params.id;
    response.setHeader("Content-Type", mime.getType(fileName));
    console.log(
        `[MEDIA ACCESS]: ${fileName}`,
        `From ${request.session.user},  FileType: ${mime.getType(fileName)}`
    );

    response.sendFile(path.join(__dirname, "/media/access/" + fileName));
});

const storage = multer.diskStorage({
    destination: path.join("./media/access"),
    filename: function (req, file, cb) {
        if (
            file.mimetype == "image/png" ||
            file.mimetype == "image/jpeg" ||
            file.mimetype == "image/gif"
        ) {
            imageName = Date.now() + path.extname(file.originalname);
            return cb(null, imageName);
        } else {
            return cb(
                new Error("Invalid Mimetype! Received " + file.mimetype, false)
            );
        }
    },
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10000000 },
}).single("file");

function uploadImage(req, res) {
    if (!req.session.user) {
        //response.setHeader('X-CSE356', GROUP_ID);
        res.json({ error: true, message: "Not logged in" });
        return;
    }

    console.log("Image Request coming from client");
    upload(req, res, (err) => {
        //response.setHeader('X-CSE356', GROUP_ID);

        if (err) {
            res.json({ error: true, message: err.message });
            console.log("[IMAGE]: Invalid MimeType Error Sent to Client");
        } else {
            console.log("[IMAGE]: URL returned to client.");
            const url = `http://${IP}:${PORT}/media/access/${imageName}`;

            console.log(url);

            res.setHeader("Content-Type", mime.getType(url));
            return res.status(200).json({ mediaid: imageName });
        }
    });
}

app.get("/doc/connect/:docId/:connectionId", eventsHandler);
app.post("/doc/presence/:docId/:connectionId", updateCursor);
app.get("/doc/get/:docId/:connectionId", sendHtml);

app.post("/collection/create", createDoc);
app.post("/collection/delete", deleteDoc);
app.get("/collection/list", getDocLists);

app.post("/doc/op/:docId/:connectionId", updateOpsQueue);
app.post("/media/upload", uploadImage);
app.post("/users/signup", adduser);
app.post("/users/login", login);
app.get("/users/logout", logout);
app.get("/users/verify", verify);

// app.get("/index/search", searchIndex);
// app.get("/index/suggest", suggestIndex);

if (IS_PRODUCTION_MODE) {
    app.listen(PORT, IP, () =>
        console.log(
            `[PRODUCTION MODE] CSE356 Milestone 4: listening on port ${PORT}`
        )
    );
} else {
    app.listen(PORT, IP, () =>
        console.log(`CSE356 Milestone 4: listening on port ${PORT}`)
    );
}
