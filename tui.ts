import { spawn } from "node:child_process"
import { Plugin } from "@opencode/plugin/tui"

const DIALOG_SIZE = "large"
const DIALOG_COLUMNS = 88
const ROW_PADDING = 10
const ROLE_WIDTH = 2

type Entry = { id: string; label: string; when: string; text: string }

function textOf(message: any): string {
  if (message.type === "user") return String(message.text ?? "").trim()
  if (message.type === "assistant") {
    return (message.content ?? [])
      .filter((part: any) => part.type === "text")
      .map((part: any) => part.text)
      .join("\n")
      .trim()
  }
  return ""
}

function labelOf(message: any): string {
  return message.type === "user" ? "me" : "ai"
}

function whenOf(message: any): string {
  const created = message.time?.created
  if (typeof created !== "number") return ""
  const date = new Date(created)
  const clock = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`
  const now = new Date()
  const sameDay =
    date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate()
  return sameDay ? clock : `${date.getMonth() + 1}/${date.getDate()} ${clock}`
}

function pbcopy(text: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const proc = spawn("pbcopy", [], { stdio: ["pipe", "ignore", "ignore"] })
      proc.on("error", () => resolve(false))
      proc.on("close", (code) => resolve(code === 0))
      proc.stdin.end(text)
    } catch {
      resolve(false)
    }
  })
}

async function writeClipboard(context: any, text: string): Promise<boolean> {
  const remote = Boolean(process.env.SSH_CONNECTION || process.env.SSH_TTY)
  if (process.platform === "darwin" && !remote && (await pbcopy(text))) return true
  return Boolean(context.renderer?.copyToClipboardOSC52?.(text))
}

async function loadAllMessages(context: any, sessionID: string): Promise<any[]> {
  const store = context.data.session.message
  await store.sync(sessionID)
  try {
    if (store.more?.(sessionID)) await store.loadMore?.(sessionID, { all: true })
  } catch {}
  return store.list(sessionID) ?? []
}

export default Plugin.define({
  id: "copy-message",
  setup(context: any) {
    const run = async () => {
      const route: any = context.ui.router.current()
      const sessionID = route?.sessionID ?? route?.params?.sessionID
      if (!sessionID) {
        context.ui.toast.show({ variant: "warning", message: "Open a session first" })
        return
      }

      const messages = await loadAllMessages(context, sessionID)
      const entries: Entry[] = messages
        .map((message) => ({
          id: String(message.id),
          label: labelOf(message),
          when: whenOf(message),
          text: textOf(message),
        }))
        .filter((entry) => entry.text)
        .reverse()

      if (entries.length === 0) {
        context.ui.toast.show({ variant: "info", message: "No messages with text" })
        return
      }

      const whenWidth = Math.max(...entries.map((entry) => entry.when.length))
      const footerWidth = whenWidth + 1 + ROLE_WIDTH
      const columns = Math.min(DIALOG_COLUMNS, (context.renderer?.terminalWidth ?? DIALOG_COLUMNS) - 2)
      const titleMax = Math.max(12, columns - ROW_PADDING - footerWidth - 1)
      const feedback = context.theme?.text?.feedback
      const humanColor = feedback?.info?.base
      const robotColor = feedback?.success?.base
      const textById = new Map(entries.map((entry) => [entry.id, entry.text.toLowerCase()]))
      const previewMax = titleMax - 2
      const pending = context.ui.dialog.select({
        title: "Copy message",
        options: entries.map((entry) => {
          const flat = entry.text.replace(/\s+/g, " ")
          const preview = flat.length > previewMax ? `${flat.slice(0, previewMax - 1)}…` : flat
          const human = entry.label === "me"
          return {
            title: human ? " " : `  ${preview}`,
            truncateTitle: false,
            description: human ? preview : undefined,
            footer: `${entry.when.padStart(whenWidth)} ${entry.label}`,
            footerColor: human ? humanColor : robotColor,
            value: entry.id,
          }
        }),
        search: (query: string, options: any[]) => {
          const needle = query.trim().toLowerCase()
          if (!needle) return options
          return options.filter((option) => textById.get(option.value)?.includes(needle))
        },
      })
      context.ui.dialog.set({ size: DIALOG_SIZE })
      const picked = await pending
      if (!picked) return

      const entry = entries.find((item) => item.id === picked)
      if (!entry) return
      const copied = await writeClipboard(context, entry.text)
      context.ui.toast.show({
        variant: copied ? "success" : "error",
        message: copied ? "Message copied" : "Clipboard unavailable",
      })
    }

    context.keymap.layer(() => ({
      mode: "global",
      commands: [
        {
          id: "copy-message.select",
          title: "Copy message from history",
          group: "Session",
          bind: "<leader>shift+y",
          palette: true,
          slash: { name: "copy-message" },
          run: () =>
            void run().catch((error) =>
              context.ui.toast.show({
                variant: "error",
                message: `Copy message failed: ${error instanceof Error ? error.message : String(error)}`,
              }),
            ),
        },
      ],
      bindings: ["copy-message.select"],
    }))
  },
})
