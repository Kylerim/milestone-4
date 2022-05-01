import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
    endpointDocList,
    endpointCreateDoc,
    endpointDeleteDoc,
    endpointSearch,
    endpointSuggest,
} from "../Common";

function Home() {
    const [docList, setDocList] = useState([]);
    const [docName, setDocName] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [suggestQuery, setSuggestQuery] = useState("");

    const fetchdocList = async () => {
        console.log("Fetching doc list...");
        const response = await fetch(endpointDocList, {
            method: "GET",
            credentials: "include",
        });
        if (response.error) {
            console.log("ERR:", response.message);
        }
        const docListIn = await response.json();
        if (docListIn.length > 0) {
            console.log(docListIn);
        } else {
            console.log("Emtpy Documents List");
        }
        setDocList(docListIn);
    };

    const fetchCreateDoc = async () => {
        // /collection/create', createDoc
        const sendData = { name: docName };
        const response = await fetch(endpointCreateDoc, {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
            },

            body: JSON.stringify(sendData),
            credentials: "include",
        });

        const data = await response.json();
        console.log("[Created Doc Id]: ", data.docid);

        fetchdocList();
        console.log("Updating the list of documents...");
    };

    const fetchDeleteDoc = async (docid) => {
        console.log("fetchDeleteDoc");
        const sendData = { docid: docid };
        const response = await fetch(endpointDeleteDoc, {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify(sendData),
            credentials: "include",
        });
        const data = await response.json();
        console.log("[Deleted Doc]: ", data);
        fetchdocList();

        console.log("Updating the list of documents: ", docList);
    };

    const handleSearchRequest = async () => {
        console.log("handleSearchRequest");
        const response = await fetch(endpointSearch + `?q=${searchQuery}`, {
            method: "GET",
            headers: {
                Accept: "application/json",
            },
            credentials: "include",
        });
        const data = await response.json();
        console.log("HandleSearchRequest for: ", searchQuery, data);
    };

    const handleSuggestRequest = async () => {
        console.log("handleSuggestRequest");
        const response = await fetch(endpointSuggest + `?q=${suggestQuery}`, {
            method: "GET",
            headers: {
                Accept: "application/json",
            },
            credentials: "include",
        });
        const data = await response.json();
        console.log("HandleSuggestRequest for: ", suggestQuery, data);
    };

    useEffect(() => {
        fetchdocList();
    }, []);

    return (
        <div>
            <p>User Home Page</p>
            <br />
            {/* <input>Input Field</input> */}
            <input
                onChange={(e) => {
                    setSearchQuery(e.target.value);
                }}
                required
            />
            <button
                onClick={() => {
                    handleSearchRequest();
                }}
            >
                Search
            </button>

            <br></br>

            <input
                onChange={(e) => {
                    setSuggestQuery(e.target.value);
                }}
                required
            />
            <button
                onClick={() => {
                    handleSuggestRequest();
                }}
            >
                Suggest (Autocomplete)
            </button>

            <br></br>
            <br></br>
            <br></br>
            <br></br>

            <input
                onChange={(e) => {
                    setDocName(e.target.value);
                }}
                required
            />
            <button
                onClick={() => {
                    fetchCreateDoc();
                }}
            >
                Create New Document
            </button>
            <ul>
                {docList.map((doc) => (
                    <li key={doc.id}>
                        <Link to={`/doc/edit/${doc.id}`}>
                            {doc.name} | {doc.id}
                        </Link>
                        <button
                            style={{ marginLeft: 20 }}
                            onClick={() => {
                                fetchDeleteDoc(doc.id);
                            }}
                        >
                            {" "}
                            Delete
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default Home;
