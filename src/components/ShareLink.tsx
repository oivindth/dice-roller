"use client";

import { useState } from "react";

interface ShareLinkProps {
  url: string;
}

export default function ShareLink({ url }: ShareLinkProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for environments without clipboard API
      const el = document.createElement("textarea");
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="flex items-center gap-2 bg-gray-700 rounded-lg p-3">
      <span className="flex-1 text-sm text-gray-300 truncate font-mono">
        {url}
      </span>
      <button
        onClick={handleCopy}
        className="shrink-0 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-semibold rounded-md px-4 py-1.5 transition-colors duration-150"
      >
        {copied ? "Copied!" : "Copy Link"}
      </button>
    </div>
  );
}
