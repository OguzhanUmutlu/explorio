import {ReactNode} from "react";
import {OptionsType, ReactState} from "@c/utils/Utils";
import {OptionPages} from "@dom/components/options/Menus";

export abstract class GameOption {
    protected constructor(public key: keyof OptionsType, public name: string, public description: string) {
    };

    abstract toReact(pg: ReactState<OptionPages>): ReactNode;
}