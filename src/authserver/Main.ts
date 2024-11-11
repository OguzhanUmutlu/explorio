import express from "express";
import {StatusCodes} from "http-status-codes";
import TestDB from "./database/TestDB";

const app = express();

// Auth Protocol
// Client -> AuthServer      : Create secret key using the requested server ip and the secret account token. (Expires in a minute)
// AuthServer -> Client      : return secretKey
// Client -> SomeServer      : Log in with the key
// SomeServer -> AuthServer  : Validate and disband the key
// AuthServer -> SomeServer  : return true/false
// SomeServer                : Let the player join

const Characters = Array.from("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789");

type OneTimeKey = {
    token: string;
    ip: string;
};

function createSecretKey() {
    return Array.from(crypto.getRandomValues(new Uint8Array(512)))
        .map(i => Characters[i % Characters.length])
        .join("");
}

const expireMinutes = 1;
const cooldownSeconds = 1;
const oneTimeKeys: Record<string, OneTimeKey> = {};
const userCooldowns: Record<string, number> = {};
const db = new TestDB();

await db.init();

app.get("/login", async (req, res) => {
    const user = await db.getUserByCredentials(
        req.query.name,
        req.query.password
    );

    if (!user) {
        res.sendStatus(StatusCodes.UNAUTHORIZED);
        return;
    }

    res.status(StatusCodes.ACCEPTED).send(user.token);
});

app.get("/generate/:token", async (req, res) => {
    const user = await db.getUserByToken(req.params.token);

    if (!user) {
        res.sendStatus(StatusCodes.UNAUTHORIZED);
        return;
    }

    if (userCooldowns[user.name] > Date.now()) {
        res.sendStatus(StatusCodes.TOO_MANY_REQUESTS);
        return;
    }

    const ip = req.query.ip;

    if (ip === "::1") {
        if (req.ip !== ip) {
            // localhost should only work in the source machine
            res.sendStatus(StatusCodes.FORBIDDEN);
            return;
        }
    } else if (!/^([0-9]{1,3}\.){3}[0-9]{1,3}$/.test(ip)) {
        res.sendStatus(StatusCodes.BAD_REQUEST);
        return;
    }

    const key = createSecretKey();

    oneTimeKeys[key] = {
        token: user.token, ip
    };
    userCooldowns[user.name] = Date.now() + cooldownSeconds * 1000;
    setTimeout(() => delete oneTimeKeys[key], expireMinutes * 60 * 1000);

    res.status(StatusCodes.ACCEPTED).send(key);
});

app.get("/validate/:key", (req, res) => {
    const key = oneTimeKeys[req.params.key];

    if (!key) {
        res.sendStatus(StatusCodes.NOT_ACCEPTABLE);
        return;
    }

    if (key.ip !== req.ip) {
        res.sendStatus(StatusCodes.FORBIDDEN);
        return;
    }

    delete oneTimeKeys[req.params.key];

    res.sendStatus(StatusCodes.ACCEPTED);
});

app.listen(80);