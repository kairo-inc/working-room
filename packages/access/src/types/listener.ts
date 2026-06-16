import { DomainFileDescriptor } from "@wr/shared"

export type FileAccessListenerOnFileChangedArg = {
  userId: string
  descriptor: DomainFileDescriptor
}

export type FileAccessListenerOnFileDescriptorResolvedArg = {
  descriptor: DomainFileDescriptor
  ancestors: DomainFileDescriptor[]
}

export abstract class FileAccessListener {
  // Called when a user did something on the file.
  abstract onFileChanged(arg: FileAccessListenerOnFileChangedArg): Promise<void>
  // Called when the file descriptor is resolved. This can be used to update the file descriptor in the database.
  abstract onFileDescriptorResolved(arg: FileAccessListenerOnFileDescriptorResolvedArg): Promise<void>
}

export class NoopFileAccessListenerImpl extends FileAccessListener {
  async onFileChanged(_: FileAccessListenerOnFileChangedArg): Promise<void> {
    // do nothing.
  }

  async onFileDescriptorResolved(_: FileAccessListenerOnFileDescriptorResolvedArg): Promise<void> {
    // do nothing.
  }
}
