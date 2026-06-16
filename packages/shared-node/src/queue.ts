export function createAsyncQueue<T>() {
  const values: T[] = []
  const resolvers: ((value: IteratorResult<T>) => void)[] = []
  let closed = false

  return {
    push(value: T) {
      if (closed) return
      const resolver = resolvers.shift()
      if (resolver) {
        resolver({ value, done: false })
      } else {
        values.push(value)
      }
    },

    close() {
      closed = true
      while (resolvers.length > 0) {
        resolvers.shift()!({ value: undefined as T, done: true })
      }
    },

    async *iterator(): AsyncGenerator<T> {
      while (true) {
        if (values.length > 0) {
          yield values.shift()!
          continue
        }

        if (closed) break

        const result = await new Promise<IteratorResult<T>>((resolve) => {
          resolvers.push(resolve)
        })

        if (result.done) break

        yield result.value
      }
    },
  }
}
