Hey! You mentioned you were interested in how the HealthLens project works, so I wanted to give you a quick breakdown of the architecture and a few of the technical decisions I made.

Basically, it’s a platform designed to bridge the communication gap in healthcare—doctors need highly technical data, but patients need simple explanations. I built the frontend with Vanilla JS (ES6 modules) to keep it incredibly lightweight and fast, and used Firebase (Auth + Firestore) for the backend to get real-time syncing out of the box.

Here are a few screenshots of the interface before I get into the technical details:

![Landing Page (Light Mode)](imgs/home_light.png)
![Landing Page (Dark Mode)](imgs/home_dark.png)
![Secure Sign In](imgs/signin.png)

The most interesting part is how I handled the AI integration and data privacy:

### 1. Client-Side Processing & Single-Call AI
When a doctor uploads a PDF lab report, I don't send the file to a backend server. I used PDF.js to extract the text directly inside the browser, which keeps raw medical data off intermediary servers and saves compute costs. I then pass that text to the Gemini API. To optimize token usage and cut latency in half, I don't make two API calls; I engineered the prompt to generate *both* the clinical brief (for the doctor) and the simplified summary (for the patient) in a single shot. The frontend just splits the response.

![Doctor Dashboard](imgs/doctor.png)

### 2. Zero-Trust Real-Time Consent
Doctors can't just search a patient and view data. They have to send an access request. Because I used Firestore’s real-time `onSnapshot` listeners, that request pops up on the patient's dashboard instantly. The second the patient clicks "Allow," the doctor's screen automatically refreshes with the data. There's no polling or manual page refreshing, and every single interaction is written to an immutable audit log.

![Patient Dashboard & Consent](imgs/patient.png)

### 3. Grounded Contextual Chatbot
I also added an AI assistant, but a generic medical chatbot is dangerous because it hallucinates. To fix this, when a patient opens the chat, the app silently injects their specific medical reports and active prescriptions directly into the LLM's system prompt. This grounds the AI, meaning it answers questions based strictly on *their actual clinical history* rather than generic web knowledge.

Let me know if you want to dive deeper into any of the code or architecture!
