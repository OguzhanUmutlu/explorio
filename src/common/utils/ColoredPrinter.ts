import Printer from "fancy-printer";

export function getColoredPrinter() {
    const printer = Printer.brackets.create();

    printer.options.allowSubstitutions = true;
    printer.removeAllSubstitutions();
    const colors = {
        0: "000000",
        1: "0000AA",
        2: "00AA00",
        3: "00AAAA",
        4: "AA0000",
        5: "AA00AA",
        6: "FFAA00",
        7: "AAAAAA",
        8: "555555",
        9: "5555FF",
        a: "55FF55",
        b: "55FFFF",
        c: "FF5555",
        d: "FF55FF",
        e: "FFFF55",
        f: "FFFFFF"
    };

    for (const k in colors) printer.addStyle("§" + k, `color: #${colors[k]}`);
    for (const k in colors) printer.addStyle("§§" + k, `background-color: #${colors[k]}`);

    printer.addStyle("§l", "font-weight: bold");
    printer.addStyle("§u", "text-decoration: underline");
    printer.addStyle("§s", "text-decoration: strike-through");
    printer.addStyle("§i", "font-style: italic");
    printer.addStyle("§k", "font-style: oblique");
    printer.addStyle("§r", "color: white; background-color: none; font-weight: normal; font-style: normal");
    printer.addStyle("&t", p => "color: " + p.options.currentTag.textColor);

    printer.info("test§ctest")

    return printer;
}