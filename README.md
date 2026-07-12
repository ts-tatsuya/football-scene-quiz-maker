# ⚽Football Scene Quiz Maker⚽

A web app specially developed for [United Hacks v7](https://unitedhacksv7.devpost.com/) "Theme Track: Sports" which is an app to make and play a football scene quiz.

It uses YOLO26 AI model to help generating cover silhouette for the image being used.

## 👆Interaction

1. **Create** — User able to create quiz deck contain of multiple quiz/questions by uploading football scene image for each quiz and adding question text and answer field.
2. **Play** — User can play the quiz deck that are created or importing a quiz deck data. Answer all question in the deck by filling the answer field correctly. At the end of the game, player will be given score based on their answer.

All quizzes are stored in browser localStorage — no database or account needed.

## ⚙️How it works

**🏭Create Quiz System Process🏭**

1. User will create a quiz deck containing multiple quiz by uploading image and input question(optional) and answer fields for each quiz.
2. AI will determine the silhouette cover for each quiz (the player and the ball)
3. Quiz deck data created and saved on browser storage
4. Export quiz to file (optional)

**💯Quiz Scoring System💯**

Player will get a score based on following criteria:
- All answer field in a quiz being filled correctly = +1pt
- Only some answer filled in a quiz being filled correctly = +0.5pt
- Among the filled answer in a quiz, there is correct answer but being put in a wrong field = +0.25pt
- Otherwise = +0pt

## 🛠️Tech stack

📜Programming Language
- Python
- HTML, CSS, Javascript

🧱Framework
- Flask

🤖AI Model
- YOLO26 Segmentation Model

## 📋Prerequisite

- Python 3.9+

Install dependency
```bash
pip install -r requirements.txt
```

## 🚀Setup

Run development server
```bash
python app.py
```

Then open `http://localhost:5000`.

## 📄About FSQ File (.fsq)

A `.fsq` file is just a ZIP file with custom extension name containing:

- `quiz.json` — quiz metadata and question definitions (image filenames, mask filenames, answer fields)
- `img_N.jpg` — original images
- `human_N.png` — human segmentation masks
- `ball_N.png` — ball segmentation masks

## 🔊Sound effect used

All sound effect being used are downloaded from [DOVA-SYNDROME](https://dova-s.jp/)

