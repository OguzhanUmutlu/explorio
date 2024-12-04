const {app, BrowserWindow} = require("electron");

app.commandLine.appendSwitch("disable-frame-rate-limit"); // good luck with 10000 fps

app.on("ready", async () => {
    const browser = new BrowserWindow({autoHideMenuBar: true});
    browser.setMenu(null);
    await browser.loadFile("./dist/index.html");
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});