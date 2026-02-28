<h1 align="center">VoxLab — AI Public Speaking Coach</h1>

<p align="center">
  <strong>An AI-powered platform that provides real-time, multi-modal feedback to help anyone become a confident and effective public speaker.</strong>
</p>

<p align="center">
  <em><b>Vox</b> — "Voice" in Latin</em> · <em><b>Lab</b> — A space for experiment and enhancement</em><br/>
</p>

<p align="center">
  <a href="#-key-features">Features</a> •
  <a href="#%EF%B8%8F-technologies-used">Tech Stack</a> •
  <a href="#%EF%B8%8F-implementation-details--innovation">Architecture</a> •
  <a href="#-installation--setup">Setup</a> •
  <a href="#-user-testing">User Testing</a> •
  <a href="#%EF%B8%8F-future-roadmap">Roadmap</a>
</p>

---

## 👥 Team Introduction

<img width="1919" height="1079" alt="image" src="https://github.com/user-attachments/assets/2dfd5e91-b4b8-4496-bf79-f400800b638b" />

| Name | Role | Responsibilities |
|------|------|------------------|
| Chun Yao Ting | Project Lead / Full Stack Developer | System Architecture, AI Integration, Feature Design, Cloud Infrastructure |
| Angela Ngu Xin Yi | Frontend Developer | UI/UX Implementation, Component Development, Responsive Design, Animations |
| Tay Xin Ying | Backend Developer | API Development, Server Actions, WebSocket Server, Database Schema |
| Wong Zi Ning | ML / AI Engineer | MediaPipe Integration, Gemini Prompt Engineering, Analysis Pipeline |

---

## 📖 Project Overview

### Problem Statement

Effective public speaking skills are critical for professional and academic success. However, traditional coaching is not only **prohibitively expensive** but also **inflexible** in time and location. This leaves individuals forced to practice in isolation, without actionable insights on their pacing, posture, or content delivery — resulting in persistent anxiety, poor performance and missed opportunities.

### SDG Alignment

VoxLab directly supports **UN Sustainable Development Goal 4 — Quality Education**:

| SDG Target | How VoxLab Contributes |
|------------|------------------------|
| **SDG 4 — Quality Education (Target 4.4)** — *"By 2030, substantially increase the number of youth and adults who have relevant skills, including technical and vocational skills, for employment, decent jobs and entrepreneurship."* | VoxLab helps users master interviews and presentations, equipping them with the practical, vocational communication skills they need to land decent jobs and succeed in their careers. |
| **SDG 4 — Quality Education (Target 4.3)** — *"By 2030, ensure equal access for all women and men to affordable and quality technical, vocational and tertiary education, including university."* | VoxLab provides 24/7, high-quality feedback at near-zero cost to the user, ensuring that a student in a remote area has the same access to world-class coaching as an executive in a boardroom. |
| **SDG 8 — Decent Work & Economic Growth** | Strong communication is a critical workforce skill. VoxLab helps job seekers ace interviews and professionals deliver confident presentations, directly contributing to employability and economic productivity. |
| **SDG 10 — Reduced Inequalities** | Democratises access to expert-level public speaking feedback that was previously only available to those who could afford private coaches, bridging the gap between privileged and underserved communities. |

### Solution Description

**VoxLab** is a web-based AI coaching platform that analyses a speaker's performance across three dimensions simultaneously:

1. **Vocal Analysis** — Real-time speech transcription, pacing (WPM), filler word detection, pause analysis, pitch tracking and volume dynamics via Google Cloud Speech-to-Text and Web Audio API.
2. **Visual Presence Analysis** — Posture stability, body language, facial engagement, eye contact and expression detection using MediaPipe pose and face landmark models running client-side.
3. **Content Analysis** — AI-powered evaluation of speech structure, topic relevance and delivery quality using Google Gemini via Vertex AI.

Users receive instant, actionable feedback during practice sessions and a comprehensive AI-generated coaching report at the end of each session — all from their browser with nothing more than a webcam and microphone.

---

## ✨ Key Features

### Core Practice Modes

| Mode | Description |
|------|-------------|
| **Practice Mode** | Full AI-guided speech training with real-time feedback on voice, content, posture and facial expression. |
| **Presentation Lab** | Upload slides (PDF) and rehearse with AI coaching. Slide viewer with picture-in-picture webcam overlay. |
| **Lecture Lab** | Practice teaching with uploaded lecture materials. AI provides contextual feedback on delivery and content coverage. |
| **Interview Lab** | AI-generated behavioural interview questions based on your resume. Includes follow-up questions, TTS interviewer voice and comprehensive evaluation. |
| **Analysis Mode** | Pure visual presence coaching — facial engagement and posture analysis without speech transcription. |

### Real-Time Feedback

- 🎙️ **Speech Coach Widget** — Live WPM counter, filler word detection and elapsed time display
- 🧍 **Posture Corrections** — Animated correction guides for head tilt, shoulder alignment, slouching and excessive movement
- 😊 **Facial Engagement** — Eye contact tracking, smile detection and engagement scoring
- ⚠️ **Stress & Nervousness Detection** — High blink rate and fidgeting alerts with calming prompts

### AI-Powered Reports

- 📊 **Detailed Session Report** — Comprehensive post-session analysis with vocal dynamics, posture breakdown and content evaluation
- 🤖 **Gemini AI Coach Summary** — Personalised tips, strengths and actionable improvement areas generated by Google Gemini
- 📈 **Visual Charts** — WPM timeline, pitch/volume graphs and posture stability metrics via Recharts

### Community & Gamification

- 💬 **Speaker's Collective Forum** — Share practice sessions, exchange tips and engage with the community
- 🏆 **Badges & Streaks** — Achievement system with daily practice streaks and milestone badges
- 🔔 **Notifications** — Real-time notifications for community interactions
- 📤 **Session Sharing** — Share detailed session reports including Q&A breakdowns to the forum

### Additional Features

- 🗣️ **Text-to-Speech** — High-quality Google Cloud TTS for AI interviewer voice and question narration
- 📹 **Session Recording** — Automatic video recording with cloud storage for session replay
- 📄 **PDF Export** — Export session reports as PDF documents
- 🌐 **Q&A Generation** — AI-generated audience questions for presentation and interview practice

---

## 🛠️ Technologies Used

### Google Cloud Technologies

| Technology | Purpose |
|------------|---------|
| **Google Gemini (via Vertex AI)** | Core AI engine for session analysis, interview question generation, content evaluation, vocal coaching, posture feedback and visual presence scoring. Uses `gemini-2.5-flash` for real-time coaching and structured AI output via `generateObject`. |
| **Google Cloud Speech-to-Text** | Real-time speech recognition via WebSocket streaming. Powers live transcription, WPM calculation, filler word detection and pause analysis. Chirp 2 model is used due to its great accuracy with content prediction, and enable auto punctuation for pause analysis, as well as given timestamp function can help us identify WPM and filler words frequencies.|
| **Google Cloud Text-to-Speech** | Natural-sounding voice synthesis for the AI interviewer, question narration and interactive coaching prompts. |
| **Google Cloud Storage (GCS)** | Stores session recordings (video) and full AI-generated reports (JSON) with signed URLs for secure retrieval. |
| **Firebase Authentication** | Google and email/password sign-in with session persistence and user profile management. |
| **Firebase Firestore** | NoSQL database for user profiles, practice session history, streak tracking, badge achievements, forum posts, comments, likes and notifications. |
| **Vercel AI SDK (`ai`, `@ai-sdk/google-vertex`)** | Unified interface for calling Gemini models with structured output schemas (Zod), enabling type-safe AI responses throughout the application. |

### ML & Computer Vision

| Technology | Purpose |
|------------|---------|
| **MediaPipe Vision (Pose Landmarker)** | Client-side pose estimation for real-time posture analysis — detects slouching, head tilt, shoulder alignment and excessive movement. |
| **MediaPipe Vision (Face Landmarker)** | Client-side facial landmark detection for eye contact tracking, smile detection, blink rate analysis and engagement scoring. |

### Supporting Libraries & Tools

| Library | Purpose |
|---------|---------|
| **Next.js 16** | Full-stack React framework with App Router, Server Actions and API routes |
| **React 19** | UI framework with concurrent features |
| **TypeScript** | Type-safe development across the entire codebase |
| **Tailwind CSS 4** | Utility-first styling with custom design tokens (dark purple theme) |
| **Framer Motion** | Smooth animations for UI transitions, posture correction guides and feedback overlays |
| **Zustand** | Lightweight state management for cross-component data sharing |
| **Recharts** | Data visualisation for WPM timelines, pitch/volume charts and score breakdowns |
| **Radix UI (shadcn/ui)** | Accessible, composable UI primitives (buttons, avatars, cards) |
| **Pitchfinder** | Client-side pitch detection algorithm for vocal analysis |
| **Web Audio API** | Real-time audio stream processing for volume and pitch sampling |
| **WebSocket (`ws`)** | Custom WebSocket server bridging browser audio to Google Cloud Speech-to-Text |
| **jsPDF + html-to-image** | Client-side PDF report generation from session data |
| **Lucide React** | Consistent icon system throughout the UI |
| **SWR** | Data fetching and caching for API calls |

---

## 🏗️ Implementation Details & Innovation

### System Architecture

![Voxlab Architecture Diagram (1)](https://github.com/user-attachments/assets/181b8363-f2b0-474d-8981-d3653d88d716)

### Innovation Highlights

1. **Client-Side ML Processing** — MediaPipe pose and face landmark models run entirely in the browser, enabling real-time visual analysis without sending video to the cloud. This reduces latency and preserves user privacy.

2. **Multi-Modal Simultaneous Analysis** — VoxLab analyses vocal, visual and content dimensions simultaneously during a single session, providing a holistic coaching experience that mirrors what a human coach would observe.

3. **Structured AI Output** — Using the Vercel AI SDK's `generateObject` with Zod schemas, all AI responses are type-safe and structured, enabling reliable programmatic consumption of Gemini's analysis.

4. **WebSocket Speech Pipeline** — A custom WebSocket server bridges the browser's audio stream to Google Cloud Speech-to-Text, enabling low-latency, continuous transcription with interim results.

5. **Progressive Posture Corrections** — Instead of overwhelming users with all posture issues at once, VoxLab displays corrections two at a time with animated guides. As issues are resolved, the next pending correction appears automatically.

### Workflow

```
User opens VoxLab → Selects a mode (Practice / Presentation / Interview / Lecture / Analysis)
       │
       ▼
   Setup Phase → Configure session (topic, slides, resume, etc.)
       │
       ▼
   Session Start → Camera + Microphone activated
       │
       ├── MediaPipe (Client) ──→ Posture + Facial analysis in real-time
       ├── WebSocket ──→ Google Speech-to-Text ──→ Live transcript + WPM
       ├── Web Audio API (Client) ──→ Pitch + Volume sampling
       └── Feedback Overlay ──→ Nervousness / Distraction / Stress alerts
       │
       ▼
   Session End → All metrics collected
       │
       ├── Server Action: analyzeSession() ──→ Gemini AI Coach Report
       ├── Server Action: analyzeVocal() ──→ Vocal Performance Report
       ├── Server Action: analyzePosture() ──→ Posture & Visual Report
       └── GCS Upload ──→ Video recording + Full report JSON
       │
       ▼
   Results → Detailed Session Report with AI tips + charts
       │
       ├── Save to Firestore (history, streaks, badges)
       ├── Export as PDF
       └── Share to Forum
```

---

## 🚧 Challenges Faced

| Challenge | Solution |
|-----------|----------|
| **Real-time speech transcription in the browser** | Built a custom WebSocket server that bridges the browser's `MediaRecorder` audio stream to Google Cloud Speech-to-Text's streaming API, handling audio chunk encoding and reconnection gracefully. |
| **MediaPipe model loading and stability** | Implemented robust error handling around TFLite model initialisation to prevent informational console messages from being treated as fatal errors, ensuring stable AI detection across browser sessions. |
| **Multi-modal data synchronisation** | Created `useUnifiedAnalysis` — a unified hook that aggregates posture, facial and feedback state into a single reactive data source, ensuring all UI components stay synchronised. |
| **Cognitive overload from posture corrections** | Implemented a progressive display system that shows only two posture corrections at a time. As the user fixes an issue, the next pending correction appears automatically. |
| **Cumulative vocal metrics across interview questions** | Designed session-aware speech recognition that preserves cumulative WPM history, filler counts and pause statistics across multiple interview questions without resetting. |
| **Monotone detection and human pitch perception** | Human perception of pitch is logarithmic (an octave is a doubling of frequency), so analyzing raw Hertz ranges produces skewed results. Solved this by utilizing Standard Deviation to measure pitch variation rather than raw range, providing a much more accurate reflection of vocal expressiveness versus reading monotonously. |
| **Contextual pause analysis** | Not all speech pauses are negative; pausing for effect or between sentences is proper technique. Solved this by integrating auto-punctuation from the Cloud Speech-to-Text model to identify pause context, classifying them accurately as either intentional (positive) or hesitant (negative) based on grammatical boundaries. |
| **Video recording and cloud upload** | Integrated `MediaRecorder` with signed GCS upload URLs, handling browser codec differences (WebM vs MP4) and implementing timeout fallbacks for reliable recording. |
| **Responsive split-pane session layout** | Developed a consistent split-pane layout system (webcam left, metrics right) using `flex` and `aspect-video` containers that maintain proper proportions from desktop to tablet viewports. |

---

## 🚀 Installation & Setup

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- [npm](https://www.npmjs.com/) (comes with Node.js)
- A Google Cloud project with the following APIs enabled:
  - Vertex AI API
  - Cloud Speech-to-Text API
  - Cloud Text-to-Speech API
  - Cloud Storage API
- A Firebase project with Authentication and Firestore enabled

### 1. Clone the Repository

```bash
git clone https://github.com/yaotingchun/VoxLab.git
cd VoxLab
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env.local` file in the project root:

```env
# Firebase (Client-Side)
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id

# Google AI
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
GOOGLE_GENERATIVE_AI_API_KEY=your_google_ai_api_key

# Google Cloud (Server-Side)
GOOGLE_APPLICATION_CREDENTIALS=./credentials/google.json
GOOGLE_VERTEX_PROJECT=your_gcp_project_id
GOOGLE_VERTEX_LOCATION=us-central1

# WebSocket Server
NEXT_PUBLIC_WS_URL=ws://localhost:3002
```

### 4. Add Google Cloud Credentials

Place your Google Cloud service account JSON key file at:

```
credentials/google.json
```

This file is used for server-side authentication with Vertex AI, Cloud Speech-to-Text, Cloud Text-to-Speech and Cloud Storage.

### 5. Run the Development Server

```bash
npm run dev
```

This starts both the Next.js dev server and the WebSocket server concurrently.

Open [http://localhost:3000](http://localhost:3000) to access VoxLab.

---

## 🧪 User Testing

We recently conducted user testing with **35 participants** to evaluate the effectiveness, usability, and overall satisfaction of VoxLab. The results validate our approach to providing actionable, multi-modal public speaking feedback.

**📊 Key Metrics (35 Responses):**
* **Overall Satisfaction:** ⭐⭐⭐⭐ (4.57 / 5)
* **System Ease of Use:** 🚀 (4.54 / 5)
* **Helpfulness of AI Feedback:** 🧠 (4.57 / 5)

To view our comprehensive user testing results, session recordings and the actionable feedback we collected during our user studies, please reference the dedicated testing report:

👉 **[View the full VoxLab User Testing Report (UserTesing.md)](./UserTesing.md)**

---

## 🗺️ Future Roadmap

### Short-Term (0–6 Months)
- [ ] Multi-language support for speech analysis and AI coaching
- [ ] Mobile-responsive session experience
- [ ] Session comparison — side-by-side replay of past sessions to track improvement
- [ ] Browser-based offline mode for core vocal metrics (WPM and pitch)

### Medium-Term (6–12 Months)
- [ ] Group practice rooms — real-time collaborative practice with peer feedback
- [ ] AI audience simulation — virtual audience reactions based on delivery quality
- [ ] Integration with Google Slides API for native slide import
- [ ] Advanced analytics dashboard with trend analysis and personalised practice plans

### Long-Term (12+ Months)
- [ ] Mobile app (React Native) for on-the-go practice
- [ ] Enterprise tier — team management, organisation-wide analytics and custom AI coaching prompts
- [ ] Speech coaching marketplace — connect with human coaches for hybrid AI + human feedback
- [ ] Accessibility features — sign language detection and closed captioning support

---

<p align="center">
  Voxlab - Experimenting Your Voice
</p>
