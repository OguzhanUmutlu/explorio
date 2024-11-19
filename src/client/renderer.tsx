import {createRoot} from "react-dom/client";
import React, {StrictMode} from "react";
import {Main} from "./Main";
import {initClientThings} from "./js/utils/Utils";

await initClientThings();

const root = createRoot(document.getElementById("root")!);

root.render(
    <StrictMode>
        <Main/>
    </StrictMode>
);