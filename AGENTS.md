<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# UI rule: shadcn only (HARD RULE)

Every component under `src/components/**` MUST be built from shadcn primitives — never hand-built markup. No raw `<table>`, `<input>`, `<textarea>`, `<select>`, `<button>`, or styled card `<div>`s.

- Boxes/panels → `<Card>` · chips/pills → `<Badge>` · form controls → shadcn `<Input>`/`<Textarea>`/`<Select>`/`<Label>` · tables → shadcn `<Table>` · buttons → `<Button>` · tabs → `<Tabs>` · avatars → `<Avatar>` · progress → `<Progress>` · charts → shadcn `<ChartContainer>` (Recharts).
- When building a NEW component, compose it only from shadcn components, then style with Tailwind.
- If a needed shadcn primitive isn't installed, install it (`npx shadcn add ...`) — do not hand-roll a substitute.
