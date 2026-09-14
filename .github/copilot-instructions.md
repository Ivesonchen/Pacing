# Pacing workspace instructions

- [x] Verify that the copilot-instructions.md file in the .github directory is created.
- [x] Clarify Project Requirements
- [x] Scaffold the Project
- [x] Customize the Project
- [x] Install Required Extensions — none required by the project template.
- [x] Compile the Project
- [x] Create and Run Task
- [x] Launch the Project — deferred until requested.
- [x] Ensure Documentation is Complete

## Project conventions

- Build the Windows desktop shell with Electron and the renderer UX with React and Vite.
- Keep Electron context isolation and sandboxing enabled.
- Expose only narrow, purpose-built APIs from the preload script.
- Treat the sibling Jarvis workspace folder as reference-only. Do not modify it or add it as a package, build, or runtime dependency.
- Use npm for dependency management.
