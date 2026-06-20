# Changelog

All notable changes to WorkingRoom will be documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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
