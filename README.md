# API Boilerplate

## 🚀 Quick Start

1. Create a new project on GitHub

2. Copy and paste the files from the Boilerplate into your project

3. Replace all `[boilerplate_name]` with your project's name

4. Replace index.html information with your project's information

### API Installation

1. Install the dependencies

   ```bash
   cd api
   npm install
   ```

2. Create your database on Clever Cloud

   - Create a MongoDB add-on
   - Retrieve the MongoDB connection URI from the add-on information
   - Insert the URI into your `.env` file:

3. Configure Sentry

   In `api/src/services/sentry.js`, add your Sentry DSN:

   ```javascript
   Sentry.init({
     dsn: "your-sentry-dsn",
     environment: "server",
   });
   ```

4. Start the server

   ```bash
   cd api
   npm run dev
   ```

---

### APP Installation

1. Install the dependencies

   ```bash
   cd app
   npm install
   ```

2. Configure Sentry

   In `app/src/config.js`, add your Sentry DSN:

   ```javascript
   const SENTRY_URL = 'YOUR_SENTRY_URL'
   ```

3. Start the server

   ```bash
   cd app
   npm run dev
   ```

---

Write with ❤️ by Léopold
