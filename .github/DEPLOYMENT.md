# Automatic website deployment

Every push to `master` in **YASSB-FOSS/yassb** starts `deploy-landing.yml`,
including the commit created by merging a pull request into `master`. That branch
contains the source approved for publication; development stays on `develop`.

To publish website changes, update them on `develop` (increment the patch in
`landing/package.json` when making a website release), then merge into `master`.
No tag is required. The engine version does not need to change.

The workflow can also be started from **Actions → Deploy website from master →
Run workflow**, selecting `master`. Other branches cannot deploy manually.

The destination is the separate **YASSB-FOSS/YASSB-FOSS.github.io** repository.
The workflow writes the generated site to its `master` branch; that push does not
restart this source-repository workflow.

The workflow installs the engine and website dependencies from their Bun
lockfiles, builds and tests the engine, then runs `bun run deploy-landing`.
That script builds and validates the website before committing its output to
`master` in `YASSB-FOSS/YASSB-FOSS.github.io`. GitHub Pages publishes that branch.
Deployments run one at a time. Build, test or validation errors stop publication.
The workflow publishes the website only; it does not publish an npm package.

## One-time setup

1. Create a fine-grained personal access token with resource owner `YASSB-FOSS`,
   access only to `YASSB-FOSS.github.io`, and **Contents: Read and write**.
   Complete organization approval if required and set an appropriate expiration.
2. In **YASSB-FOSS/yassb → Settings → Secrets and variables → Actions**, add a
   repository secret named **PAGES_DEPLOY_TOKEN** containing that token.
3. In **YASSB-FOSS/YASSB-FOSS.github.io → Settings → Pages**, confirm that the
   source is **Deploy from a branch**, branch **master**, folder **/ (root)**.

The source repository's automatic `GITHUB_TOKEN` cannot write to another
repository. The dedicated token also allows the destination push to trigger its
Pages build. It is supplied only to the deployment step's Git commands, scoped
to the destination repository, without putting credentials in the remote URL.
Do not paste the token into a workflow, issue or pull request. Renew the secret
when the token expires.

For a local preview of deployment without publishing, install both dependency
sets and run `bun run deploy-landing --dry-run` from the repository root.
