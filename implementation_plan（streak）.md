# Streak & Progress Tracker Dashboard Implementation Plan

This plan covers building the requested Duolingo-style Streak Component, the weekly activity grid, and the new Performance Analytics Dashboard inside the `/progress-tracker` route.

## Proposed Changes

### Progress Tracker Page ([src/app/progress-tracker/page.tsx](file:///c:/Users/ASUS/Downloads/VoxLab/VoxLab/src/app/progress-tracker/page.tsx))
- Restructure the page to hold the unified Performance Analytics Dashboard.
- Incorporate the existing [StreakCard](file:///c:/Users/ASUS/Downloads/VoxLab/VoxLab/src/components/ui/StreakCard.tsx#13-117) alongside the new components.
- Use a CSS Grid layout to arrange the Score Cards at the top, followed by the main Line Chart and the AI Coaching Tip, all adopting the Glassmorphism dark aesthetic.

### Score Cards Component ([src/components/ui/ScoreCard.tsx](file:///c:/Users/ASUS/Downloads/VoxLab/VoxLab/src/components/ui/ScoreCard.tsx))
- Create a reusable small Glassmorphism card component to display metrics.
- Props: `title` (e.g., "Vocal", "Posture"), `score` (current value out of 100), `trend` (percentage change), and `isPositive` (boolean to color the trend green/red).
- Display 4 instances for: Vocal, Posture, Content, and Facial Engagement.

### Progress Chart Component ([src/components/ui/ProgressChart.tsx](file:///c:/Users/ASUS/Downloads/VoxLab/VoxLab/src/components/ui/ProgressChart.tsx))
- Integrate `recharts` to render a responsive Line Chart.
- X-Axis: Days of the current month (e.g., 1-30).
- Y-Axis: Score scale from 0 to 100.
- Data Series: 4 separate, distinctively colored lines representing Vocal, Posture, Content, and Facial metrics over time.
- Styling: Dark mode friendly tooltips, grid lines, and smooth monotone curve lines compatible with Recharts.

### AI Coaching Box
- Add a highlighted text area below the chart summarizing the performance graph with the provided text.

## Verification Plan

### Automated/Build Tests
- Ensure `npx tsc --noEmit` and build processes continue to pass after `recharts` integration.

### Manual Verification
1. Navigate to `/progress-tracker`.
2. Verify exactly 4 Score Cards render with respective mock scores and percentage changes.
3. Verify the Line Chart renders correctly with X-axis days and Y-axis scores.
4. Hover over the chart to ensure standard Recharts tooltips display intersection data cleanly in dark mode.
5. Verify responsive behavior across mobile and desktop viewport sizes.

---

# GCS Integration Plan

This phase will sync the real user practice scores directly from the `voxlab-storage` bucket on Google Cloud into the Progress Tracker dashboard.

## Proposed Changes

### Server Action (`src/app/actions/getSessions.ts`)
#### [NEW] `src/app/actions/getSessions.ts`
- Create a Next.js server action to interact with GCS using the existing [src/lib/gcs.ts](file:///c:/Users/ASUS/Downloads/VoxLab/VoxLab/src/lib/gcs.ts) configuration.
- The action will list files in the `sessions/` directory, download them, and parse the JSON.
- It will extract the following specific keys mapping to your requirements:
    - **Date:** `savedAt` (transformed to "D1", "D2", etc. or a readable date for charting)
    - **Vocal Score:** `vocalSummary.score`
    - **Posture Score:** `postureSummary.score`
    - **Overall Score:** `score` (can be used as a fallback)
    - *Note:* Because the GCS file does not contain `Content` or `Facial` scores, the function will temporarily mock these specific two sub-metrics dynamically so that the 4-line Recharts chart you requested remains visually complete.

### Data Consumption ([src/app/progress-tracker/page.tsx](file:///c:/Users/ASUS/Downloads/VoxLab/VoxLab/src/app/progress-tracker/page.tsx))
#### [MODIFY] [src/app/progress-tracker/page.tsx](file:///c:/Users/ASUS/Downloads/VoxLab/VoxLab/src/app/progress-tracker/page.tsx)
- Refactor the page to invoke `getSessions()` on load.
- Calculate the percentage difference mathematically between the *last* chronologically sorted session and the *second-to-last* to derive the real `trend` percentages for the ScoreCards.
- Pass the historical GCS metric array into the `<ProgressChart data={realData} />` and map out the dynamic lines correctly.

## User Review Required
> [!IMPORTANT]
> - The GCS document you shared contains `vocalSummary` and `postureSummary` scores, but lacks explicit `content` and `face` scores. Is it acceptable to use randomized fallback scores for those two until they are officially added to the cloud storage records?
> - Do you want the X-Axis of the chart to be exactly the real calendar dates of the sessions (e.g. "Feb 21"), or roughly standardized as "Day 1", "Day 2"?
