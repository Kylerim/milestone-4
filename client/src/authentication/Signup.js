import { useState, useEffect, useCallback } from 'react'
import { useHistory } from "react-router-dom";
import { endpointSignUp } from '../Common'

async function createUser(credentials) {
    return fetch(endpointSignUp, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials),
        credentials: 'include',

    })
        .then(data => data.json())
}

function Signup() {
    const history = useHistory();
    const [name, setUserName] = useState();
    const [password, setPassword] = useState();
    const [email, setEmail] = useState();
    const [message, setMessage] = useState('');

    const handleSubmit = async e => {
        e.preventDefault();
        const result = await createUser({
            name,
            email,
            password
        });
        console.log(result);
        // console.log(result.message)
        if (result.status == 'error') {
            setMessage(result.message);
        } else {
            alert(result.message);
            history.goBack();
        }
    }

    return (
        <div>
            <p>Signup Page</p>
            <form onSubmit={handleSubmit}>
                <label>
                    <p>Username</p>
                    <input type="text" onChange={e => setUserName(e.target.value)} />
                </label>
                <label>
                    <p>Email</p>
                    <input type="text" onChange={e => setEmail(e.target.value)} />
                </label>
                <label>
                    <p>Password</p>
                    <input type="password" onChange={e => setPassword(e.target.value)} />
                </label>
                <div>
                    <button type="submit">Sign Up</button>
                </div>
            </form>
            {message}
        </div>

    );
}

export default Signup;
