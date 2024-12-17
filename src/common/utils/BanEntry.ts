export default class BanEntry {
    constructor(public name: string, public ip: string | null, public timestamp: number, public reason: string) {
    };
}