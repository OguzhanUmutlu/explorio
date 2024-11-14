import {createRoot} from "react-dom/client";
import React, {StrictMode} from "react";
import {Main} from "./Main";

const root = createRoot(document.getElementById("root")!);

root.render(
    <StrictMode>
        <Main/>
    </StrictMode>,
);