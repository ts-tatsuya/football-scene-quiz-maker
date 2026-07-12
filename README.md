# Football Scene Quiz Maker

A web app that uses YOLO segmentation to automatically detect players and the ball in football images, then turns them into interactive silhouette-based quizzes.

Upload a match photo, and the app generates two masks — one for humans (players, referees, staff) and one for the ball. These masks are used as semi-transparent colored overlays during the quiz. Players answer questions about the scene (e.g. "Which team is attacking?", "Who scored?") while the silhouettes provide visual hints. After confirming an answer, the silhouettes disappear to reveal the full image.

## How it works

1. **Create** — upload football images, add answer fields (label + correct answer). The server runs YOLO segmentation to extract human and ball masks.
2. **Play** — questions show the image with red highlights on humans and cyan on the ball. Type your answers, then confirm to reveal the original image and see if you were right.
3. **Score** — each question is scored: 1 for fully correct, 0.5 for partial, 0.25 if the right answer exists but in the wrong field, 0 otherwise.

All quizzes are stored in browser localStorage — no database or account needed.

## Tech stack

- **Backend:** Flask + Ultralytics YOLO + OpenCV
- **Frontend:** Vanilla JS, Canvas API
- **Storage:** Browser localStorage, `.fsq` files (ZIP with JSON manifest + images/masks)

## Requirements

- Python 3.9+
- [YOLO segmentation model](https://docs.ultralytics.com/tasks/segment/) — place a `.pt` file in `models/` (e.g. `yolo26n-seg.pt`)

## Setup

```bash
pip install -r requirements.txt
python app.py
```

Then open `http://localhost:5000`.

## File format (.fsq)

A `.fsq` file is a ZIP containing:

- `quiz.json` — quiz metadata and question definitions (image filenames, mask filenames, answer fields)
- `img_N.jpg` — original images
- `human_N.png` — human segmentation masks
- `ball_N.png` — ball segmentation masks

## Sound effect used

All sound effect being used are downloaded from [DOVA-SYNDROME](https://dova-s.jp/)

