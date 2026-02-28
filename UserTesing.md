# VoxLab User Testing Report

This document contains the results, feedback, and insights gathered from user testing sessions.

## 📊 1. Google Form Statistics

**🌟 At a Glance:**
* **Overall Rating:** ⭐⭐⭐⭐ (4.33 / 5)
* **Ease of Use:** 🚀 (4.33 / 5)
* **AI Feedback Value:** 🧠 (4.17 / 5)
* **Retention:** 🔄 **100% of users** said they would use the tool again!

### 📈 Usage & Demographics
* **Primary Use Cases:** 
  * Casual speaking practice (50%)
  * Lecture/Class presentation (33%)
  * Interview practice (17%)
* **Public Speaking Difficulty (Pre-VoxLab):** Users rated their difficulty at an average of **3.33 / 5**.
* **Top Pre-existing Challenges:**
  1. Nervousness (66%)
  2. Lack of confidence (66%)
  3. Unclear pronunciation (50%)

### 🎯 Feedback Breakdown
* **Most Useful AI Feedback:** 
  * 🎙️ **Vocal:** 66%
  * 📝 **Content:** 50%
  * 🧍 **Posture:** 33%
* **Mode Match:** 100% of users felt the selected mode matched their needs (Yes or Mostly).
* **Highlights (What users loved most):**
  * The **Vocal Analysis** was praised for pointing out specific issues rather than generic advice.
  * **Content Analysis** and sample answers were highly valued for structure.
  * The **Progress Tracker** and **Posture tracking** for excessive movement were great for self-awareness.

---

## 🎥 2. User Testing Videos
*Recordings of user testing sessions categorized by VoxLab's practice modes.*

### 1. Casual Speaking Practice
* **Session Details:** Exploring general speaking and unstructured practice.
* **Video Link:** [Casual Practice Video](https://drive.google.com/drive/folders/14gk0z8uaWJqfdg8QiOsGuoXNwaBY3gGp)

### 2. Interview Practice
* **Session Details:** Testing the structured QA flow and content feedback.
* **Video Link:** [Interview Practice Video](https://drive.google.com/drive/folders/17RuAW9YW9Sjvh3vV3H3zgso9_TghVf_F)

### 3. Class Presentation
* **Session Details:** Interactive, topic-focused delivery for a classroom or peer setting.
* **Video Link:** [Presentation Practice Video](https://drive.google.com/drive/folders/1XXr3OV7cMgDaV5oqWfaVVmTDSKInpUUx)

### 4. Lecture Presentaion
* **Session Details:** Formal instructional speaking tailored for lecturers.
* **Video Link:** [Lecture Practice Video](https://drive.google.com/drive/folders/1Ufpxy8aOFP6MXvku_xuvavC-HEa1VB9e)

---

## 💬 3. Feedback Collected
*Qualitative feedback gathered from the open-ended form responses.*

### Positive Feedback (What worked well)
* **Detailed AI Feedback:** "The most useful feature was the vocal analysis. It was unique and helped me clearly see the strengths and weaknesses in my delivery when presenting. The feedback was very detailed and structured, and it pointed out my specific issues instead of giving general comments."
* **Actionable Content Analysis:** "Content feedback was the most useful because it helped identify areas where my explanation could be clearer and more structured."
* **Posture Awareness:** "I think is the posture, as it helped me realize that I had eight excessive movements."
* **AI Summary & Interface:** "Overall it was understandable and easy to follow and I like the small AI assistant which can summarize all the analysis report into short answer for me to have a quick overview." 
* **Overall Usability:** "All structure are well-designed, and easy use for first time user. Great interface!"

### Constructive Feedback (Areas for improvement)
* **Long Loading Times:** Multiple users noted that AI summary generation and analysis results took too long. One user mentioned that "the waiting period felt long due to the absence of a clear progress indicator (instead just loading)."
* **Overly Strict Posture Feedback:** Users felt the posture analysis "expected a very stiff and fixed posture." According to one user, "In real presentations, natural movement and relaxed shoulders are normal and should not always be interpreted as nervousness." Another mentioned dealing with "improper posture detection".
* **Visibility During Practice:** Users cannot see the topic they chose while actively taking the practice session.

### Feature Requests
* **UI Themes:** Ability to select between Dark Mode and Light Mode.
* **Format Support:** Allow direct upload of `.pptx` files instead of requiring PDF conversion.
* **Learning Materials:** Offer learning resources to improve public speaking skills according to the weaknesses identified by the AI.
* **Session Details:** Ensure the chosen topic can be viewed directly on the screen during the practice session.
* **Performance UX:** Add clearer loading indicators during all AI processing steps.

---

## 💡 4. Insights & Action Items
*Actionable takeaways and planned changes based on the user feedback.*

### Key Insights
1. **High Value on Specificity:** Users highly value detailed, structured feedback over general comments. The combination of Vocal and Content analysis is the most appreciated aspect because it provides immediately actionable insights.
2. **Performance Constraints User Experience:** The waiting time for AI processing is the most significant friction point. Even if the results are good, long waits without adequate feedback (progress bars, indicators) cause frustration.
3. **Rigid Posture Models Limit Natural Delivery:** The current posture model flags too many natural movements as 'incorrect' or 'nervous' behavior. It needs to be calibrated to allow for relaxed, standard gesturing during a presentation.
4. **Context Loss During Practice:** Participants lose track of their presentation topic because it is hidden during the session.

### Action Items (Next Steps)
* [ ] **High Priority:** Add robust and clearer progress/loading indicators during AI analysis and summary generation phases.
* [ ] **High Priority:** Investigate ways to optimize response times and shorten the waiting period for AI processing.
* [ ] **Medium Priority:** Recalibrate the Posture evaluation model to be more forgiving of natural movements/relaxed shoulders and less rigid.
* [ ] **Medium Priority:** Update the practice session UI to persist and display the selected practice topic.
* [ ] **Low Priority:** Implement Dark / Light mode toggle.
* [ ] **Low Priority:** Research and integrate `.pptx` parsing so users do not need to convert to PDF.
* [ ] **Low Priority:** Curate and recommend external learning resources based on the specific weaknesses that the AI identifies.
