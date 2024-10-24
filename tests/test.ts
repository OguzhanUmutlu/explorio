import {splitParameters} from "../src/common/command/CommandProcessor";

console.log(splitParameters("@a{x=10 y=20} 236 'hello, world!' {x=y z=true t=10 p=50}"));