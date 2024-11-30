export default class CommandError extends Error {
    constructor(public message: string) {
        super(message);
    };
}