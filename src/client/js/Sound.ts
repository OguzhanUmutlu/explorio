const SoundVolumes: Record<string, number> = {};

export class Sound {
    static ctx = new AudioContext;
    static canCreateContext = false;

    static sounds: Record<string, Sound> = {};
    static ambients: Record<string, SoundContext> = {};
    buffer: AudioBuffer | null = null;

    constructor(public _promise: Promise<AudioBuffer>, public actualSrc: string) {
        _promise.then(buffer => this.buffer = buffer);
    };

    get loaded() {
        return !!this.buffer;
    };

    static get(src: string) {
        if (Sound.sounds[src]) return Sound.sounds[src];
        const startMs = performance.now();
        if (!src) throw new Error("Invalid sound src.");
        let resolve: (buffer: AudioBuffer) => void = r => r;
        const prom: Promise<AudioBuffer> = new Promise(r => resolve = r);
        (async () => {
            const blob = await fetch(src).then(async response => {
                console.log("%cLoaded " + src + " in " + Math.floor(performance.now() - startMs) + "ms.", "color: #00ff00");
                return response.blob();
            }).catch(() => {
                console.log("%cFailed to load " + src, "color: #ff0000");
                return null;
            });
            if (blob === null) {
                return;
            }
            const reader = new FileReader();
            reader.readAsArrayBuffer(blob);
            const audioContext = new AudioContext();
            resolve(await new Promise(k => reader.onload = () => {
                const data = reader.result;
                if (data instanceof ArrayBuffer) audioContext.decodeAudioData(data, a => k(a));
            }));
        })();
        return Sound.sounds[src] = new Sound(prom, src);
    };

    static play(src: string, volume = 1) {
        if (!this.canCreateContext) return console.warn("Audio context creation failed.");
        this.get(src).play(volume);
    };

    static async loadAmbientAsync(src: string, volume = 1) {
        if (!this.canCreateContext) return console.warn("Audio context creation failed.");
        if (this.ambients[src]) return this.ambients[src].gain.gain.value = volume;
        const sound = Sound.get(src);
        await sound.wait();
        const ctx = await sound.playAsync(volume, false);
        this.ambients[src] = ctx;
        ctx.loop = true;
    };

    static async playAmbientAsync(src: string, volume = 1) {
        if (!this.canCreateContext) return console.warn("Audio context creation failed.");
        await Sound.stopAmbientAsync(src, volume);
        await this.loadAmbientAsync(src, volume);
        this.ambients[src].start();
    };

    static async stopAmbientAsync(src: string, volume = 1) {
        if (!this.canCreateContext) return console.warn("Audio context creation failed.");
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
        if (!Sound.canCreateContext) return new Promise(() => console.warn("Audio context creation failed."));
        if (!this.loaded) await this.wait();
        let extraVol = 1;
        if (this.actualSrc.startsWith("assets/sounds/"))
            extraVol = SoundVolumes[this.actualSrc.substring("assets/sounds/".length).replaceAll(/^\d$/g, "")] ?? 1;
        return await new Promise(async r => {
            const source = new AudioBufferSourceNode(Sound.ctx, {buffer: this.buffer});
            const gainNode = new GainNode(Sound.ctx, {gain: volume * extraVol});
            source.connect(gainNode);
            gainNode.connect(Sound.ctx.destination);
            if (play) source.start();
            r(new SoundContext(source, gainNode));
        });
    };

    play(volume = 1, cb = () => void 0) {
        this.playAsync(volume).then(cb);
    };

    async wait() {
        await this._promise;
    };
}

class SoundContext {
    static instances = new Set;
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

addEventListener("mousedown", async () => {
    Sound.canCreateContext = true;
    await Sound.ctx.resume();
});