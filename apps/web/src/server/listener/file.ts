import { injectable } from "tsyringe"

import { FileAccessListener } from "@wr/access"

@injectable()
export class FileAccessListenerImpl extends FileAccessListener {
  constructor() {
    super()
  }

  async onFileChanged(): Promise<void> {}

  async onFileDescriptorResolved(): Promise<void> {}
}
