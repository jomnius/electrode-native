// @flow

import {
  mkdirp,
  writeFile
} from './fs-util'
import BaseGit from './base-git'
import fs from 'fs'
import path from 'path'

function trim (v: string) : string {
  return v && v.trim()
}
export default class FileStore extends BaseGit {
  _prefix : string

  constructor (
    ernPath: string,
    repository: string,
    branch: string,
    prefix: string) {
    super(ernPath, repository, branch)
    this._prefix = prefix
  }

  /**
  * Stores a file in this file store
  *
  * @param {string} filename - The name of the file to store
  * @param {string|Buffer} data - The file binary data
  * @return sha1 hash from git.
  */
  async storeFile (identifier: string, content: string | Buffer) {
    await this.sync()
    await mkdirp(path.resolve(this.path, this._prefix))
    const relPath = this.pathToFile(identifier)
    await writeFile(path.resolve(this.path, relPath), content, {flag: 'w'})
    await this.git.addAsync(relPath)
    await this.git.commitAsync(`[added file] ${identifier}`)
    await this.push()

    const sha1 = await new Promise((resolve, reject) => {
      this.git.revparse([`:${relPath}`], (err, res) => {
        err ? reject(err) : resolve(res)
      })
    })

    return trim(sha1)
  }

  async hasFile (filename: string) {
    await this.sync()
    try {
      fs.statSync(this.pathToFile(filename)).isFile()
      return true
    } catch (e) {
      return false
    }
  }

  /**
  * Retrieves a file from this store
  *
  * @param {string} filename - The name of the file to retrieve
  * @return {Buffer} The file binary data
  */
  async getFile (filename: string) {
    await this.sync()
    return fs.readFileSync(this.pathToFile(filename))
  }

  /**
  * Removes a file from this store
  *
  * @param {string} filename - The name of the file to remove
  */
  async removeFile (filename: string) {
    await this.sync()
    await this.git.rmAsync(this.pathToFile(filename))
    return this.push()
  }

  pathToFile (filename: string) {
    return path.join(this._prefix, filename)
  }
}
