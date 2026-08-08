# AI Editor — Development

## Enable

```
NEXT_PUBLIC_AI_EDITOR_ENABLED=true
```

Default is on unless explicitly set to `false`.

## Run web app

```
npm run dev
```

Open a project → spine → **AI Editor**.

## Run Desktop Agent (scaffold)

```
cd desktop-agent
npm install
npm run dev
```

Agent listens on `http://127.0.0.1:17865`.

## Tests

```
npx vitest run src/lib/aiEditor
```

Use mock media metadata — do not commit copyrighted footage.

## Module layout

```
src/lib/aiEditor/           core types, context, validation, API client
src/components/aiEditor/    UI
src/app/(app)/projects/[id]/ai-editor/
src/app/api/projects/[id]/ai-editor/
desktop-agent/              local companion scaffold
docs/ai-editor/             architecture docs
```
