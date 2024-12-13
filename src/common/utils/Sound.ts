import {simplifyTexturePath} from "@/utils/Utils";

let ctx: AudioContext = null;
let canCreateContext = false;

function tryCreateAudioContext() {
    if (ctx) return true;
    if (!canCreateContext) return false;
    ctx = new AudioContext();
    canCreateContext = false;
    ctx.resume().then(r => r);
    return true;
}

export default class Sound {
    static sounds: Record<string, Sound> = {};
    static ambients: Record<string, SoundContext> = {};
    buffer: AudioBuffer | null = null;
    timestamps: number[] = [];

    constructor(public _promise: Promise<AudioBuffer>, public actualSrc: string) {
        _promise.then(buffer => this.buffer = buffer);
    };

    get loaded() {
        return !!this.buffer;
    };

    static get(src: string) {
        if (!src) return;
        src = simplifyTexturePath(src);
        if (Sound.sounds[src]) return Sound.sounds[src];
        const startMs = Date.now();
        if (!src) throw new Error("Invalid sound src.");

        const prom = <Promise<AudioBuffer>>(async function () {
            const blob = await fetch(src).then(async response => {
                printer.debug("%cLoaded " + src + " in " + Math.floor(Date.now() - startMs) + "ms.", "color: #00ff00");
                return response.blob();
            }).catch(() => {
                printer.fail("%cFailed to load " + src, "color: #ff0000");
                return null;
            });

            if (blob === null) {
                return;
            }

            if (!blob.type.startsWith("audio/")) {
                throw new Error(`Invalid sound src: ${src}`);
            }

            const reader = new FileReader();
            reader.readAsArrayBuffer(blob);
            const audioContext = new AudioContext();

            return await new Promise(k => reader.onload = () => {
                const data = reader.result;
                if (data instanceof ArrayBuffer) {
                    audioContext.decodeAudioData(data, a => k(a));
                }
                audioContext.close();
            });
        })();

        return Sound.sounds[src] = new Sound(prom, src);
    };

    static play(src: string, volume = 1) {
        if (!tryCreateAudioContext()) return;
        const sound = this.get(src);
        if (!sound) return;
        sound.play(volume);
    };

    static async loadAmbientAsync(src: string, volume = 1) {
        if (!tryCreateAudioContext()) return;

        if (this.ambients[src]) return this.ambients[src].gain.gain.value = volume;
        const sound = Sound.get(src);
        if (!sound) return;
        await sound.wait();
        const sCtx = await sound.playAsync(volume, false);
        this.ambients[src] = sCtx;
        sCtx.loop = true;
    };

    static async playAmbientAsync(src: string, volume = 1) {
        if (!tryCreateAudioContext()) return;

        await Sound.stopAmbientAsync(src, volume);
        await this.loadAmbientAsync(src, volume);
        this.ambients[src].start();
    };

    static async stopAmbientAsync(src: string, volume = 1) {
        if (!tryCreateAudioContext()) return;

        await this.loadAmbientAsync(src, volume);
        if (this.ambients[src]) this.ambients[src].stop();
        delete this.ambients[src];
    };

    static playAmbient(src: string, volume = 1, cb = () => void 0) {
        Sound.playAmbientAsync(src, volume).then(cb);
    };

    static stopAmbient(src: string, volume = 1, cb = () => void 0) {
        Sound.stopAmbientAsync(src, volume).then(cb);
    };

    async playAsync(volume = 1, play = true): Promise<SoundContext> {
        if (!tryCreateAudioContext()) return;

        if (!this.loaded) await this.wait();
        const extraVol = 1;

        if (!ctx) return new SoundContext(null, null);
        const source = new AudioBufferSourceNode(ctx, {buffer: this.buffer});
        const gainNode = new GainNode(ctx, {gain: volume * extraVol});
        source.connect(gainNode);
        gainNode.connect(ctx.destination);

        const sCtx = new SoundContext(source, gainNode);
        if (play) sCtx.start();

        return sCtx;
    };

    play(volume = 1, cb = () => void 0) {
        volume = Math.min(5, volume);
        const now = Date.now();
        this.timestamps.push(now);
        this.timestamps = this.timestamps.filter(i => i > now - 1000);
        if (this.timestamps.length > 5) return; // limit to 5 plays per second
        this.playAsync(volume).then(cb);
    };

    async wait() {
        await this._promise;
    };
}

class SoundContext {
    static instances = new Set<SoundContext>();
    started = false;
    _ended: boolean;

    constructor(public source: AudioBufferSourceNode, public gain: GainNode) {
        SoundContext.instances.add(this);
        this._ended = false;
        source.onended = () => {
            this._ended = true;
            SoundContext.instances.delete(this);
        };
    };

    get loop() {
        return this.source.loop;
    };

    set loop(v) {
        this.source.loop = v;
    };

    get speed() {
        return this.source.playbackRate.value;
    };

    set speed(v: number) {
        this.source.playbackRate.value = v;
    };

    get ended() {
        return this._ended;
    };

    start() {
        if (this.started) return;
        this.source.start();
        this.started = true;
        if (this._ended) {
            this._ended = false;
            SoundContext.instances.add(this);
        }
    };

    stop() {
        if (!this.started) return;
        this.source.stop();
        this.started = false;
        if (!this._ended) {
            this._ended = true;
            SoundContext.instances.delete(this);
        }
    };
}

if (typeof addEventListener !== "undefined") addEventListener("mousedown", async () => {
    canCreateContext = true;
    tryCreateAudioContext();
});