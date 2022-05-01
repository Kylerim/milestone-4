import {
    Link,
} from "react-router-dom";

import Logout from "../authentication/Logout"
function Navbar({ setAuth }) {
    return (
        <nav>
            <ul>

                <li>
                    <Logout setAuth={setAuth} />
                </li>
                <li>
                    <Link to="/home">Home</Link>
                </li>

            </ul>
        </nav>

    );
}

export default Navbar;
