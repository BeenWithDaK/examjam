# Exam Jam Chess

The exammiest, jammiest game around.

Exam Jam Chess is a static browser game for studying while playing chess. It supports face-to-face tablet play for two players and a one-player mode against Caldi. Human moves are gated by study questions from US History, Chemistry, or Geometry Algebra.

In solo mode, Caldi appears above the board with sprite expressions and reactive chess commentary.

## Run Locally

```sh
npm install
npm run dev
```

Then open the local URL Vite prints, usually `http://127.0.0.1:5173/`.

## Build

```sh
npm run build
```

The static site is written to `dist/`.

## Deploy

This project is static and uses relative asset paths, so it works on GitHub Pages and Cloudflare Pages.

- GitHub Pages build command: `npm run build`
- GitHub Pages output directory: `dist`
- Cloudflare Pages build command: `npm run build`
- Cloudflare Pages output directory: `dist`

## Edit Questions

Questions live in `src/questions.json`.

Each question has:

- `id`: stable unique ID
- `topic`: `history`, `chemistry`, or `geometry`
- `unit`: short unit label
- `prompt`: question text
- `choices`: answer choices
- `answerIndex`: zero-based index of the correct choice
- `explanation`: optional feedback after answering
- `graph`: optional coordinate graph for algebra questions

Missed questions are automatically relooped during play with the `Let's try again` chip.
