# Page snapshot

```yaml
- alert
- button "Open Next.js Dev Tools":
  - img
- button "Open issues overlay": 1 Issue
- navigation:
  - button "previous" [disabled]:
    - img "previous"
  - text: 1/1
  - button "next" [disabled]:
    - img "next"
- img
- link "Next.js 15.3.4 (stale) Turbopack":
  - /url: https://nextjs.org/docs/messages/version-staleness
  - img
  - text: Next.js 15.3.4 (stale) Turbopack
- img
- text: Build Error
- button "Copy Stack Trace":
  - img
- button "No related documentation found" [disabled]:
  - img
- link "Learn more about enabling Node.js inspector for server code with Chrome DevTools":
  - /url: https://nextjs.org/docs/app/building-your-application/configuring/debugging#server-side-code
  - img
- paragraph: Code generation for chunk item errored
- img
- text: "[externals]/node:inspector"
- button "Open in editor":
  - img
- text: "Code generation for chunk item errored An error occurred while generating the chunk item [externals]/node:inspector [external] (node:inspector, cjs, async loader) Caused by: - Cell CellId { type_id: ValueTypeId { id: 226, name: \"turbopack-core@TODO::::chunk::available_modules::AvailableModulesSet\" }, index: 0 } no longer exists in task <NodeJsChunkingContext as ChunkingContext>::chunk_group (no cell of this type exists) Debug info: - An error occurred while generating the chunk item [externals]/node:inspector [external] (node:inspector, cjs, async loader) - Execution of <AsyncLoaderChunkItem as EcmascriptChunkItem>::content failed - Execution of AsyncLoaderChunkItem::chunks_data failed - Execution of AsyncLoaderChunkItem::chunks failed - Execution of AvailableModules::get failed - Cell CellId { type_id: ValueTypeId { id: 226, name: \"turbopack-core@TODO::::chunk::available_modules::AvailableModulesSet\" }, index: 0 } no longer exists in task <NodeJsChunkingContext as ChunkingContext>::chunk_group (no cell of this type exists)"
- contentinfo:
  - paragraph: This error occurred during the build process and can only be dismissed by fixing the error.
```