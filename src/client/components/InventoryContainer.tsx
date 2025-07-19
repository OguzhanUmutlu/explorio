import {Containers} from "@/meta/Inventories";
import Texture from "@/utils/Texture";
import {ReactState} from "@c/utils/Utils";
import React, {ReactNode} from "react";

export default function InventoryContainer(O: {
    src: string,
    containerId: Containers,
    containerState: ReactState<Containers>,
    className?: string,
    children: ReactNode
}) {
    return <div className={O.className} ref={async el => {
        if (!el) return
        const img = Texture.get(O.src);
        await img.wait();
        const bb = img.getOpaqueBoundaries();
        const width = bb.right - bb.left;
        const height = bb.bottom - bb.top;
        el.style.backgroundSize = `calc(${100 * img.width / width}%) calc(${100 * img.height / height}%)`;
    }} style={O.containerState[0] === O.containerId ? {scale: "1"} : {}}>{O.children}</div>;
}