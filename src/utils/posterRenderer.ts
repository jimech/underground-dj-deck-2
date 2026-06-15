export interface PosterMetadata {
  djName: string;
  djCrew: string;
  soundStyle: string;
  sessionName: string;
  bpm: number;
  dateStr: string;
  ambientMode: string;
  aspectRatio: '1:1' | '9:16';
}

/**
 * Draws an aesthetic underground, brutalist rave club flyer on a canvas element
 */
export function drawSetPoster(canvas: HTMLCanvasElement, meta: PosterMetadata): Promise<void> {
  return new Promise((resolve) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      resolve();
      return;
    }

    // Set canvas dimensions based on chosen aspect ratio
    const dpr = 2; // high density super crisp text
    const standardWidth = 1080;
    const standardHeight = meta.aspectRatio === '1:1' ? 1080 : 1920;

    canvas.width = standardWidth * dpr;
    canvas.height = standardHeight * dpr;
    ctx.scale(dpr, dpr);

    const w = standardWidth;
    const h = standardHeight;

    // 1. Core Background: Deep charcoal space
    ctx.fillStyle = '#0a0a0c';
    ctx.fillRect(0, 0, w, h);

    // 2. Brutalist Grid Background overlay
    ctx.strokeStyle = '#18181b';
    ctx.lineWidth = 1;
    // vertical grid rows
    for (let x = 0; x < w; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    // horizontal grid rows
    for (let y = 0; y < h; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Accent lines / crosshairs
    ctx.strokeStyle = 'rgba(249, 115, 22, 0.15)'; // faint orange highlights
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(40, 40);
    ctx.lineTo(w - 40, 40);
    ctx.lineTo(w - 40, h - 40);
    ctx.lineTo(40, h - 40);
    ctx.closePath();
    ctx.stroke();

    // Secondary inner subgrid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(120, 0);
    ctx.lineTo(120, h);
    ctx.moveTo(w - 120, 0);
    ctx.lineTo(w - 120, h);
    ctx.stroke();

    // 3. Brutalist Abstract Decorative shapes (Rave center visualizer motif)
    // Draw dual deck vinyl shapes in center overlap
    const centerX = w / 2;
    const centerY = meta.aspectRatio === '1:1' ? h / 2 - 10 : h / 2 - 80;
    
    // Large ambient outer tech circles
    ctx.strokeStyle = 'rgba(249, 115, 22, 0.1)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 320, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.08)'; // green ring
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 240, 0, Math.PI * 2);
    ctx.stroke();

    // Draw high-freq radar waveform
    ctx.strokeStyle = '#f97316'; // orange neon accents
    ctx.lineWidth = 3;
    ctx.beginPath();
    const dotsCount = 120;
    for (let s = 0; s <= dotsCount; s++) {
      const angle = (s / dotsCount) * Math.PI * 2;
      // Add heavy dynamic pulse variance
      const pulseFactor = 160 + Math.sin(s * 8.5) * 35 + Math.cos(s * 14) * 15;
      const dx = centerX + Math.cos(angle) * pulseFactor;
      const dy = centerY + Math.sin(angle) * pulseFactor;
      if (s === 0) ctx.moveTo(dx, dy);
      else ctx.lineTo(dx, dy);
    }
    ctx.closePath();
    ctx.stroke();

    // Inner green vector cross
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(centerX - 180, centerY);
    ctx.lineTo(centerX + 180, centerY);
    ctx.moveTo(centerX, centerY - 180);
    ctx.lineTo(centerX, centerY + 180);
    ctx.stroke();

    // Center Core Vinyl spindle
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 90, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.stroke();

    // Small central core indicator
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 10, 0, Math.PI * 2);
    ctx.fill();

    // 4. BRUTALIST TYPOGRAPHY & OVERLAYS
    // Label borders top left
    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = '#a1a1aa';
    ctx.fillText('STRETCH SIGNAL ID: // TERMINAL.09', 55, 65);
    ctx.fillText('CO-ORDINATES: [52.5200° N, 13.4050° E]', 55, 85);
    ctx.fillText('AUDIO SIGNAL STATUS: ACTIVE-RIG', w - 320, 65);

    // Decorative corner bracket tags
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 3;
    // Top-Left corner tag
    ctx.beginPath();
    ctx.moveTo(40, 70); ctx.lineTo(40, 40); ctx.lineTo(70, 40);
    ctx.stroke();
    // Top-Right corner tag
    ctx.beginPath();
    ctx.moveTo(w - 40, 70); ctx.lineTo(w - 40, 40); ctx.lineTo(w - 70, 40);
    ctx.stroke();
    // Bottom-Left corner tag
    ctx.beginPath();
    ctx.moveTo(40, h - 70); ctx.lineTo(40, h - 40); ctx.lineTo(70, h - 40);
    ctx.stroke();
    // Bottom-Right corner tag
    ctx.beginPath();
    ctx.moveTo(w - 40, h - 70); ctx.lineTo(w - 40, h - 40); ctx.lineTo(w - 70, h - 40);
    ctx.stroke();

    // 5. CENTRAL PERFORMANCE INFO BLOCK (Drawn at the top & bottom)
    // Master Crew & Presenter label
    ctx.fillStyle = '#f97316';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    
    const bannerY = meta.aspectRatio === '1:1' ? 160 : 260;
    ctx.fillText(`[ ${meta.djCrew.toUpperCase()} PRESENTATION ]`, centerX, bannerY);

    // Headline DJ Name
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 78px sans-serif'; // Ultra bold impact weight
    ctx.textAlign = 'center';
    ctx.fillText(meta.djName.toUpperCase(), centerX, bannerY + 80);

    // Sound style tag under name
    ctx.fillStyle = 'rgba(16, 185, 129, 0.85)';
    ctx.font = 'bold 16px monospace';
    ctx.fillText(`GENRE: ${meta.soundStyle.toUpperCase()} / ANALOG CABINETS`, centerX, bannerY + 115);

    // 6. BOTTOM RIG STATE METADATA
    const infoStartY = meta.aspectRatio === '1:1' ? h - 220 : h - 425;
    
    // Large Brutalist Section Split line
    ctx.strokeStyle = '#27272a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(60, infoStartY - 30);
    ctx.lineTo(w - 60, infoStartY - 30);
    ctx.stroke();

    ctx.textAlign = 'left';

    // BPM & Performance parameters
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 48px sans-serif';
    ctx.fillText(`${meta.bpm} BPM`, 80, infoStartY + 30);

    ctx.fillStyle = '#a1a1aa';
    ctx.font = 'bold 13px monospace';
    ctx.fillText('RECORDING ENGINE PARAMETER TEMPO', 80, infoStartY + 55);

    // Session Title
    ctx.fillStyle = '#f97316';
    ctx.font = 'bold 24px monospace';
    
    // Limit and truncate session name nicely if too long
    let trimmedSession = meta.sessionName;
    if (trimmedSession.length > 28) {
      trimmedSession = trimmedSession.substring(0, 26) + '...';
    }
    ctx.fillText(trimmedSession.toUpperCase(), 80, infoStartY + 105);

    ctx.fillStyle = '#a1a1aa';
    ctx.font = 'bold 13px monospace';
    ctx.fillText('LIVE PATCH IDENTIFICATION INDEX', 80, infoStartY + 125);

    // Right Column: Date Info & Ambience Mode
    ctx.textAlign = 'right';
    ctx.fillStyle = '#10b981'; // solid neon terminal green
    ctx.font = '900 36px sans-serif';
    ctx.fillText(meta.dateStr.toUpperCase(), w - 80, infoStartY + 25);

    ctx.fillStyle = '#a1a1aa';
    ctx.font = 'bold 13px monospace';
    ctx.fillText('TRANSMISSION CALENDER STAMP // [UTC]', w - 80, infoStartY + 55);

    // Ambient Space Layer Status
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px monospace';
    ctx.fillText(`AMBIENT: ${meta.ambientMode.toUpperCase() || 'NONE'}`, w - 80, infoStartY + 105);

    ctx.fillStyle = '#a1a1aa';
    ctx.font = 'bold 13px monospace';
    ctx.fillText('BACKGROUND ATMOSPHERE CABIN SELECTOR', w - 80, infoStartY + 125);

    // Barcode rendering (highly aesthetic brutalist element)
    const barcodeX = 80;
    const barcodeY = meta.aspectRatio === '1:1' ? h - 85 : h - 220;
    const barcodeHeight = 45;

    ctx.fillStyle = '#ffffff';
    let currentBarX = barcodeX;
    // Walk along and draw variable width barcode bars
    ctx.textAlign = 'left';
    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = '#71717a';
    ctx.fillText('RIG LOCK SYSTEM TOKEN - BLOC-F415', barcodeX, barcodeY - 10);

    const barPattern = [2, 4, 1, 3, 5, 1, 8, 2, 4, 2, 6, 1, 3, 2, 5, 7, 2, 1, 4, 2, 3, 10, 4, 2, 1, 6, 2, 3, 5, 3, 1, 8, 2, 4];
    for (let b = 0; b < barPattern.length; b++) {
      const barWidth = barPattern[b];
      if (b % 2 === 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.fillRect(currentBarX, barcodeY, barWidth, barcodeHeight);
      }
      currentBarX += barWidth + 3;
    }

    // Additional legal text footer for that industrial larp warehouse edge
    ctx.fillStyle = '#52525b';
    ctx.font = 'bold 10px monospace';
    const footerY = meta.aspectRatio === '1:1' ? h - 75 : h - 110;
    ctx.textAlign = 'center';
    ctx.fillText('WARNING: AUDIO OUTPUT CONTAINS DEEP SUB-FREQUENCIES AND INDUSTRIAL GRID INTERFERENCE.', centerX, footerY);
    ctx.fillText('DESIGNED & EXPORTED VIA UNDERGROUND DJ MONOLITH ENGINE // AUTHENTIC CLOAK-RIG LOCK.', centerX, footerY + 18);

    resolve();
  });
}
