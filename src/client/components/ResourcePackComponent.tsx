import {ResourcePack} from "@c/utils/Utils";
import React from "react";

export function ResourcePackComponent({packs, pack, save, isDefault}: {
    packs: ResourcePack[],
    pack: ResourcePack,
    save: () => void,
    isDefault?: boolean
}) {
    return <div className="resource-pack align-center">
        <div className="flex align-center">
            <div className="up-down">
                <div className="up" hidden={isDefault} onClick={() => {
                    if (isDefault) return;
                    const index = packs.indexOf(pack);
                    if (index > 0) {
                        packs.splice(index, 1);
                        packs.splice(index - 1, 0, pack);
                        save();
                    }
                }}></div>
                <div className="down" hidden={isDefault} onClick={() => {
                    if (isDefault) return;
                    const index = packs.indexOf(pack);
                    if (index < packs.length - 1) {
                        packs.splice(index, 1);
                        packs.splice(index + 1, 0, pack);
                        save();
                    }
                }}></div>
            </div>
            <div>
                <div className="pack-name">{pack.name}</div>
                <div className="pack-description">{pack.description}</div>
            </div>
        </div>
        <div className="pack-toggle"><input type="checkbox" hidden={isDefault} checked={pack.enabled} onChange={e => {
            if (isDefault) return;
            pack.enabled = e.target.checked;
            save();
        }}/></div>
    </div>
}