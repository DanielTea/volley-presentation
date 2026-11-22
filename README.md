# Volley v17 · SPS 2026 presentation

The web page for Control-F's **Volley v17**, a spiking neural network that reads language and live telemetry as one
unbroken stream, learns during inference per asset and per stream, and answers predictive-maintenance questions.
It is built for SPS 2026 (Messezentrum Nürnberg, 24–26 November 2026).

Once GitHub Pages is on, the page is served at **https://danieltea.github.io/volley-presentation/**.

## What the page shows

1. **Architecture.** An interactive diagram of the spike-only stack: telemetry and byte encoders, the 512-channel
   spike stream, eleven levels of state reads and threshold cells, output neurons, and the per-asset memory capsule
   (read tape and fast synapses). Every part is tagged *Measured · v16* or *New in v17*. **Auto-tour** steps through it.
2. **Streaming.** Why a stream beats a window for telemetry, with two charts drawn from the research records: learned
   power-law forgetting (with a slope slider) and the fast-synapse gain growing as the square root of the text read.
3. **Industrial AI.** The loop of sense, predict, surprise, teach and answer, with surprise as the anomaly score.
4. **Asset console.** Three simulated assets with four streams each. Inject a fault, see which stream Volley flags first,
   and ask about status, root cause, maintenance timing and what the capsule has learned.
5. **Measured.** The enwik8 scores of every release from v11 to v16 against a same-size Transformer.
6. **Roadmap** and a pilot call to action.

## Turn on GitHub Pages

Settings → Pages → *Build and deployment* → Source: **Deploy from a branch** → Branch: **main**, folder **/ (root)** → Save.
The site is plain HTML, CSS and JavaScript with no build step. `.nojekyll` makes Pages serve the files unchanged.

## Booth mode

Open the page with `?kiosk` at the end, for example `https://danieltea.github.io/volley-presentation/?kiosk`. The
architecture diagram tours itself, and the asset console injects faults, asks its questions, repairs the asset and moves
to the next one. A visitor's click pauses the console's autoplay for 45 seconds. The **Booth autoplay** switch on the
console does the same without the URL flag.

## Run locally

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Files

| Path | Holds |
|---|---|
| `index.html` | All content and the architecture diagram (inline SVG) |
| `assets/css/style.css` | Design tokens, layout, responsive rules |
| `assets/js/main.js` | Hero animation, diagram interaction, charts, and the asset-console simulation |
| `assets/img/` | Favicon and the social preview image |

## Where the numbers come from

Every language number on the page comes from the ShuntFormer research repository,
[DanielTea/transformer-snn](https://github.com/DanielTea/transformer-snn): the
[v16 model card](https://github.com/DanielTea/transformer-snn/blob/main/models/spiking-byte-lm-v16/README.md),
[Long streams](https://github.com/DanielTea/transformer-snn/blob/main/docs/LONG_STREAMS.md),
[Stream form](https://github.com/DanielTea/transformer-snn/blob/main/docs/STREAM_FORM.md) and
`results/event_lm/long_streams/reading_curve.json`. The telemetry parts describe the v17 design. The asset console is a
browser simulation: its signals, its learning model and its answers are scripted, and the page says so wherever they appear.
