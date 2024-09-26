export function getUTCDate() {
    return Date.now() + new Date().getTimezoneOffset() * 60 * 1000;
}

onmessage = async e => {
    onmessage = () => void 0;
    const [urls, PING] = e.data;
    for (const url of urls) {
        await new Promise(r => {
            const ws = new WebSocket(url);
            let works = false;
            ws.onmessage = event => {
                try {
                    const json = JSON.parse(event.data);
                    if (json[0] === PING) {
                        const got = json[1];
                        const now = getUTCDate();
                        ws.send(JSON.stringify([PING, now]));
                        postMessage({event: "ping", ms: (now - got) / 2});
                        return;
                    }
                } catch (e) {
                }
                postMessage({event: "message", message: event.data});
            };
            ws.onopen = () => {
                works = true;
                onmessage = e => {
                    ws.send(e.data);
                };
                postMessage({event: "connect", url});
            };
            ws.onclose = () => {
                if (!works) r(); // keep checking
                else {
                    postMessage({event: "disconnect"});
                }
            };
        });
    }
    postMessage({event: "fail"});
};