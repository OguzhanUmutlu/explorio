export type User = {
    name: string;
    password: string;
    token: string;
};

export abstract class Database {
    abstract async getUserByToken(token: string): Promise<User | null>;
    abstract async getUserByCredentials(name: string, password: string): Promise<User | null>;
    abstract async init(): Promise<void>;
}