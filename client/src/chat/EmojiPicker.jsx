import { useState } from 'react';

// Tiny built-in emoji picker (no external data files or network requests). Lazy-loaded.
const GROUPS = {
  Smileys: '😀 😃 😄 😁 😆 😅 🤣 😂 🙂 🙃 😉 😊 😇 🥰 😍 🤩 😘 😗 😚 😋 😛 😜 🤪 😝 🤗 🤭 🤫 🤔 🤐 🤨 😐 😑 😶 😏 😒 🙄 😬 😌 😔 😪 😴 😷 🤒 🥵 🥶 🥴 😵 🤯 🥳 😎 🤓 😕 😟 🙁 😮 😯 😲 😳 🥺 😦 😧 😨 😰 😥 😢 😭 😱 😖 😣 😞 😓 😩 😫 🥱 😤 😡 😠 🤬',
  Gestures: '👍 👎 👌 ✌️ 🤞 🤟 🤘 🤙 👈 👉 👆 👇 ☝️ ✋ 🤚 🖐️ 🖖 👋 🤝 🙏 ✍️ 💪 👏 🙌 👐 🤲',
  Hearts: '❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💔 ❣️ 💕 💞 💓 💗 💖 💘 💝 💟',
  Things: '🎉 🎊 🎁 🎂 🍰 ☕ 🍵 🍕 🍔 🍟 🍫 🍦 🌹 🌸 🌼 🌞 🌙 ⭐ 🔥 ✨ 💯 ✅ ❌ ⚡ 🎵 📷 📍 🏠 🚗 ✈️ ⏰ 📅 💡 📌',
};

export default function EmojiPicker({ onPick }) {
  const [group, setGroup] = useState('Smileys');
  return (
    <div className="w-72 rounded-2xl border border-gray-100 bg-white p-2 shadow-xl" role="dialog" aria-label="Emoji picker">
      <div className="mb-1 flex gap-1" role="tablist">
        {Object.keys(GROUPS).map((g) => (
          <button
            key={g}
            type="button"
            role="tab"
            aria-selected={g === group}
            onClick={() => setGroup(g)}
            className={`rounded-lg px-2 py-1 text-xs font-medium ${g === group ? 'bg-brand-50 text-brand-700' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            {g}
          </button>
        ))}
      </div>
      <div className="grid max-h-52 grid-cols-8 gap-0.5 overflow-y-auto" role="tabpanel">
        {GROUPS[group].split(' ').map((e) => (
          <button key={e} type="button" onClick={() => onPick(e)} className="grid h-8 w-8 place-items-center rounded-lg text-xl hover:bg-gray-100" aria-label={`Insert ${e}`}>
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}
