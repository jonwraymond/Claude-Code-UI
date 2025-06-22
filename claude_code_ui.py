"""Simple drag and drop UI for interacting with Claude Code via the Anthropics SDK."""

import tkinter as tk
from tkinter import scrolledtext, filedialog, messagebox

# TkinterDnD2 is an optional library that provides drag and drop support.
try:
    from TkinterDnD2 import DND_FILES, TkinterDnD
except Exception:  # pragma: no cover - optional dependency
    TkinterDnD = tk.Tk
    DND_FILES = 'DND_Files'

import anthropic

class ClaudeCodeUI:
    def __init__(self):
        self.root = TkinterDnD()
        self.root.title("Claude Code UI")

        # API key entry
        tk.Label(self.root, text="API Key").pack(anchor="w")
        self.api_entry = tk.Entry(self.root, show="*")
        self.api_entry.pack(fill="x")

        # Model selection
        tk.Label(self.root, text="Model").pack(anchor="w")
        self.model_var = tk.StringVar(value="claude-3-opus-20240229")
        tk.Entry(self.root, textvariable=self.model_var).pack(fill="x")

        # Server (MCP server) entry
        tk.Label(self.root, text="Server").pack(anchor="w")
        self.server_var = tk.StringVar(value="https://api.anthropic.com")
        tk.Entry(self.root, textvariable=self.server_var).pack(fill="x")

        # Memory setting
        tk.Label(self.root, text="Memory (tokens)").pack(anchor="w")
        self.memory_var = tk.IntVar(value=8000)
        tk.Entry(self.root, textvariable=self.memory_var).pack(fill="x")

        tk.Label(self.root, text="Code or Prompt").pack(anchor="w")
        self.text_area = scrolledtext.ScrolledText(self.root, wrap=tk.WORD, height=15)
        self.text_area.pack(fill="both", expand=True)
        self.text_area.drop_target_register(DND_FILES)
        self.text_area.dnd_bind('<<Drop>>', self.drop)

        tk.Button(self.root, text="Send to Claude", command=self.send).pack(pady=5)
        self.output = scrolledtext.ScrolledText(self.root, wrap=tk.WORD, height=10, state='disabled')
        self.output.pack(fill="both", expand=True)

    def drop(self, event):
        """Handle dropping files onto the text area."""
        paths = self.root.tk.splitlist(event.data)
        for path in paths:
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    self.text_area.insert(tk.END, f"\n\n# File: {path}\n" + f.read())
            except OSError as exc:  # pragma: no cover - user facing message
                messagebox.showerror("File Error", str(exc))

    def send(self):
        """Send the text to the Claude API and display the response."""
        api_key = self.api_entry.get().strip()
        if not api_key:
            messagebox.showwarning("Missing API key", "Please provide your API key")
            return
        client = anthropic.Anthropic(api_key=api_key, base_url=self.server_var.get())
        try:
            response = client.messages.create(
                model=self.model_var.get(),
                max_tokens=self.memory_var.get(),
                messages=[{"role": "user", "content": self.text_area.get("1.0", tk.END)}]
            )
            content = response.content[0].text if response.content else ""
            self.output.config(state='normal')
            self.output.delete("1.0", tk.END)
            self.output.insert(tk.END, content)
            self.output.config(state='disabled')
        except Exception as exc:  # pragma: no cover - user facing message
            messagebox.showerror("Error", str(exc))

    def run(self):
        self.root.mainloop()


def main() -> None:
    ClaudeCodeUI().run()


if __name__ == "__main__":
    main()
