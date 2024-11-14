export function getUTCDate() {
    return Date.now() + new Date().getTimezoneOffset() * 60 * 1000;
}

onmessage = async e => {
    onmessage = () => void 0;
    const urls = e.data;
    for (const url of urls) {
        await new Promise(r => {
            let works = false;

            function makeWS() {
                const ws = new WebSocket(url);
                ws.onmessage = event => {
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
                    if (!works) r(null); // keep checking
                    else {
                        postMessage({event: "disconnect"});
                        setTimeout(makeWS, 1000);
                        ws.close();
                    }
                };
            }

            makeWS();
        });
    }
    postMessage({event: "fail"});
};