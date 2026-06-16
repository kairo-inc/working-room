# Contributing to WorkingRoom

## Prerequisites

- Node.js 20–22
- Yarn 4+ (`corepack enable`)
- Anthropic and/or OpenAI API key

## Local Setup

```bash
git clone https://github.com/kairo-inc/working-room.git
cd working-room

corepack enable
yarn install

# Environment variables
# `.env.local` is committed with local development defaults.
# Configure ANTHROPIC_API_KEY and/or OPENAI_API_KEY in your local environment.
# Do not commit secrets to the repository.

yarn prisma:dev      # Initialize SQLite database
yarn dev:web         # Start web app at http://localhost:3000
```

## Project Structure

```
apps/web/             Next.js 15 web app (tRPC, NextAuth, Tailwind)
apps/docs/            Docusaurus documentation site
packages/access/      Access layer for blob/provider/service integrations
packages/composition/ Workspace composition and dependency wiring
packages/core/        Core engine for agents, prompts, tools, events, and maps
packages/db/          Prisma schema, migrations, and database access
packages/shared/      Shared TypeScript types and cross-runtime utilities
packages/shared-node/ Node.js-specific shared utilities
packages/testing/     Shared testing fixtures and helpers
```

## Scripts

| Command                | Description                                 |
| ---------------------- | ------------------------------------------- |
| `yarn dev:web`         | Start the web app in development            |
| `yarn dev:docs`        | Start the documentation site                |
| `yarn build:web`       | Build the web app for production            |
| `yarn start:web`       | Build and start the web app                 |
| `yarn prisma:dev`      | Run Prisma development migrations           |
| `yarn prisma:reset`    | Reset the database and re-run setup         |
| `yarn prisma:generate` | Regenerate the Prisma client                |
| `yarn prisma:deploy`   | Apply Prisma migrations                     |
| `yarn test`            | Run the test suite                          |
| `yarn test:watch`      | Run tests in watch mode                     |
| `yarn coverage`        | Run tests with coverage                     |
| `yarn lint`            | Check TS and TSX files with Prettier        |
| `yarn lint-fix`        | Format TS and TSX files with Prettier       |
| `yarn seed:docs`       | Apply docs DB migrations and seed docs data |
| `yarn start:web:docs`  | Start the web app with the docs environment |

## Pull Requests

- Protected branches:
  - `main` is the production / release branch
  - `dev` is the integration / next release branch
  - Both `main` and `dev` must remain protected branches
- Open pull requests against `dev` only
- Keep PRs focused on a single concern
- Create branches from an issue using the format `prefix/#issue-number`
  - Use `feature` for new features
  - Use `fix` for bug fixes
  - Use `refactor` for refactoring without behavior changes
  - Use `chore` for maintenance, configuration changes, and dependency updates
  - Use `docs` for documentation changes
  - Use `test` for adding or updating tests
  - e.g. `feature/#123`, `fix/#456`, `refactor/#789`
- Run `yarn lint-fix` before pushing
- Ensure `yarn build:web` passes locally
- Ensure `yarn test` passes locally
- Write clear commit messages
- Prefer explaining why when it adds useful context

## Code Style

- TypeScript strict mode throughout
- Prettier config in `.prettierrc.yaml`
- Comments should explain why, not what.
- Avoid comments that merely restate the code.
- Prefer self-documenting code over excessive comments.
