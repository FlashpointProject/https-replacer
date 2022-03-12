const flashpoint = require("flashpoint-launcher");
const fs = require("fs");
const path = require("path");

const NAME = "HTTPS Replacer"
const CURATIONS = "./Curations/Working/";
const TASK_COUNT = 20;
const HTTPS = /https:\/\//g
const HTTP = "http://"

const REPLACE = (a, b) => `Attempt to replace HTTPS links in ${a} files in Curation "${b}"?`;
const REPLACE_SUCCESS = (a, b) => `Replaced ${a} occurrences in ${b} files.`;

// Get configuration value
function config(k) {
    return flashpoint.getExtConfigValue(k);
}

// Scan files in folder
async function scan(folder, list, regex) {
    for (const file of await fs.promises.readdir(folder, { withFileTypes: true })) {
        filename = path.join(folder, file.name);
        if (file.isDirectory()) {
            scan(filename, list, regex);
        } else if (file.isFile() && regex.test(file.name)) {
            list.push(filename);
        }
    }
    return list;
}

function activate(context) {
    // Shortcut method to quickly register commands.
    function registerCmd(n, f) {
        flashpoint.registerDisposable(
            context.subscriptions,
            flashpoint.commands.registerCommand(n, f)
        );
    }

    // Load site definitions

    // Simple HTTPS to HTTP replacer.
    registerCmd("curator-tools.replace", async curation => {
        // TODO: In the future, curations will be in different folders? Make CURATIONS non-constant

        // Count files to replace in
        const files = await scan(CURATIONS + curation.folder + "/content", [], RegExp(config("com.curator-tools.replacer.regex")));

        // Prompt the user, asking if they want to perform the replace on <n> files
        const v = await flashpoint.dialogs.showMessageBox({
            title: NAME,
            message: REPLACE(files.length, curation.game.title),
            buttons: ["Yes", "No"]
        });

        if (v == 0) {
            // Replacement count
            let replaced = 0;

            // Asyncroniously replace content in files
            for (const file of files) {
                try {
                    // Read data in file first
                    const content = String(await fs.promises.readFile(file));
                    // Replace all HTTPS, while incrementing the counter
                    await fs.promises.writeFile(file,
                        content.replace(HTTPS, () => { replaced++; return HTTP; })
                    );
                } catch (err) {
                    flashpoint.log.error(`Could not replace in file "${file}"; ${err}`);
                }
            }

            // Display success message box
            flashpoint.dialogs.showMessageBox({
                title: NAME,
                message: REPLACE_SUCCESS(replaced, files.length)
            });
        }
    });
}

exports.activate = activate;