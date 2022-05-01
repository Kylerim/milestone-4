import { useState, useEffect, useCallback } from 'react'
import { endpointLogOut } from '../Common'
import { Redirect } from "react-router-dom";

async function logoutUser() {
  return fetch(endpointLogOut, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'include',
  })
    .then(data => data.json())
}

function Logout({ setAuth }) {
  const logoutHandler = async () => {
    const response = await logoutUser();
    setAuth(false);
    console.log(response)
  }
  return (
    <button onClick={() => { logoutHandler() }}>log out</button>
  )
}

export default Logout;
