#!/usr/bin/env node
import yargs from "yargs";
import path, { resolve } from "node:path";
import fs from "node:fs";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process"
import { execSync } from "node:child_process";
import chalk from "chalk";

type ConfirmationLocal = {
  isOk: boolean,
  path: string
}

type PathConfirmation = {
  pathLocation: string,
  templateContent: string
}

const questionsAboutDirectories = [
  {
    question: "Type where the repository directory is: ",
    template: resolveBufferFile(path.resolve(__dirname, "..", "templates", "repositories.txt"))
  },
  {
    question: "Type where the entities directory is: ",
    template: resolveBufferFile(path.resolve(__dirname, "..", "templates", "entities.txt"))
  },
  {
    question: "Type where the usecases directory is: ",
    template: resolveBufferFile(path.resolve(__dirname, "..", "templates", "usecases.txt"))
  },
  {
    question: "Type where the routes directory is: ",
    template: resolveBufferFile(path.resolve(__dirname, "..", "templates", "routes.txt"))
  },
];

function getPwd(): string {
  return execSync("pwd").toString();
}

function resolveBufferFile(location: string): string {
  const buffer = fs.readFileSync(location);
  return Buffer.from(buffer).toString();
}

function ConfirmExistenceOfPath(location: string): ConfirmationLocal {
  if (location.startsWith("."))
    location = location.substring(1);

  const formatLocation = path.join(getPwd().trim(), location);

  return {
    isOk: fs.existsSync(formatLocation),
    path: formatLocation
  };
}

async function handleBinaryQuestion(instance_q: readline.Interface, question: string): Promise<boolean> {
  const ultilHandle = await instance_q.question(question);

  if (ultilHandle !== "Y" && ultilHandle !== "N") {
    console.log(chalk.red("Unknown flag"));
    process.exit(0);
  }

  if (ultilHandle === "Y") return true;

  return false;
}

async function handleResolverOtherPaths(instance_q: readline.Interface) {
  console.log(chalk.green("utils/index.ts resolved \n"));
  const moduleName = await instance_q.question("Type the module name: ");
  const pathSettingFile = path.join(getPwd().trim(), "setting.mpc.json");

  const initializeTemplates = (source_data: PathConfirmation[], mn: string) => {
    for (const handle of source_data) {
      const separated = handle.pathLocation.split('/');
      const prefix = separated[separated.length - 1].toLowerCase();
      const fileName = `${mn}.${prefix}.ts`;
      fs.writeFileSync(
        path.join(handle.pathLocation, fileName),
        handle.templateContent.replaceAll("{*}", mn)
      );
    }
  }

  if (!fs.existsSync(pathSettingFile)) {
    let paths = [] as PathConfirmation[];

    for (const ask of questionsAboutDirectories) {
      const questionPath = await instance_q.question(ask.question);
      const resolver = ConfirmExistenceOfPath(questionPath);
  
      if (!resolver.isOk) {
        console.log(chalk.red("Path location not found."))
        break;
      }
  
      paths.push({
        pathLocation: resolver.path,
        templateContent: ask.template
      });
  
      console.log(chalk.green("Path location is Ok."))
    }
    
    fs.writeFileSync(pathSettingFile, JSON.stringify(paths));
    initializeTemplates(paths, moduleName);

    process.exit(0);
  }

  const settingFile = JSON.parse(resolveBufferFile(pathSettingFile)) as PathConfirmation[];
  initializeTemplates(settingFile, moduleName);

  process.exit(0);
}

yargs
  .command("s", "initialize base setup", async () => {
    const rl = readline.createInterface({ input, output });

    console.log("We will look for these directories from here:", getPwd());
    const ultilHandle = await handleBinaryQuestion(rl, "you ready have a handle_response in utils? type Y/N: ");

    if (!ultilHandle) {
      const basePathUtils = path.resolve(getPwd().trim(), "src", "utils", "index.ts");
      const handleResolverTemplate = resolveBufferFile(path.resolve(__dirname, "..", "templates", "handleResponse.txt"));

      if (!fs.existsSync(basePathUtils)) {
        console.log(chalk.yellow(`We looked for ${basePathUtils}, but didn't find anything.`))
        const utilDir = await rl.question("Type where the util dir is: ");
        const handlePath = ConfirmExistenceOfPath(utilDir);

        if (!handlePath.isOk) {
          console.log(chalk.yellow(`We found nothing in ${handlePath.path}`));
          const createDir = await handleBinaryQuestion(rl, "Do you want us to create this directory? type Y/N: ");

          if (createDir) {
            fs.mkdirSync(handlePath.path);
            fs.writeFileSync(path.join(handlePath.path, "index.ts"), handleResolverTemplate);
          }

          return handleResolverOtherPaths(rl);
        }

        const pathWithIndex = path.join(handlePath.path, "index.ts");

        if (fs.existsSync(pathWithIndex)) {
          let fileContent = resolveBufferFile(pathWithIndex);
          fileContent += `\n\n ${handleResolverTemplate}`;
          fs.writeFileSync(pathWithIndex, fileContent);
          return handleResolverOtherPaths(rl);
        }

        fs.writeFileSync(pathWithIndex, handleResolverTemplate);
        return handleResolverOtherPaths(rl);
      }

      let fileContent = resolveBufferFile(basePathUtils);
      fileContent += `\n\n ${handleResolverTemplate}`;

      fs.writeFileSync(basePathUtils, fileContent);
    }

    return handleResolverOtherPaths(rl);
  })
  .parse();

