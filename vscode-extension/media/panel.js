document.getElementById('send').addEventListener('click', send);
const vscode = acquireVsCodeApi();
const input = document.getElementById('input');
const output = document.getElementById('output');

function send() {
  vscode.postMessage({ command: 'send', text: input.value });
}

document.addEventListener('drop', (ev) => {
  ev.preventDefault();
  for (const item of ev.dataTransfer.files) {
    vscode.postMessage({ command: 'drop', path: item.path });
  }
});

document.addEventListener('dragover', ev => ev.preventDefault());

window.addEventListener('message', event => {
  const msg = event.data;
  if (msg.type === 'file') {
    input.value += `\n\n# File: ${msg.name}\n` + msg.text;
  } else if (msg.type === 'response') {
    output.textContent = msg.text;
  } else if (msg.type === 'error') {
    output.textContent = 'Error: ' + msg.text;
  }
});
