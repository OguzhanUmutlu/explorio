export type User = {
    name: string;
    password: string;
    token: string;
};

export abstract class Database {
    abstract getUserByToken(token: string): Promise<User | null>;
    abstract getUserByCredentials(name: string, password: string): Promise<User | null>;
    abstract init(): Promise<void>;
}