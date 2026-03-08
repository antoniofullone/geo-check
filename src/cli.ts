#!/usr/bin/env node
import { Command, CommanderError } from "commander";
import { pathToFileURL } from "node:url";
import { geoCheckMany } from "./index.js";
import { formatJsonOutput } from "./reporters/json.js";
import { renderTerminalResults } from "./reporters/terminal.js";

interface CliIO {
  stdout: (message: string) => void;
  stderr: (message: string) => void;
}

const defaultIO: CliIO = {
  stdout: (message) => console.log(message),
  stderr: (message) => console.error(message)
};

export async function runCli(argv = process.argv, io: CliIO = defaultIO): Promise<number> {
  const program = new Command();

  program
    .name("geo-check")
    .description("AI Visibility Scanner — robots.txt AI bot access + GEO readiness score")
    .argument("[urls...]", "Target URLs to scan")
    .option("--json", "Output machine-readable JSON")
    .option("--robots-only", "Only run robots.txt checks")
    .option("--geo-only", "Only output GEO score")
    .option("--verbose", "Show all check details")
    .showHelpAfterError();

  program.exitOverride();

  try {
    program.parse(argv);
  } catch (error) {
    if (error instanceof CommanderError) {
      if (error.code !== "commander.helpDisplayed") {
        io.stderr(error.message);
      }
      return 2;
    }
    throw error;
  }

  const opts = program.opts<{
    json?: boolean;
    robotsOnly?: boolean;
    geoOnly?: boolean;
    verbose?: boolean;
  }>();

  const urls = program.args as string[];

  if (urls.length === 0) {
    io.stderr("Please provide at least one URL. Example: npx geo-check https://example.com");
    return 2;
  }

  if (opts.robotsOnly && opts.geoOnly) {
    io.stderr("--robots-only and --geo-only cannot be used together.");
    return 2;
  }

  const results = await geoCheckMany(urls, {
    robotsOnly: opts.robotsOnly,
    geoOnly: opts.geoOnly,
    verbose: opts.verbose,
    concurrency: 3
  });

  if (opts.json) {
    io.stdout(formatJsonOutput(results.length === 1 ? results[0]! : results));
  } else {
    io.stdout(renderTerminalResults(results, { verbose: Boolean(opts.verbose) }));
  }

  return results.some((result) => result.success) ? 0 : 1;
}

const directInvocation = process.argv[1]
  ? import.meta.url === pathToFileURL(process.argv[1]).href
  : false;

if (directInvocation) {
  runCli().then((code) => {
    process.exit(code);
  });
}
