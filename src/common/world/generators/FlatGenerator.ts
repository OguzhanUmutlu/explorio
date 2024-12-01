import CustomGenerator from "@/world/generators/CustomGenerator";

export default class FlatGenerator extends CustomGenerator {
    constructor() {
        super("bedrock;3*dirt;grass_block");
    };
}