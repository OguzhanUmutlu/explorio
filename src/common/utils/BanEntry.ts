export default class BanEntry {
    constructor(public name: string, public ip: string | null, public timestamp: number, public reason: string) {
    };

    toJSON() {
        return {
            name: this.name,
            ip: this.ip,
            timestamp: this.timestamp,
            reason: this.reason
        };
    };
}