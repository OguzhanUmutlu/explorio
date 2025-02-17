import Main from "./Main";
import {initClientThings} from "./js/utils/Utils";
import {createRoot} from "react-dom/client";
import React, {StrictMode} from "react";

await initClientThings();

const root = createRoot(document.getElementById("root")!);

root.render(
    <StrictMode>
        <Main/>
    </StrictMode>
);