import CustomGenerator from "@/world/generators/CustomGenerator";

export default class FlowerLandGenerator extends CustomGenerator {
    constructor() {
        super("bedrock;3*dirt;grass_block;,,,,,,,,,,,allium,blue_orchid,dandelion,houstonia,orange_tulip,oxeye_daisy,peonia,pink_tulip,red_tulip,rose,white_tulip,:tree,:tree,:tree");
    };
}