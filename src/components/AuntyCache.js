import AuntyError from "./AuntyError.js"
import Term from "./Term.js"
import * as File from "./File.js"

export default class AuntyCache {
  #modifiedTimes = new Map()
  #dataCache = new Map()

  #cleanup(file) {
    this.#modifiedTimes.delete(file.path)
    this.#dataCache.delete(file.path)
  }

  async loadCachedData(fileObject) {
    const lastModified = await File.fileModified(fileObject)

    if(lastModified === null)
      throw AuntyError.new(`Unable to find file:\n${fileObject.path}`)

    if(this.#modifiedTimes.has(fileObject.path)) {
      const lastCached = this.#modifiedTimes.get(fileObject.path)
      if(lastModified > lastCached) {
        this.#cleanup(fileObject)
      } else {
        if(!(this.#dataCache.has(fileObject.path)))
          this.#cleanup(fileObject)
        else {
          return this.#dataCache.get(fileObject.path)
        }
      }
    }

    const data = File.loadDataFile(fileObject)

    this.#modifiedTimes.set(fileObject.path, lastModified)
    this.#dataCache.set(fileObject.path, data)

    return data
  }
}
