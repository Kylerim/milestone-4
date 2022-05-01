import { useState, useEffect, useCallback } from 'react'
import { Link } from "react-router-dom";
import { endpointLogIn } from '../Common'


async function loginUser(credentials) {
  return fetch(endpointLogIn, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'include',
    body: JSON.stringify(credentials)
  })
    .then(data => data.json())
}

async function loginUserWithSession() {
  return fetch(endpointLogIn, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: ""
  })
    .then(data => data.json())
}

function Login({ setAuth, isAuth }) {
  const [email, setEmail] = useState();
  const [password, setPassword] = useState();

  const handleSubmit = async e => {
    e.preventDefault();
    const response = await loginUser({
      email,
      password
    });
    console.log(response.status);
    setAuth(response.status == 'ok');
  }

  const checkSession = async () => {
    const response = await loginUserWithSession();
    console.log(response);
    if (response.status == 'ok') { setAuth(response.status == 'ok'); }
  }

  useEffect(() => {
    checkSession();
  }, [])

  return (
    <div>
      <p>Login Page</p>
      <form onSubmit={handleSubmit}>
        <label>
          <p>Email</p>
          <input type="text" onChange={e => setEmail(e.target.value)} />
        </label>
        <label>
          <p>Password</p>
          <input type="password" onChange={e => setPassword(e.target.value)} />
        </label>
        <div>
          <button type="submit">Log In</button>
        </div>
        <Link to="/signup">Don't you have an account? Sign Up here</Link>
      </form>
    </div>

  );
}

export default Login;
