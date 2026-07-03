import React from 'react';

const icons = ["bawling.gif", "bow.gif", "fearful.gif", "nuh_uh.gif", "pensive.gif", "relaxed.gif", "rofl.gif", "smiley.gif", "wink.gif", "worried.gif"];

export default function YahooIcons({ onSend }: { onSend: (text: string) => void }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(10, 1fr)", gap: "8px", marginBottom: "15px", padding: "10px", background: "rgba(255,255,255,0.05)", borderRadius: "12px" }}>
      {icons.map(icon => (
        <button
          key={icon}
          onClick={() => onSend(`[YAHOO:${icon}]`)}
          style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "5px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <img src={`/yahoo_icons/${icon}`} alt={icon} style={{ width: "24px", height: "24px" }} />
        </button>
      ))}
    </div>
  );
}