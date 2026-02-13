# VoxLab - AI Public Speaking Coach

VoxLab is a Next.js application designed to help users improve their public speaking skills through AI-driven analysis of their voice, content, and body language.

## Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (Version 18 or higher recommended)
- [npm](https://www.npmjs.com/) (usually comes with Node.js) or [yarn](https://yarnpkg.com/)

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/voxlab.git
cd voxlab
```

### 2. Install dependencies

```bash
npm install
# or
yarn install
```

### 3. Environment Configuration

Create a `.env.local` file in the root directory and add your Firebase configuration keys. You can find these in your Firebase Project Settings.

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

> **Note:** The application will fail to build or run correctly without these environment variables.

### 4. Run the Development Server

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Features

- **AI Analysis**: Real-time feedback on pacing, filler words, and sentiment.
- **Authentication**: Secure login and registration via Firebase Auth.
- **Dashboard**: Track your progress over time with detailed analytics.
- **Responsive Design**: Modern, glassmorphism UI built with Tailwind CSS.

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Authentication**: [Firebase](https://firebase.google.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
