# Material Recipe Box

A beautifully modernized, serverless Recipe application built with Tailwind CSS and Material Design 3. Instead of relying on a centralized database, your recipes are securely stored in a private, hidden folder within your very own Google Drive using the Nook ecosystem.

## 🚀 Features

- **Google Drive Storage**: Absolute privacy. Your data stays natively on your own Google Drive using the `appDataFolder`.
- **Serverless Authentication**: A fully persistent Google Identity Services flow that utilizes Vercel Serverless `/api/login` and `/api/refresh` endpoints to distribute secure `HttpOnly` refresh cookies.
- **Rich Media Support**: Upload beautiful cover photos and heavy video walkthroughs smoothly.
- **Seamless Local Experience**: Because media Blob Objects are created efficiently in the browser, everything loads fast. Memory is automatically garbage collected on navigation.

---

## 🛠 Nook Ecosystem Integration

This browser application relies heavily on two lightweight, localized packages to facilitate database-like interactions flawlessly over Google Drive.

### 1. `@ashish-um/nook` (JSON Metadata)
Using the `DriveCRUD` engine, standard textual recipe components are stored directly into simple JSON blobs on your Drive.
- **Why it's used:** Manages the structured schema of recipes (title, lists of ingredients, text steps, and referencing filenames of binary media). 
- **Operations:** Performs real-time list fetching, mapping, schema validation, and CRUD actions for your lightweight text metadata.

### 2. `@ashish-um/nook-files` (Binary File Storage)
Using the `DriveFiles` engine, large unstructured files are routed into Drive safely.
- **Why it's used:** Recipes aren't just text. They require rich media like high-res cover photos and heavy video recordings.
- **Operations:** Facilitates resumable, chunked-uploads for these huge binary files directly to Google Drive so your browser doesn't crash during upload. It fetches media dynamically via Object URLs (`getBlobURL`), handling bytes stream securely.

By coordinating both packages asynchronously, uploading a new file involves:
1. Reserving an ID via `DriveCRUD`.
2. Paralleling photo/video binary uploads gracefully via `DriveFiles`.
3. Updating the initial JSON metadata dynamically after binary processing finalizes.

---

## 💻 Tech Stack
- **Frontend Layer**: Vanilla HTML5 + JavaScript Modules (`ESM`)
- **Styling**: TailwindCSS via CDN (Material Design 3 paradigm)
- **Backend API**: Vercel Serverless Edge Functions (`req, res` Lambda architecture)

## 🌎 Deployment Setup (Vercel)

If you're cloning this repository to run yourself, ensure it's hosted via Vercel.

1. **Deploy to Vercel**: Import this GitHub project to Vercel.
2. **Environment Variables**: Head to Vercel Dashboard Settings and define these:
   - `VITE_GOOGLE_CLIENT_ID` = `YOUR_OAUTH2_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET` = `YOUR_CLIENT_SECRET`
3. **Google API Credentials**: Ensure your deployed Vercel URL has been added to your Google Cloud Console OAuth 2.0 authorized **JavaScript origins**.
