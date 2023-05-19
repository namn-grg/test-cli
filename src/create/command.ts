#!/usr/bin/env node

/* eslint-disable import/no-extraneous-dependencies */
import { CREATE_MESSAGES } from "../../constants/constants";
import { DownloadError, createApp } from "./helpers/create-app";
import { createContractProject } from "./helpers/create-contract";
import { getPkgManager } from "./helpers/get-pkg-manager";
import { validateNpmName } from "./helpers/validate-pkg";
import chalk from "chalk";
import fs from "fs";
import path from "path";
import prompts from "prompts";

let projectPath: string = "";
let framework: string = "";
let language: string = "";
let chain: string = "evm";

export async function twCreate(
  pType: string,
  pPath: string = "",
  options: any,
) {
  if (typeof pPath === "string") {
    projectPath = pPath;
  }

    if (options.typescript) {
        language = "typescript";
    }
    if (options.javascript) {
        language = "javascript";
    }

    if (options.next) {
        framework = "next";
    }
    if (options.cra) {
        framework = "cra";
    }
    if (options.node) {
        framework = "node";
    }
    // if (options.vite) {
    //     framework = "vite";
    // }
    // if (options.express) {
    //     framework = "express";
    // }
    // if (options.reactNative) {
    //     framework = "react-native";
    // }
  

  if (options.framework) {
    framework = options.framework;
  }



    if (!projectPath) {
      const defaultName ="biconomy-app";
      const res = await prompts({
        type: "text",
        name: "path",
        message: CREATE_MESSAGES.projectName,
        initial: options.template || defaultName,
        format: (name: string) => name.toLowerCase(),
        validate: (name: string) => {
          const validation = validateNpmName(
            path.basename(path.resolve(name.toLowerCase())),
          );
          return (
            validation.valid ||
            "Invalid project name: " + validation.problems?.[0]
          );
        },
      });

      if (typeof res.path === "string") {
        projectPath = path.join(projectPath, res.path.trim());
      }
    }

    if (!projectPath) {
      console.log(
        "\nPlease specify the project directory:\n" +
          `  ${chalk.cyan("npx thirdweb create")} ${chalk.green(
            "<project-directory>",
          )}\n` +
          "For example:\n" +
          `  ${chalk.cyan("npx thirdweb create")} ${chalk.green(
            "my-thirdweb-app",
          )}\n\n` +
          `Run ${chalk.cyan("npx thirdweb --help")} to see all options.`,
      );
      process.exit(1);
    }

  
      if (!framework) {
        const res = await prompts({
          type: "select",
          name: "framework",
          message: CREATE_MESSAGES.framework,
          choices:[
                  { title: "Next.js", value: "next" },
                  { title: "Create React App", value: "cra" },
                  { title: "Node.js", value: "node" },
                //   { title: "Vite", value: "vite" },
                //   { title: "React Native", value: "react-native" },
                //   { title: "Express", value: "express" },
                ]
        });

        if (typeof res.framework === "string") {
          framework = res.framework.trim();
        }
      }

      if (!language) {
        if (framework === "react-native") {
          const res = await prompts({
            type: "select",
            name: "project",
            message: CREATE_MESSAGES.reactNative,
            choices: [
              { title: "Expo Project", value: "expo" },
              { title: "React Native CLI", value: "typescript" },
            ],
          });

          if (typeof res.project === "string") {
            language = res.project.trim();
          }
        } else {
          const res = await prompts({
            type: "select",
            name: "language",
            message: CREATE_MESSAGES.language,
            choices: [
              { title: "JavaScript", value: "javascript" },
              { title: "TypeScript", value: "typescript" },
            ],
          });

          if (typeof res.language === "string") {
            language = res.language.trim();
          }
        }
      }

      if (!language) {
        // Default = JavaScript
        language = "javascript";
      }
    }


  // Resolve project path
  projectPath = path.resolve(projectPath);
  const projectName = path.basename(projectPath);

  const { valid, problems } = validateNpmName(projectName);
  if (!valid) {
    console.error(
      `Could not create a project called ${chalk.red(
        `"${projectName}"`,
      )} because of npm naming restrictions:`,
    );

    problems?.forEach((p) => console.error(`    ${chalk.red.bold("*")} ${p}`));
    process.exit(1);
  }

//   if (options.template === true) {
//     console.error(
//       "Please provide an template name, otherwise remove the template option. Checkout some templates you can use here: https://github.com/thirdweb-example/",
//     );
//     process.exit(1);
//   }

//   const packageManager = !!options.useNpm
//     ? "npm"
//     : !!options.usePnpm
//     ? "pnpm"
//     : getPkgManager();

//   const template =
//     typeof options.template === "string" ? options.template.trim() : undefined;
  try {
      await createApp({
        appPath: projectPath,
        packageManager,
        framework,
        language,
        template,
        chain,
      });
  } catch (reason) {
    if (!(reason instanceof DownloadError)) {
      throw reason;
    }
  }


