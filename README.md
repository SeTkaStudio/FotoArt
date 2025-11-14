
<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally and deploy it to Vercel.

View your app in AI Studio: https://ai.studio/apps/drive/1cBPyBT-QHYeddKcAz79URAgGEbMoVOIt

## Run Locally

**Prerequisites:** Node.js

1.  Install dependencies:
    `npm install`
2.  Create a `.env` file in the root of your project and set the `VITE_GEMINI_API_KEY` variable to your Gemini API key.
    ```
    VITE_GEMINI_API_KEY="YOUR_API_KEY_HERE"
    ```
3.  Run the app:
    `npm run dev`

## Deploy to Vercel

You can deploy this application to Vercel to get a shareable public URL.

1.  **Fork the Repository**: Fork this repository to your own GitHub account.
2.  **Create a Vercel Project**: Go to your Vercel dashboard and create a new project.
3.  **Import GitHub Repository**: Import the repository you just forked.
4.  **Configure Project**: Vercel should automatically detect that this is a Vite project and configure the build settings correctly.
5.  **Add Environment Variable**: In the project settings on Vercel, go to "Environment Variables" and add a new variable:
    -   **Name**: `VITE_GEMINI_API_KEY`
    -   **Value**: Paste your Gemini API key here.
6.  **Deploy**: Click the "Deploy" button. Vercel will build and deploy your application.
