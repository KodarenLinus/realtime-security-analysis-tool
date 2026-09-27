# Realtime Security Analysis Tool

A VS Code plugin that checks your code for potential security risks as you write it.

It's built for instant feedback, not deep analysis. The goal is to make you stop and think about the decision you're making while you're making it: thinking is a crucial part of building software, and this plugin helps you spot potential exploits early.

The plugin works with "system one" decision models: [Laya](https://huggingface.co/convaiinnovations/laya) (open source, runs locally) or TypeSafe's Jev (hosted, needs an API key). Both use the same API, so switching between them only means changing the server URL and key.

## Requirements

- VS Code
- Node.js 20 or newer
- For local Laya: Python 3.10 or newer, and about 1 GB of free disk space for the model
- For Jev: a TypeSafe API key instead of the Python setup

## Setup

### 1. Install Laya (first time only)

This creates a virtual environment in the project folder and installs Laya with its HTTP server.

**Windows (PowerShell)**

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -U "laya[serve]"
```

**macOS (bash/zsh)**

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -U "laya[serve]"
```

### 2. Install the Node dependencies

```bash
npm install
```

### 3. Start the Laya server

Run this in its own terminal and leave it running. The first start downloads the model (about 800 MB), so it takes a while.

**Windows (PowerShell)**

```powershell
.\.venv\Scripts\Activate.ps1
$env:LAYA_API_KEY = "changeme"
$env:LAYA_PRELOAD = "1"
$env:USE_TF = "0"
laya-serve
```

**macOS (bash/zsh)**

```bash
source .venv/bin/activate
LAYA_API_KEY=changeme LAYA_PRELOAD=1 USE_TF=0 laya-serve
```

The server listens on `http://localhost:8000`. What the variables do:

- `LAYA_API_KEY` requires clients to send this key. Always set it: without a key the server accepts requests from your whole network.
- `LAYA_PRELOAD=1` loads the model at startup, so the first request isn't slow.
- `USE_TF=0` prevents a hang when TensorFlow is also installed.
- Optional: add `LAYA_DEVICE=cuda` if you have an NVIDIA GPU.

Replace `changeme` with your own key, and use the same key in the plugin. Never commit a real key; keep it in `.env`, which is git-ignored.

### 4. Check that it works

With the server running, open a second terminal and run the test script:

```bash
npx tsx api-ai/test.ts
```

You should get JSON back with `answers.risk.choice` set to `risky` or `safe`.

## Using Jev instead of Laya

Skip steps 1 and 3. Point the client's `url` at the TypeSafe Jev API and set `apiKey` to your TypeSafe key. Everything else stays the same.

## Project structure

```
api-ai/
  laya/client.ts   HTTP client that calls the model (POST /v1/systemone)
  types.ts         Question and response types
  config.ts        Test script for checking the connection
```

## How the model answers

Each check sends a code snippet plus a question, and gets back a typed answer:

- `choice`: the selected option, e.g. `risky` or `safe`
- `probabilities`: the probability of each option
- `confidence`: how reliable the model thinks its answer is. Filter on this value before showing a warning; low confidence means the answer shouldn't be trusted.
- `answer_confidence`: the probability of the chosen option (same as in `probabilities`)
- `action.act_probability`: currently carries no useful signal, ignore it

## Known limitations

- **Laya needs fine-tuning to perform well.** The base model isn't trained on code, so zero-shot answers are unreliable (in testing it rated an obvious SQL injection as `safe`, though with low `confidence`). Collect labelled examples of vulnerable and safe code and fine-tune with the [official notebook](https://github.com/NandhaKishorM/laya/blob/main/notebooks/laya_finetune_typed_decisions_2xT4_kaggle.ipynb).
- **Short context.** The English model reads roughly 300 tokens of code per request, so scan one function or small block at a time, not whole files.
- **Keep option lists short.** All options in a question share a fixed token budget, so accuracy drops with many options.
- **Specific wording helps.** Describe each option concretely, e.g. `"user input concatenated into a SQL query string"` rather than just `"risky"`.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `pip` is not recognized (Windows) | Use `py -m pip`, or activate the venv first. If `py` is missing too, install Python with `winget install Python.Python.3.12` and reopen PowerShell. |
| "Running scripts is disabled" when activating the venv | Run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once. |
| `python` opens the Microsoft Store | Turn off the python.exe aliases under Settings › Apps › Advanced app settings › App execution aliases. |
| Server hangs while loading the model | Make sure `USE_TF=0` is set. |
| "could not connect" | The server isn't running, or is on a different port. |
| HTTP 401 | The key in the client doesn't match `LAYA_API_KEY`. |
| Request times out | The model is probably still loading. Wait, or raise `timeout` while testing. |
| "Top-level await is not supported" | Wrap test code in an `async function main()` and call `main()`. |
| Environment variables are gone | PowerShell `$env:` variables only last for the current window; set them again. |

## Documentation

- [Laya model card](https://huggingface.co/convaiinnovations/laya): setup, self-hosting, limits
- [Laya API reference](https://nandhakishorm.github.io/laya/reference/): all question types and response fields
- [Laya on GitHub](https://github.com/NandhaKishorM/laya): install details per platform