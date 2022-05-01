import { useState, useEffect, useCallback } from "react";
import Quill from "quill";
import { useParams } from "react-router-dom";
import QuillCursors from "quill-cursors";
import "quill/dist/quill.snow.css";
import { v4 as uuidV4 } from "uuid";
import tinycolor from "tinycolor2";
import { backendURL } from "../Common";
const IS_PRODUCTION_MODE = false;
// make above true for deploying

const colors = {};

if (IS_PRODUCTION_MODE) {
    backendURL = "http://209.151.151.191";
}

const connectionId = uuidV4();

Quill.register("modules/cursors", QuillCursors);

function TextEditor() {
    const [quill, setQuill] = useState();
    const [cursors, setCursors] = useState();
    const [quillLoaded, setQuillLoaded] = useState(false);
    const [listening, setListening] = useState(false);
    const [version, setVersion] = useState(0);
    const [presences, setPresences] = useState([]);
    const [imageFile, setImageFile] = useState();
    const [imagePreview, setPreview] = useState();
    const [isUploading, setIsUploading] = useState(-2);
    //-2 choose file, -1 upload img ,0 loading, 1 loaded, 2 err
    const [uploadedImageURL, setUploadedImageURL] = useState("");
    const { docId } = useParams();
    // console.log("DocID:", docId);

    const uploadImage = (e) => {
        setIsUploading(0);
        e.preventDefault();
        const formData = new FormData();
        formData.append("file", imageFile);

        (async () => {
            const data = await fetch(`${backendURL}/media/upload`, {
                method: "POST",
                //HEADER Temporarily disabled. Browser will generate valid one for
                // img.
                // headers: {
                //     'Content-Type': 'multipart/form-data',
                // },
                body: formData,
                credentials: "include",
            });

            if (data.status === 201) {
                setIsUploading(1);

                data.json().then((data) => {
                    const url = `${backendURL}/media/access/${data.mediaid}`;
                    setUploadedImageURL(url);
                });
            } else {
                data.json().then((data) => {
                    console.log("Error With Upload:", data.description);
                });
                setIsUploading(2);
            }
        })();
    };
    const onChooseImage = (e) => {
        setImageFile(e.target.files[0]);
        setPreview(URL.createObjectURL(e.target.files[0])); //set preview
        setIsUploading(-1);
    };
    const wrapperRef = useCallback((wrapper) => {
        if (wrapper == null) return;

        wrapper.innerHTML = "";
        const editor = document.createElement("div");
        wrapper.append(editor);
        const q = new Quill(editor, {
            theme: "snow",
            modules: {
                toolbar: ["bold", "italic", "underline", "strike", "align"],
                cursors: true,
            },
        });

        setCursors(q.getModule("cursors"));
        setQuill(q);
        setQuillLoaded(true);
    }, []);

    function handlePresence(data) {
        const presenceIn = data.presence;
        // const [presences, setPresences] = useState({ list: [] });
        // so add only new incoming presence (diff id.)
        presenceIn.color = tinycolor.random().toHexString();
        setPresences(function (prevState) {
            const index = prevState.findIndex(
                (presence) => presenceIn.id === presence.id
            );
            if (index < 0) {
                return [...prevState, presenceIn];
            }
            const newPresences = [...prevState];
            newPresences[index].cursor.index = presenceIn.index;
            newPresences[index].cursor.length = presenceIn.length;
            return [...newPresences];
        });

        let user = "User";
        if (presenceIn.cursor) {
            user = presenceIn.cursor.name;
        }

        cursors.createCursor(presenceIn.id, user, presenceIn.color);
        cursors.moveCursor(presenceIn.id, presenceIn.cursor);
    }

    // 1st event stream message udpates our quill, then afterwards listens for
    // updates from server
    useEffect(() => {
        if (quill == null) return;
        if (!listening) {
            const events = new EventSource(
                `${backendURL}/doc/connect/${docId}/${connectionId}`,
                { withCredentials: true }
            );
            events.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.content) {
                    console.log(
                        `Connected to docId: ${docId} version: ${data.version}`
                    );
                    quill.setContents(data.content);
                    setVersion(data.version);
                    quill.enable();
                } else if (data.presence) {
                    console.log("Presences Received.");
                    handlePresence(data);
                } else if (data.ack) {
                    console.log("Ack Received & Incrementing Version by 1.");
                    setVersion((prevVersion) => prevVersion + 1);
                } else {
                    setVersion((prevVersion) => prevVersion + 1);

                    console.log(
                        "Content Update from Other Collaborators Received (With Version Update)."
                    );
                    const updatedDelta = data;
                    quill.updateContents(updatedDelta);
                }
            };
            setListening(true);
        }
    }, [listening, quill, presences, cursors, docId, version]);

    //submiting my doc updates
    useEffect(() => {
        if (quill == null) return;
        const textChangeHandler = async (delta, oldDelta, source) => {
            if (source !== "user") return;
            // console.log(delta)
            // socket.emit("send-changes", delta)
            const formatted = {
                op: delta.ops,
                version,
            };
            console.log(formatted.version);

            const rawResponse = await fetch(
                `${backendURL}/doc/op/${docId}/${connectionId}`,
                {
                    method: "POST",
                    headers: {
                        Accept: "application/json",
                        "Content-Type": "application/json",
                    },

                    //check piazza data type...
                    body: JSON.stringify(formatted),
                    credentials: "include",
                }
            );
            rawResponse.json().then((data) => {
                if (data.status === "retry") {
                    console.log("Failed to update to server... Retrying...");
                } else if (data.status === "ok") {
                    console.log("Successfully Submitted OP to server");
                }
            });
        };

        const selectionChangeHandler = async (range, oldRange, source) => {
            // We only need to send updates if the user moves the cursor
            // themselves. Cursor updates as a result of text changes will
            // automatically be handled by the remote client.
            // if (source !== 'user') return;
            // Ignore blurring, so that we can see lots of users in the
            // same window. In real use, you may want to clear the cursor.
            if (!range) return;
            // In this particular instance, we can send extra information
            // on the presence object. This ability will vary depending on
            // type.
            // console.log(range);
            const rawResponse = await fetch(
                `${backendURL}/doc/presence/${docId}/${connectionId}`,
                {
                    method: "POST",
                    headers: {
                        Accept: "application/json",
                        "Content-Type": "application/json",
                    },

                    //check piazza data type...
                    body: JSON.stringify(range),
                    credentials: "include",

                    // [
                    //     [{'retain': 5}, {'insert': 'a'}],
                    //     [{'retain': 4}, {'delete': 10}],
                    //     [{'insert': “Hello”, 'attributes': {'bold': true}}]
                    //     ]
                }
            );
            // console.log(rawResponse.status)
        };
        quill.on("text-change", textChangeHandler);
        quill.on("selection-change", selectionChangeHandler);
        return () => {
            quill.off("text-change", textChangeHandler);
            quill.off("selection-change", selectionChangeHandler);
        };
    }, [quill, version]);

    return (
        <div>
            <p
                style={{
                    marginLeft: 20,
                    fontSize: "20px",
                    color: "darkblue",
                }}
            >
                Document Name:
                <span
                    style={{ fontSize: "24px", color: "blue", marginLeft: 10 }}
                >
                    {docId.split("-")[docId.split("-").length - 1]}
                </span>
            </p>
            <p style={{ marginLeft: 20, fontSize: "16px", color: "navy" }}>
                Version:{" "}
                <span
                    style={{ fontSize: "20px", color: "blue", marginLeft: 10 }}
                >
                    {version}
                </span>
            </p>
            <ul>
                {" "}
                {presences.map((presence) => (
                    <li key={presence.id}> {presence.id}</li>
                ))}
            </ul>
            <div className="container" ref={wrapperRef}></div>

            <form onSubmit={uploadImage}>
                <input type="file" accept="image/*" onChange={onChooseImage} />
                <input type="submit" />
            </form>

            {isUploading === 1 ? (
                <>
                    <p>
                        Image Upload Complete. Drag the image into the desired
                        position above.
                    </p>
                    <img alt={"Img"} src={uploadedImageURL} width="100%"></img>
                </>
            ) : isUploading === 2 ? (
                <p>Error uploading</p>
            ) : isUploading === 0 ? (
                <p>uploading...</p>
            ) : isUploading === -1 ? (
                <p>Upload the image</p>
            ) : isUploading === -2 ? (
                <p>Choose an Image...</p>
            ) : (
                <p>Err.</p>
            )}
        </div>
    );
}
export default TextEditor;
