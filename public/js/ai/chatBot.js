import { db } from "../firebaseConfig.js";
import { GEMINI_API_KEY, GEMINI_MODEL, API_BASE_URL } from "./aiConfig.js";

let chatContext = null;
let chatHistory = [];

export function initChatBot() {
    // creating the chat ui on the fly
    if (!document.getElementById("healthlens-chatbot-container")) {
        const div = document.createElement("div");
        div.id = "healthlens-chatbot-container";
        div.innerHTML = `
            <!-- Chat Window -->
            <div id="hl-chat-window" class="hl-chat-window hidden">
                <div class="hl-chat-header">
                    <span>🤖 HealthLens Assistant</span>
                    <button id="hl-close-chat">✖</button>
                </div>
                <div id="hl-chat-messages" class="hl-chat-messages">
                    <div class="hl-message bot">Hello! I've reviewed the medical record. How can I help you today?</div>
                </div>
                <div class="hl-chat-input-area">
                    <input type="text" id="hl-chat-input" placeholder="Ask about medications, reports...">
                    <button id="hl-send-btn">➤</button>
                </div>
            </div>

            <!-- Floating Button -->
            <button id="hl-chat-fab" class="hl-chat-fab">
                💬
            </button>
        `;
        document.body.appendChild(div);

        // hook up the buttons
        document.getElementById("hl-chat-fab").onclick = toggleChat;
        document.getElementById("hl-close-chat").onclick = toggleChat;
        document.getElementById("hl-send-btn").onclick = sendMessage;
        document.getElementById("hl-chat-input").addEventListener("keypress", (e) => {
            if (e.key === "Enter") sendMessage();
        });
    }
}

export function updateChatContext(data) {
    console.log("ChatBot Context Updated:", data);
    chatContext = data;
    chatHistory = []; // reset history on new context

    // visual check to see if it worked
    const header = document.querySelector(".hl-chat-header span");
    if (header) header.innerHTML = `🤖 HealthLens (Connected ✅)`;

    const msgs = document.getElementById("hl-chat-messages");
    if (msgs) {
        msgs.innerHTML = '<div class="hl-message bot">I have read the medical records. How can I assist?</div>';
    }
}

function toggleChat() {
    const win = document.getElementById("hl-chat-window");
    const fab = document.getElementById("hl-chat-fab");
    win.classList.toggle("hidden");
    fab.classList.toggle("hidden");
}

async function sendMessage() {
    const input = document.getElementById("hl-chat-input");
    const msg = input.value.trim();
    if (!msg) return;

    // show user msg
    appendMessage(msg, "user");
    input.value = "";

    // loading state
    const loadingId = appendMessage("Thinking...", "bot", true);

    try {
        const reply = await callGeminiChat(msg);
        removeMessage(loadingId);
        appendMessage(reply, "bot");
    } catch (e) {
        removeMessage(loadingId);
        appendMessage("Error: " + e.message, "bot");
    }
}

function appendMessage(text, sender, isLoading = false) {
    const div = document.getElementById("hl-chat-messages");
    const msgDiv = document.createElement("div");
    msgDiv.className = `hl-message ${sender} ${isLoading ? 'loading' : ''}`;
    msgDiv.innerText = text;
    if (isLoading) msgDiv.id = "msg-loading-" + Date.now();

    div.appendChild(msgDiv);
    div.scrollTop = div.scrollHeight;
    return msgDiv.id;
}

function removeMessage(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

async function callGeminiChat(userMsg) {
    const API_URL = `${API_BASE_URL}/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    // keep track of the convo
    chatHistory.push({ role: "user", parts: [{ text: userMsg }] });

    // need to inject the patient context so it knows who we're talking about
    let systemInstructionObj = undefined;
    let contextInjectionForMessage = "";

    if (chatContext) {
        // cleanup data a bit so we don't send too much noise
        const cleanReports = (chatContext.reports || []).map(r => ({
            date: r.displayDate || r.date,
            title: r.title,
            summary: r.doctorSummary || r.patientSummary || "No summary"
        }));

        const cleanMeds = (chatContext.prescriptions || []).map(p => ({
            med: p.medicine,
            dose: p.dosage,
            freq: p.frequency
        }));

        // this prompt is key - tells the AI how to behave
        const contextText = `
        ROLE: Medical Data Analysis Assistant.
        TASK: Analyze the PROVIDED Patient Records below.
        
        [PATIENT RECORDS START]
        NAME: ${chatContext.name || "Patient"} (${chatContext.age || "?"}/${chatContext.sex || "?"})
        
        === MEDICAL REPORTS ===
        ${JSON.stringify(cleanReports)}
        
        === CURRENT PRESCRIPTIONS ===
        ${JSON.stringify(cleanMeds)}
        [PATIENT RECORDS END]
        
        OPERATIONAL RULES:
        1. YOU HAVE ACCESS to these records. DO NOT say "I don't have access".
        2. Answer questions specifically using the data above IF possible.
        3. IF the user asks a General Medical Question not related to the records, ANSWER IT using your general medical knowledge.
        4. Keep answers concise (under 50 words).
        `;

        systemInstructionObj = {
            parts: [{ text: contextText }]
        };

        // double check: force context into the immediate turn just in case
        contextInjectionForMessage = `[SYSTEM: READ THE PROVIDED PATIENT RECORDS ABOVE BEFORE ANSWERING]\n`;
    }

    // build the request
    const payload = {
        systemInstruction: systemInstructionObj,
        contents: [
            ...chatHistory.slice(0, -1), // old history
            {
                role: "user",
                parts: [{ text: contextInjectionForMessage + userMsg }] // current msg with context hint
            }
        ],
        safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
        ]
    };

    // hit gemini
    const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error("Chat Error: " + (err.error?.message || response.statusText));
    }

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "AI Error");

    const replyText = data.candidates[0].content.parts[0].text;

    // 4. Update History with Model Reply
    chatHistory.push({ role: "model", parts: [{ text: replyText }] });

    return replyText;
}
