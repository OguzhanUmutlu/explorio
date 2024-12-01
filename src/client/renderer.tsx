import {Main} from "@dom/Main";
import {initClientThings} from "@c/utils/Utils";
import {createRoot} from "react-dom/client";
import React, {StrictMode} from "react";

await initClientThings();

const root = createRoot(document.getElementById("root")!);

root.render(
    <StrictMode>
        <Main/>
    </StrictMode>
);