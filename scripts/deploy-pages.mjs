import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(fileURLToPath(import.meta.url)).replace(
  /\/scripts$/,
  "",
);
const pagesBranch = "gh-pages";
const pollIntervalMs = 3000;
const deploymentTimeoutMs = 180_000;

function run(
  command,
  args,
  { cwd = projectRoot, input, capture = false, env = process.env } = {},
) {
  const result = spawnSync(command, args, {
    cwd,
    env,
    input,
    encoding: "utf8",
    stdio: capture ? ["pipe", "pipe", "pipe"] : "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail = capture ? result.stderr.trim() : "";
    throw new Error(
      `${command} ${args.join(" ")} failed${detail ? `: ${detail}` : ""}`,
    );
  }
  return capture ? result.stdout.trim() : "";
}

function ghJson(args, input) {
  const output = run(
    "gh",
    ["api", ...args, ...(input ? ["--input", "-"] : [])],
    {
      capture: true,
      input,
    },
  );
  return output ? JSON.parse(output) : null;
}

function parseRepository(remoteUrl) {
  const match = remoteUrl.match(/github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?$/i);
  if (!match)
    throw new Error(`origin must point to GitHub; received ${remoteUrl}`);
  return match[1];
}

function pagesSettingsInput(buildType, source) {
  return JSON.stringify({ build_type: buildType, source });
}

async function waitForBuild(repository, expectedCommit) {
  const start = Date.now();
  while (Date.now() - start < deploymentTimeoutMs) {
    const build = ghJson([`repos/${repository}/pages/builds/latest`]);
    if (build.commit === expectedCommit && build.status === "built")
      return build;
    if (
      build.commit === expectedCommit &&
      (build.status === "errored" || build.error?.message)
    ) {
      throw new Error(
        `GitHub Pages build failed: ${build.error?.message ?? build.status}`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
  throw new Error(
    `GitHub Pages build did not finish within ${deploymentTimeoutMs / 1000} seconds`,
  );
}

async function main() {
  const repository = parseRepository(
    run("git", ["remote", "get-url", "origin"], { capture: true }),
  );
  const branch = run("git", ["branch", "--show-current"], { capture: true });
  if (branch !== "main")
    throw new Error(
      `Deploy from main; current branch is ${branch || "detached HEAD"}`,
    );

  const changes = run("git", ["status", "--porcelain"], { capture: true });
  if (changes)
    throw new Error("Commit or remove working-tree changes before deploying.");

  const sourceCommit = run("git", ["rev-parse", "HEAD"], { capture: true });
  const remoteMain = run("git", ["ls-remote", "origin", "refs/heads/main"], {
    capture: true,
  }).split(/\s+/)[0];
  if (remoteMain !== sourceCommit)
    throw new Error(
      "Local main must match pushed origin/main before deploying.",
    );

  const page = ghJson([`repos/${repository}/pages`]);
  if (!page?.html_url || !page?.build_type || !page?.source) {
    throw new Error(
      "Could not read GitHub Pages settings. Check gh authentication and Pages permissions.",
    );
  }
  if (page.build_type !== "workflow" && page.build_type !== "legacy") {
    throw new Error(`Unsupported GitHub Pages build type: ${page.build_type}`);
  }
  if (
    page.build_type === "legacy" &&
    (page.source.branch !== pagesBranch || page.source.path !== "/")
  ) {
    throw new Error("Legacy Pages must publish the gh-pages branch root.");
  }

  const repoName = repository.split("/")[1];
  const buildEnv = { ...process.env, VITE_BASE_PATH: `/${repoName}/` };
  run("npm", ["run", "build:pages"], { env: buildEnv });

  const distDirectory = join(projectRoot, "dist");
  await readFile(join(distDirectory, "index.html"));
  run("git", ["fetch", "origin", pagesBranch]);

  const worktreeParent = await mkdtemp(join(tmpdir(), "skytrack-pages-"));
  const worktree = join(worktreeParent, "site");
  let worktreeAdded = false;
  let switchedToLegacy = false;
  try {
    run("git", [
      "worktree",
      "add",
      "--detach",
      worktree,
      `origin/${pagesBranch}`,
    ]);
    worktreeAdded = true;
    run("git", ["rm", "-r", "-f", "--quiet", "."], { cwd: worktree });
    await cp(distDirectory, worktree, { recursive: true, force: true });
    await writeFile(join(worktree, ".nojekyll"), "");
    run("git", ["add", "-A"], { cwd: worktree });

    const stagedChanges = run("git", ["diff", "--cached", "--name-only"], {
      cwd: worktree,
      capture: true,
    });
    if (stagedChanges) {
      run(
        "git",
        [
          "commit",
          "-m",
          `deploy: publish Mission Studio ${sourceCommit.slice(0, 7)}`,
        ],
        { cwd: worktree },
      );
    }
    const pagesCommit = run("git", ["rev-parse", "HEAD"], {
      cwd: worktree,
      capture: true,
    });
    run("git", ["push", "origin", "HEAD:gh-pages"], { cwd: worktree });

    if (page.build_type === "workflow") {
      ghJson(
        [`repos/${repository}/pages`, "--method", "PUT"],
        pagesSettingsInput("legacy", { branch: pagesBranch, path: "/" }),
      );
      switchedToLegacy = true;
    }

    ghJson([`repos/${repository}/pages/builds`, "--method", "POST"]);
    const build = await waitForBuild(repository, pagesCommit);
    console.log(`GitHub Pages published ${build.commit} at ${page.html_url}`);
  } finally {
    let restoreError;
    if (switchedToLegacy) {
      try {
        ghJson(
          [`repos/${repository}/pages`, "--method", "PUT"],
          pagesSettingsInput(page.build_type, page.source),
        );
        console.log(`Restored GitHub Pages build type: ${page.build_type}`);
      } catch (error) {
        console.error(
          "Could not restore original GitHub Pages settings. Restore them manually:",
        );
        console.error(pagesSettingsInput(page.build_type, page.source));
        restoreError = error;
      }
    }
    try {
      if (worktreeAdded)
        run("git", ["worktree", "remove", "--force", worktree]);
    } finally {
      await rm(worktreeParent, { recursive: true, force: true });
    }
    if (restoreError) throw restoreError;
  }
}

main().catch((error) => {
  console.error(`Pages deploy failed: ${error.message}`);
  process.exitCode = 1;
});
