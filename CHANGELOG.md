# Changelog

All notable changes to WorkingRoom will be documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.2.6] - 2026-07-17

### Added

#### Integrations

- Added Slack integration: connect a User's account via OAuth2, then let Agents list channels and direct-message conversations, look up workspace members, send messages, read recent conversation history, and add or remove emoji reactions, all on the User's behalf.

#### AI Agent System

- Added support for self-hosted LLMs via an OpenAI-compatible API, letting operators point WorkingRoom at their own inference server instead of a third-party provider.

#### File Management

- Added Tools that let an Agent browse a file's edit history: listing history entries, reading content at a given history point, and comparing two history points.
- Added support for uploading images pasted from the clipboard in the file upload area.

### Changed

#### File Management

- The file content page's edit history sidebar is now collapsed by default and opens via an icon button, freeing up space for the main content.

#### Chat Experience

- The AI agent now replies in the user's language.

### Fixed

#### Integrations

- Fixed Slack OAuth token refresh failing once the access token had already rotated, which could break the automatic recovery from an expired token.

#### File Management

- Fixed the file list not refreshing after a move operation.
- Fixed duplicate file entries appearing in a chat message's referenced-file list when multiple history Tools reference the same file.

#### Deployment

- Fixed the web application's Docker build, which failed after the Slack integration was added.

### Documentation

- Added a Slack Integration setup guide for self-hosted administrators (English and Japanese).
- Added a README to each internal package, and documented the self-hosted LLM and Slack environment variables.

## [0.2.5] - 2026-07-05

### Added

#### AI Agent System

- Added Google (Gemini) as a supported AI vendor alongside OpenAI and Anthropic.
- Added a tenant-level AI Vendor setting on the Settings page, allowing workspace owners to pin a preferred AI provider.

#### File Management

- Added an in-browser text editor for Markdown and plain text files, along with a "New File" action to create files directly from the file list.

#### Chat Experience

- Added a "Start Chat" button on the folder page to start a new chat with that folder pre-set as its working folder.

### Changed

#### Platform

- Improved responsiveness on smartphone-sized screens: the sidebar collapses into a hamburger menu with a slide-in drawer, header buttons switch to icon-only, and several content overflow issues on narrow viewports were fixed.

### Fixed

#### AI Agent System

- Fixed chat responses failing when using an Anthropic model together with file search, directory listing, or file writing tools.

### Documentation

- Synced the Roadmap and User Guide with recently shipped features, including AI Vendor selection, the text editor, and starting a chat from a folder.

## [0.2.4] - 2026-06-30

### Added

#### File Management

- Added rubber-band selection to the file list: drag over an empty area to draw a selection rectangle and select multiple files and folders at once.

### Changed

#### Platform

- Improved layout reliability on mobile browsers by replacing fixed viewport height units (`vh`) with dynamic viewport height units (`dvh`).

### Fixed

#### Chat Experience

- Fixed inconsistent spacing above headings in Markdown-rendered messages.
- Fixed the horizontal rule rendering in Markdown content, which previously used an incorrect border style.

## [0.2.3] - 2026-06-26

### Added

#### File Management

- Added a download button to the file content page, allowing users to save files directly from the browser.

### Fixed

#### File Management

- Fixed an issue where the pager displayed the incorrect current page and the file list did not refresh after operations such as delete or move.
- Fixed an issue where the file select modal and user select modal did not scroll when the list contained many items, making lower entries inaccessible.

### Documentation

#### Chat Experience

- Added documentation for the working folder feature in the Chat user guide, including screenshots showing how to view and change the current directory.

## [0.2.2] - 2026-06-22

### Added

#### Chat

- Added working folder configuration per chat, allowing users to set a directory as the default context for file selection.

### Fixed

#### Authentication

- Fixed sign-out not invalidating the session server-side, which previously allowed the same JWT to be reused after logout.

#### File Management

- Fixed an issue where ancestor directories were not visible when listing a directory with an accessible nested target.
- Fixed an issue where the file select modal froze when the configured working folder became inaccessible (e.g., due to Access Group changes); the modal now falls back to the root directory.

### Changed

#### Platform

- Upgraded runtime to Node.js 24.

## [0.2.1] - 2026-06-20

### Added

#### Access Control

- Added an Access Group edit page where owners can update the group name, description, and settings.
- Added member management for Access Groups: owners can now add and remove users directly from the edit page.
- Added inline editing for Access Group details, allowing the name, description, and toggle settings to be edited in place without navigating to a separate form.

### Documentation

- Localized the user-facing documentation site into Japanese.

## [0.2.0] - 2026-06-19

### Added

#### AI Agent System

- Added Agent management: users can now create, view, edit, and delete reusable Agents with a name, model tier, system prompt, and optional working folder.
- Added sub-agent spawning: the Coordinator Agent can delegate work to user-defined Agents based on the task.

### Changed

#### File Management

- Improved user-facing error messages for file operations to provide clearer, actionable feedback.

### Fixed

#### Access Control

- Fixed an issue where invited users' personal access group incorrectly granted access to the shared root directory; it is now restricted to their private directory only.

### Documentation

#### Access Control

- Added user guide for Access Groups, covering the permission model, personal vs. shared groups, access rules, and default setup for owners and invited users.

#### AI Agent System

- Added user guide for the Agent feature, covering concepts (Model Tier, Working Folder, Description for Agent, System Prompt) and all management workflows.

## [0.1.0] - 2026-06-16

### Added

#### Workspace & Collaboration

- Initial public release of WorkingRoom.
- Workspace foundation with users, roles, chats, messages, and file descriptors.
- Local sign-in and sign-up flows.
- Chat-based workflows through the web application.

#### AI Agent System

- Agent engine built on the Vercel AI SDK.
- Anthropic and OpenAI model support.
- Integrated web search capabilities.

#### File Management

- Directory listing and navigation.
- Text file reading and editing.
- PDF and image file viewing.
- Full-text file search.
- File and directory creation.
- Move, rename, and delete operations.

#### Platform

- Next.js 15 web application.
- tRPC API layer.
- SQLite as the default database.

#### Documentation

- Docusaurus-based documentation site.
- Product documentation.
- Deployment documentation.

#### Deployment

- Docker-based local development environment.
- Self-hosted deployment support.
