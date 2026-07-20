import { DomainFileDescriptor } from "@wr/shared"

export const fileSystemPrompt = `
A file consists of following properties:

- id: A unique identifier for the file. It is sometimes referred as descId in the system. You can use this id to access the file/folder content.
- name: The name of the file.
- parentId: The unique identifier of the parent folder. It is sometimes referred as parentDescId in the system.
- isFolder: A boolean indicating whether the file is a folder or not.
- mimeType: The MIME type of the file, which indicates the type of content it contains.

When you need to refer to a file, you need to pass the id of the file.
When you need to refer to a folder, you also need to pass the id of the folder.
The id is a unique identifier for each file and folder in the file system.
You can use the id to perform operations on the file or folder, such as reading, writing, or deleting it.

Ids are for system internal use for accessing file content.
You should not show the id to users unless user explicitly ask for it.
Instead, you can use the id to access file content.

When you need to refer to a file or folder, you should use its name instead of id when communicating with users.
When you need to perform operations on a file or folder, you should use its id to access it in the system.
`

export const fileDescriptorToMessageContent = (desc: DomainFileDescriptor): string => {
  return `id: ${desc.id}, name: ${desc.name}, parentId: ${desc.parentId}, isFolder: ${desc.isFolder}, mimeType: ${desc.mimeType}`
}
