export class CommandError extends Error {
    constructor(public message: string) {
        super(message);
    };
}