#!/usr/bin/env node
import { cliVersion, pkg } from "../constants/urls";
import { info, logger, spinner } from "../core/helpers/logger";
import { CacheEntry } from "../core/types/cache";
import { twCreate } from "../create/command";
import { deploy } from "../deploy";
import { generate } from "../generate/command";
import { findPackageInstallation } from "../helpers/detect-local-packages";
import { install } from "../install/command";
import chalk from "chalk";
import { exec, spawn } from "child_process";
import { Command } from "commander";
import open from "open";
import prompts from "prompts";
import Cache from "sync-disk-cache";

const main = async () => {
    // eslint-disable-next-line turbo/no-undeclared-env-vars
    const skipIntro = process.env.BICONOMY_CLI_SKIP_INTRO === "true";
  
    const program = new Command();
    const cache = new Cache("biconomy:cli");
  
    // yes this has to look like this, eliminates whitespace
    if (!skipIntro) {
      console.info(`BICONOMY ASCII ART HERE`);
      console.info(`\n Welcome to Biconomy CLI!`);
    }
  
    program
      .name("biconomy-cli")
      .description("Official biconomy command line interface")
      .version(cliVersion, "-v, --version")
      .option("--skip-update-check", "Skip check for auto updates")
      .hook("preAction", async () => {
        if (skipIntro || program.opts().skipUpdateCheck) {
          return;
        }
  
        let shouldCheckVersion = true;
        try {
          const lastCheckCache: CacheEntry = cache.get("last-version-check");
  
          if (lastCheckCache.isCached) {
            const lastVersionCheck = new Date(lastCheckCache.value);
            // Don't check for updates if already checked within past 24 hours
            if (Date.now() - lastVersionCheck.getTime() < 1000 * 60 * 60 * 24) {
              shouldCheckVersion = false;
            }
          }
        } catch {
          // no-op
        }
  
        if (!shouldCheckVersion) {
          return;
        }
  
        const versionSpinner = spinner("Checking for updates...");
        await import("update-notifier").then(
          async ({ default: updateNotifier }) => {
            const notifier = updateNotifier({
              pkg,
              shouldNotifyInNpmScript: true,
              // check every time while we're still building the CLI
              updateCheckInterval: 0,
            });
  
            const versionInfo = await notifier.fetchInfo();
            versionSpinner.stop();
  
            try {
              // Set cache to prevent checking for updates again for 24 hours
              cache.set("last-version-check", new Date().toISOString());
            } catch {
              // no-op
            }
  
            if (versionInfo.type !== "latest") {
              const res = await prompts({
                type: "toggle",
                name: "upgrade",
                message: `A new version of the CLI is available. Would you like to upgrade?`,
                initial: true,
                active: "yes",
                inactive: "no",
              });
  
              if (res.upgrade) {
                const updateSpinner = spinner(
                  `Upgrading CLI to version ${versionInfo.latest}...`,
                );
  
                const clonedEnvironment = { ...process.env };
                clonedEnvironment.BICONOMY_CLI_SKIP_INTRO = "true";
  
                const installation = await findPackageInstallation();
  
                // If the package isn't installed anywhere, just defer to npx biconomy@latest
                if (!installation) {
                  updateSpinner.succeed(
                    `Now using CLI version ${versionInfo.latest}. Continuing execution...`,
                  );
  
                  await new Promise((resolve, reject) => {
                    const shell = spawn(
                      `npx --yes biconomy@latest ${process.argv
                        .slice(2)
                        .join(" ")}`,
                      [],
                      { stdio: "inherit", shell: true, env: clonedEnvironment },
                    );
                    shell.on("close", (code) => {
                      if (code === 0) {
                        resolve("");
                      } else {
                        reject();
                      }
                    });
                  });
  
                  return process.exit(0);
                }
  
                // Otherwise, get the correct command based on package manager and local vs. global
                let command = "";
                switch (installation.packageManager) {
                  case "npm":
                    command = installation.isGlobal
                      ? `npm install -g biconomy`
                      : `npm install biconomy`;
                    break;
                  case "yarn":
                    command = installation.isGlobal
                      ? `yarn global add biconomy`
                      : `yarn add biconomy`;
                    break;
                  case "pnpm":
                    command = installation.isGlobal
                      ? `pnpm add -g biconomy@latest`
                      : `pnpm add biconomy@latest`;
                    break;
                  default:
                    console.error(
                      `Could not detect package manager in use, aborting automatic upgrade.\nIf you want to upgrade the CLI, please do it manually with your package manager.`,
                    );
                    process.exit(1);
                }
  
                await new Promise((resolve, reject) => {
                  exec(command, (err, stdout, stderr) => {
                    if (err) {
                      return reject(err);
                    }
                    resolve({ stdout, stderr });
                  });
                });
  
                updateSpinner.succeed(
                  `Successfully upgraded CLI to version ${versionInfo.latest}. Continuing execution...`,
                );
  
                // If the package is installed globally with yarn or pnpm, then npx won't recognize it
                // So we need to make sure to run the command directly
                const executionCommand =
                  !installation.isGlobal || installation.packageManager === "npm"
                    ? `npx biconomy`
                    : `biconomy`;
                await new Promise((resolve, reject) => {
                  const shell = spawn(
                    `${executionCommand} ${process.argv.slice(2).join(" ")}`,
                    [],
                    { stdio: "inherit", shell: true, env: clonedEnvironment },
                  );
                  shell.on("close", (code) =>
                    code === 0 ? resolve("") : reject(),
                  );
                });
  
                process.exit(0);
              }
            }
          },
        );
      });
  
    program
      .command("install [projectPath]")
      .description(
        "Install biconomy into your project. If no path is specified, the current directory will be used.",
      )
      .option("--nightly", "Install the nightly version of packages.")
      .option("--dev", "Install the dev version of packages")
      .action(async (path, options) => {
        await install(path, options);
      });
  
    program
      .command("create [projectType] [projectPath]")
      .description(
        "Create a web3 app from any of our official templates: https://github.com/biconomy-example/",
      )
      .option("--app", "Create a web3 app.")
      .option("--ts, --typescript", "Initialize as a TypeScript project.")
      .option("--js, --javascript", "Initialize as a JavaScript project.")
      .option("--cra", "Initialize as a Create React App project.")
      .option("--next", "Initialize as a Next.js project.")
      // .option("--vite", "Initialize as a Vite project.")
      // .option("--reactNative", "Initialize as a React Native project.")
      // .option("--express", "Initialize as a Express project.")
      .option("--node", "Initialize as a Node project.")
      .option(
        "--use-npm",
        "Explicitly tell the CLI to bootstrap the app using npm",
      )
      .option(
        "--use-pnpm",
        "Explicitly tell the CLI to bootstrap the app using pnpm",
      )
      .option("--framework [name]", "The preferred framework.")
      // .option("--solana", "Initialize as a Solana project.")
      // .option("--evm", "Initialize as an Ethereum project.")
      .option(
        "-t, --template [name]",
        "A template to start your project from. You can use an template repository name from the official biconomy-example org.",
      )
      .action(async (type, path, options) => {
        await twCreate(type, path, options);
      });
    }  