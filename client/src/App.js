import './App.css';
import { useState } from 'react'
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Link,
  Redirect
} from "react-router-dom";
import { v4 as uuidV4 } from "uuid"

import Home from "./home/Home"
import Signup from "./authentication/Signup"
import Login from "./authentication/Login"
import TextEditor from "./document/TextEditor"
import Navbar from './nav/Navbar';


function App() {
  const [isAuth, setAuth] = useState(false);

  if (!isAuth) {
    return (
      <Router>
        <Switch>
          <Route exact path="/signup" component={Signup}>
          </Route>
          <Route path="/">
            <Login setAuth={setAuth} isAuth={isAuth} />
          </Route>
        </Switch>
      </Router>
    )
  }

  return (
    <Router>
      <Navbar setAuth={setAuth} />
      <Switch>
        <Route path="/home" exact component={Home}>
        </Route>
        <Route path="/signup" exact component={Signup}>
        </Route>
        <Route path="/doc/edit/:docId" component={TextEditor}>
        </Route>
      </Switch>
    </Router>

  );
}

export default App;
