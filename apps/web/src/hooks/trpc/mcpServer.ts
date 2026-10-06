import { AlreadyExistsError, McpServerAuthError, McpServerConnectionError, NotFoundError } from "@wr/shared"

import { handleError } from "../../middleware/trpc"
import { trpc } from "../../utils/trpc"

const notFound = { error: NotFoundError, message: "MCP server not found." }
const alreadyExists = { error: AlreadyExistsError, message: "An MCP server with this name already exists." }
const authFailed = { error: McpServerAuthError, message: "The MCP server rejected the access token. Check the access token." }
const cannotConnect = {
  error: McpServerConnectionError,
  message: "Could not connect to the MCP server. Check the URL and that the server is running.",
}

export const useMcpServerCreate = () => {
  const { mutateAsync, mutate: _, ...rest } = trpc.mcpServerCreate.useMutation()
  return {
    ...rest,
    mutateAsync: async (...args: Parameters<typeof mutateAsync>) => {
      try {
        return await mutateAsync(...args)
      } catch (e) {
        return handleError(e, [alreadyExists, authFailed, cannotConnect], "Failed to add the MCP server.")
      }
    },
  }
}

export const useMcpServerEdit = () => {
  const { mutateAsync, mutate: _, ...rest } = trpc.mcpServerEdit.useMutation()
  return {
    ...rest,
    mutateAsync: async (...args: Parameters<typeof mutateAsync>) => {
      try {
        return await mutateAsync(...args)
      } catch (e) {
        return handleError(e, [notFound, alreadyExists, authFailed, cannotConnect], "Failed to edit the MCP server.")
      }
    },
  }
}

export const useMcpServerDelete = () => {
  const { mutateAsync, mutate: _, ...rest } = trpc.mcpServerDelete.useMutation()
  return {
    ...rest,
    mutateAsync: async (...args: Parameters<typeof mutateAsync>) => {
      try {
        return await mutateAsync(...args)
      } catch (e) {
        return handleError(e, [notFound], "Failed to delete the MCP server.")
      }
    },
  }
}

export const useMcpServerRefreshTools = () => {
  const { mutateAsync, mutate: _, ...rest } = trpc.mcpServerRefreshTools.useMutation()
  return {
    ...rest,
    mutateAsync: async (...args: Parameters<typeof mutateAsync>) => {
      try {
        return await mutateAsync(...args)
      } catch (e) {
        return handleError(e, [notFound, authFailed, cannotConnect], "Failed to refresh the MCP server's Tools.")
      }
    },
  }
}
