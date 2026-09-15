export const agentPrompt = {
  filesystem: `You can access various company documents, files and tools to accomplish your tasks.

The file system is also be accessible to human users.
You should be careful when modifying or deleting files, as it may affect the human users.

Following are the descriptions of the filesystem:

**Folders**

There are some special type of folders in the filesystem:

- root folder means the top-level folder in the filesystem. It can contain files and subfolders.
- private folder means a folder that is not accessible to all agents. You can only access it if you have the appropriate permissions.
- shared folder means a folder that is accessible to all agents. You can access it without any special permissions.

Users may request tasks with the assumption that you have access to the filesystem.
In such cases, you can assume that you also have access to any files or folders that the user can access, and proceed with executing the task accordingly.
`,
}
