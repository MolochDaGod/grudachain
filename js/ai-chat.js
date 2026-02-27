/**
 * GrudaChain Hub - AI Chat Module
 * Floating chat using Puter.js AI with Grudge Warlords context
 */

const HISTORY_KEY = 'grudge_ai_history';
const MAX_HISTORY = 50;

const SYSTEM_PROMPT = `You are Grudge AI, the official assistant for Grudge Warlords — a souls-like MMO with 4 classes (Warrior, Mage, Ranger, Worge), 6 races, 3 factions (Crusade, Legion, Fabled), 5 harvesting professions (Miner, Forester, Mystic, Chef, Engineer), 518 crafting recipes, and an island conquest system. 

You help players with:
- Game mechanics, combat, and class builds
- Crafting recipes and material gathering
- Faction lore and island locations
- Character progression and profession leveling
- Equipment stats, weapon types, and armor sets

Keep answers concise and helpful. Use game terminology.`;

export class AIChatUI {
  constructor() {
    this.history = [];
    this.isOpen = false;
    this.isSending = false;
    this._loadHistory();
  }

  /** Initialize event listeners */
  init() {
    const input = document.getElementById('ai-input');
    const sendBtn = document.getElementById('ai-send');
    const closeBtn = document.getElementById('ai-close');
    const clearBtn = document.getElementById('ai-clear');

    if (sendBtn) sendBtn.addEventListener('click', () => this._send());
    if (closeBtn) closeBtn.addEventListener('click', () => this.toggle());
    if (clearBtn) clearBtn.addEventListener('click', () => this._clear());
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this._send();
        }
      });
    }

    // Restore history to UI
    this._renderHistory();
  }

  /** Toggle chat visibility */
  toggle() {
    const el = document.getElementById('ai-chat');
    if (!el) return;
    this.isOpen = !this.isOpen;
    el.classList.toggle('hidden', !this.isOpen);
    if (this.isOpen) {
      const input = document.getElementById('ai-input');
      if (input) input.focus();
      this._scrollToBottom();
    }
  }

  /** Send a message */
  async _send() {
    if (this.isSending) return;
    const input = document.getElementById('ai-input');
    if (!input) return;

    const text = input.value.trim();
    if (!text) return;

    input.value = '';
    this._addMessage('user', text);
    this.isSending = true;

    // Show typing indicator
    const typingEl = this._addTypingIndicator();

    try {
      const response = await this._getAIResponse(text);
      typingEl.remove();
      this._addMessage('bot', response);
    } catch (err) {
      typingEl.remove();
      this._addMessage('bot', `Sorry, I couldn't process that. ${err.message || 'Please try again.'}`);
    }

    this.isSending = false;
  }

  /** Get AI response via Puter.js */
  async _getAIResponse(message) {
    // Build conversation context (last 10 messages for context)
    const recentHistory = this.history.slice(-10).map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content
    }));

    // Try Puter AI first
    if (typeof puter !== 'undefined' && puter.ai) {
      try {
        const messages = [
          { role: 'system', content: SYSTEM_PROMPT },
          ...recentHistory,
          { role: 'user', content: message }
        ];

        const response = await puter.ai.chat(messages);
        
        // Handle different response formats
        if (typeof response === 'string') return response;
        if (response?.message?.content) return response.message.content;
        if (response?.text) return response.text;
        if (response?.toString) return response.toString();
        return 'Received a response but could not parse it.';
      } catch (puterErr) {
        console.warn('Puter AI error:', puterErr);
        // Fall through to fallback
      }
    }

    // Fallback: provide helpful static responses
    return this._fallbackResponse(message);
  }

  /** Fallback responses when AI is unavailable */
  _fallbackResponse(message) {
    const q = message.toLowerCase();
    
    if (q.includes('class') || q.includes('warrior') || q.includes('mage') || q.includes('ranger') || q.includes('worge')) {
      return 'Grudge Warlords has 4 classes: **Warrior** (melee tank/DPS with stamina charge system), **Mage** (spell caster with teleport blocks), **Ranger** (ranged DPS with parry counter), and **Worge** (shapeshifter with Bear, Raptor, and Bird forms). Each has unique weapon restrictions and combat mechanics.';
    }
    if (q.includes('race') || q.includes('faction')) {
      return 'There are 6 races split across 3 factions: **Crusade** (Human, Dwarf), **Legion** (Orc, Undead), and **Fabled** (Elf, Barbarian). Each race has unique traits and starting bonuses.';
    }
    if (q.includes('craft') || q.includes('profession')) {
      return 'There are 5 harvesting professions: **Miner** (ores, gems), **Forester** (wood, herbs), **Mystic** (essences, infusions), **Chef** (cooking ingredients), and **Engineer** (components, schematics). Each has its own progression tree with tier milestones.';
    }
    if (q.includes('weapon')) {
      return 'Weapon types include: Swords, Axes, Daggers, Bows, Crossbows, Guns, Hammers, Maces, Spears, Staffs (Fire/Frost/Holy), Tomes, Wands, and 2H weapons. Class restrictions apply — e.g., only Warriors can use shields.';
    }
    
    return 'Puter AI is not currently available. Try refreshing the page, or ask me about classes, races, professions, weapons, or crafting and I can provide basic game info.';
  }

  // --- UI Helpers ---

  _addMessage(role, content) {
    this.history.push({ role, content, ts: Date.now() });
    if (this.history.length > MAX_HISTORY) this.history.shift();
    this._saveHistory();

    const container = document.getElementById('ai-messages');
    if (!container) return;

    const msgEl = document.createElement('div');
    msgEl.className = `ai-msg ai-msg-${role === 'user' ? 'user' : 'bot'}`;
    msgEl.innerHTML = `<div class="ai-msg-content">${this._escapeHtml(content)}</div>`;
    container.appendChild(msgEl);
    this._scrollToBottom();
  }

  _addTypingIndicator() {
    const container = document.getElementById('ai-messages');
    if (!container) return document.createElement('div');

    const el = document.createElement('div');
    el.className = 'ai-msg ai-msg-bot ai-msg-typing';
    el.innerHTML = '<div class="ai-msg-content">Thinking</div>';
    container.appendChild(el);
    this._scrollToBottom();
    return el;
  }

  _scrollToBottom() {
    const container = document.getElementById('ai-messages');
    if (container) container.scrollTop = container.scrollHeight;
  }

  _clear() {
    this.history = [];
    this._saveHistory();
    const container = document.getElementById('ai-messages');
    if (container) {
      container.innerHTML = `
        <div class="ai-msg ai-msg-bot">
          <div class="ai-msg-content">Chat cleared. How can I help you?</div>
        </div>
      `;
    }
  }

  _renderHistory() {
    const container = document.getElementById('ai-messages');
    if (!container || this.history.length === 0) return;

    // Keep the welcome message, add history after
    const recent = this.history.slice(-20);
    for (const msg of recent) {
      const el = document.createElement('div');
      el.className = `ai-msg ai-msg-${msg.role === 'user' ? 'user' : 'bot'}`;
      el.innerHTML = `<div class="ai-msg-content">${this._escapeHtml(msg.content)}</div>`;
      container.appendChild(el);
    }
    this._scrollToBottom();
  }

  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    // Convert markdown bold to HTML
    return div.innerHTML.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  }

  // --- Persistence ---

  _loadHistory() {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) this.history = JSON.parse(stored);
    } catch { this.history = []; }
  }

  _saveHistory() {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(this.history));
    } catch { /* storage full, ignore */ }
  }
}
