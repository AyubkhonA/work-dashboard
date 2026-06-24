import React, { useState } from 'react';
import { buildEmailText } from '../lib/emailText';

export default function EmailSummary({ data }) {
  const [copied, setCopied] = useState(false);
  const email = buildEmailText(data);

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="panel">
      <div className="panel-h">
        <span className="tag">copy this into Gmail</span>
        <button className="seg" onClick={copyEmail}>{copied ? '✓ Copied' : 'Copy'}</button>
      </div>
      <div className="panel-b"><pre className="email-box">{email}</pre></div>
    </div>
  );
}
