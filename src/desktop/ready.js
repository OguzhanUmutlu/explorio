const fs = require("fs");
const fss = require("fs-extra");

if (fs.existsSync(__dirname + "/../../dist/desktop")) fss.removeSync(__dirname + "/../../dist/desktop");
if (fs.existsSync(__dirname + "/dist")) fss.removeSync(__dirname + "/dist");
if (!fs.existsSync(__dirname + "/../../dist")) fs.mkdirSync(__dirname + "/../../dist");
fs.mkdirSync(__dirname + "/dist");
fss.copySync(__dirname + "/../../dist", __dirname + "/dist", {overwrite: true});
if (!fs.existsSync(__dirname + "/../../dist/desktop")) fs.mkdirSync(__dirname + "/../../dist/desktop");