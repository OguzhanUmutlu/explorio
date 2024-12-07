export enum Versions {
    v1_0_0$Alpha,
    v1_0_1$Alpha,
    v1_0_2$Alpha,

    __MAX__
}

export const Version = Versions.__MAX__ - 1;
export const VersionString = Object.keys(Versions)
    .find(i => i[0] !== "_" && Versions[i] === Version)
    .replaceAll("_", ".")
    .replaceAll("$", " ")
    .substring(1);