# KinoForge — Free Script-to-Video AI Studio

A **100% free, zero-API-key, browser-native Script-to-Video AI Studio** built with React, TypeScript, Vite, Tailwind CSS, HTML5 Canvas, and Web Audio API.

Write a prompt or paste a full script, generate animated storyboards across **16:9**, **9:16**, and **1:1**, customize visuals, captions, color grades, soundtracks, and voiceovers, and **export crisp watermark-free video (`.mp4` / `.webm`) and `.srt` subtitles** straight from your browser.

## Features

- **Script & Prompt to Video**: Turn any idea or pasted full script into timed, multi-scene storyboards across 5 directing styles (*Cinematic Trailer*, *Viral Short / Reel*, *Documentary*, *Product Launch*, *Storytelling*) plus 6 one-click starter templates.
- **Zero-Key Hybrid Visual Engine**:
  - **12 Procedural 60fps Cinema Worlds** (Neon Metropolis, Deep Cosmos, Golden Dawn, Moonlit Ocean, Mystic Forest, Solar Eclipse, Retro Grid, Arctic Aurora, Neural Grid, Storm Horizon, Editorial Stage, Obsidian Ember) — instant, animated, offline-ready.
  - **Free Stock Photography Search** via Wikimedia Commons API (zero API key, CORS-safe for canvas export).
  - **Optional Free AI Image Generation** per scene via Pollinations.ai.
  - **Upload Your Own Photos or Video Clips** (`.png`, `.jpg`, `.webp`, `.mp4`, `.webm`).
- **Camera Choreography, Particles & Color Grading**: Ken Burns camera moves, 6 scene transitions, 8 atmosphere overlays (rain, snow, embers, dust, stars, bokeh, fireflies), 6 color grade LUTs, 35mm film grain, vignette, and 2.39:1 letterbox bars.
- **Kinetic Captions & `.SRT` Export**: Viral word-by-word highlight pills, cinematic lower-third subtitles, minimalist bold display, and typewriter styles.
- **Audio & Voiceover Engine**:
  - 5 royalty-free Web Audio API synthesized ambient soundtracks + transition whoosh SFX baked directly into exported videos.
  - Live browser TTS narration preview with voice, speed, and pitch controls.
  - Built-in **Mic Voiceover Recorder** & audio upload per scene (mixed straight into exported videos).
- **Real Browser Video Export**: Export **720p or 1080p** at **30 or 60 FPS** directly in the browser with zero backend servers and zero watermarks.

## Local Development

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
```

## Push to GitHub & Deploy for Free

### 1. Push to your GitHub repository

```bash
git init
git add .
git commit -m "Initial commit: KinoForge Free Video AI Studio"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

### 2. Free Hosting Options

- **GitHub Pages (Included Workflow):** Open your repo on GitHub → **Settings → Pages → Source → GitHub Actions**. Every push to `main` automatically deploys via `.github/workflows/deploy.yml`.
- **Vercel / Netlify / Cloudflare Pages:** Connect your GitHub repo and use build command `npm run build` with output directory `dist`. Zero environment variables or API keys required.
