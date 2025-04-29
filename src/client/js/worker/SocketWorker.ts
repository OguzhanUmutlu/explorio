export function getUTCDate() {
    return Date.now() + new Date().getTimezoneOffset() * 60 * 1000;
}

onmessage = async ({data: {urls, auth}}) => {
    onmessage = () => void 0;
    for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        await new Promise(r => {
            let works = false;

            async function makeWS() {
                const ws = new WebSocket(url);
                const hostname = new URL(url).hostname;
                let ip = hostname;
                if (auth && !/^([0-9]{1,3}\.){3}[0-9]{1,3}$/.test(hostname)) {
                    const response = await fetch(`https://cloudflare-dns.com/dns-query?name=${hostname}&type=A`, {
                        headers: {"Accept": "application/dns-json"}
                    });

                    const json = await response.json();
                    ip = json.Answer[0].data;
                }

                ws.onmessage = event => {
                    postMessage({event: "message", message: event.data});
                };

                ws.onopen = () => {
                    works = true;
                    onmessage = e => {
                        ws.send(e.data);
                    };

                    postMessage({event: "connect", url, ip});
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