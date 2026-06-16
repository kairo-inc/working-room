import fs from "fs"
import os from "os"

let rootDir = process.env.ROOT_DIR

if (!rootDir) {
  rootDir = `${os.homedir()}/.wr`
}
const blobDir = `${rootDir}/.context/blob`

if (!fs.existsSync(rootDir)) {
  fs.mkdirSync(rootDir, { recursive: true })
  console.log(`Created root directory at ${rootDir}`)
}

if (!fs.existsSync(blobDir)) {
  fs.mkdirSync(blobDir, { recursive: true })
  console.log(`Created blob directory at ${blobDir}`)
}

export const coreConfig = {
  root: rootDir,
  blobDir: blobDir,
}

export type CoreConfig = typeof coreConfig
