import {Database} from "./Database";

const root = {name: "Steve", password: "", token: ""};

export default class TestDB extends Database {
    async init() {
    };

    async getUserByToken(token) {
        if (token !== root.token) return null;

        return root;
    };

    async getUserByCredentials(name, password) {
        if (name !== root.name || password !== root.password) return null;

        return root;
    };
}