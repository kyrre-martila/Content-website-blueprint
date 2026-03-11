# NEW_PROJECT

Recommended workflow when starting a new site from this blueprint.

## 1) Clone the blueprint

```bash
git clone <blueprint-repo-url> my-new-site
cd my-new-site
```

## 2) Rename the project

- Update `name` in root `package.json`.
- Update app/package names and docs references as needed.

## 3) Configure environment

```bash
cp env.example .env
```

Set project-specific values (URLs, secrets, SMTP, DB connection).

## 4) Install dependencies

```bash
pnpm install
```

## 5) Apply migrations

```bash
pnpm db:migrate
```

## 6) Seed baseline data

```bash
pnpm db:seed
```

## 7) Develop and deploy

- Dev: `pnpm dev`
- Build: `pnpm build`
- Production API: `pnpm start:api`
- Production web: `pnpm start:web`
- Set production env vars from `.env.prod.example`
- Validate health endpoints after release
