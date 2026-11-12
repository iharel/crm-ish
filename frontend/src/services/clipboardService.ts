/** clipboardService — wraps the browser Clipboard API. */
export const clipboardService = {
  async copy(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      return false
    }
  },
}
