const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1350;
const COLORS = {
  ink: '#17231d',
  panel: '#22342a',
  lime: '#d9ff63',
  paper: '#fffef8',
  muted: '#b9c6b8',
  line: '#405247',
};

function roundedRect(context, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.arcTo(x + width, y, x + width, y + height, safeRadius);
  context.arcTo(x + width, y + height, x, y + height, safeRadius);
  context.arcTo(x, y + height, x, y, safeRadius);
  context.arcTo(x, y, x + width, y, safeRadius);
  context.closePath();
}

function fitText(context, text, maxWidth, startingSize, minimumSize, font) {
  let size = startingSize;
  do {
    context.font = font(size);
    if (context.measureText(text).width <= maxWidth) return size;
    size -= 2;
  } while (size >= minimumSize);
  return minimumSize;
}

function wrapText(context, text, x, y, maxWidth, lineHeight, maxLines) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';

  words.forEach((word) => {
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  });
  if (line) lines.push(line);

  const visibleLines = lines.slice(0, maxLines);
  if (lines.length > maxLines) {
    let lastLine = visibleLines[maxLines - 1];
    while (context.measureText(`${lastLine}…`).width > maxWidth && lastLine.includes(' ')) {
      lastLine = lastLine.slice(0, lastLine.lastIndexOf(' '));
    }
    visibleLines[maxLines - 1] = `${lastLine}…`;
  }

  visibleLines.forEach((visibleLine, index) => {
    context.fillText(visibleLine, x, y + index * lineHeight);
  });
}

function drawBall(context, x, y, radius) {
  context.save();
  context.fillStyle = COLORS.lime;
  context.strokeStyle = COLORS.ink;
  context.lineWidth = 3;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.beginPath();
  context.arc(x - radius * 0.85, y - radius * 0.75, radius * 0.9, -0.2, 1.45);
  context.stroke();
  context.beginPath();
  context.arc(x + radius * 0.85, y + radius * 0.75, radius * 0.9, Math.PI - 0.2, Math.PI + 1.45);
  context.stroke();
  context.restore();
}

function drawBackgroundCourt(context) {
  context.save();
  context.strokeStyle = COLORS.lime;
  context.lineWidth = 3;
  context.globalAlpha = 0.065;
  context.translate(795, 340);
  context.rotate(0.12);
  context.strokeRect(-170, -235, 430, 700);
  context.beginPath();
  context.moveTo(-170, 115);
  context.lineTo(260, 115);
  context.moveTo(-170, -60);
  context.lineTo(260, -60);
  context.moveTo(-170, 290);
  context.lineTo(260, 290);
  context.moveTo(45, -60);
  context.lineTo(45, 115);
  context.moveTo(45, 115);
  context.lineTo(45, 290);
  context.stroke();
  context.globalAlpha = 0.16;
  context.lineWidth = 5;
  context.setLineDash([10, 12]);
  context.beginPath();
  context.moveTo(-170, 115);
  context.lineTo(260, 115);
  context.stroke();
  context.restore();
}

function drawScorePanel(context, result) {
  roundedRect(context, 72, 548, 936, 232, 24);
  context.fillStyle = COLORS.panel;
  context.fill();
  context.strokeStyle = COLORS.line;
  context.lineWidth = 2;
  context.stroke();

  context.fillStyle = COLORS.muted;
  context.font = '700 22px "DM Sans", sans-serif';
  context.fillText('COURT SENSE', 112, 600);

  context.fillStyle = COLORS.lime;
  context.font = '700 190px "Barlow Condensed", Impact, sans-serif';
  const score = String(result.score);
  const scoreWidth = context.measureText(score).width;
  context.fillText(score, 105, 744);

  context.font = '700 46px "DM Sans", sans-serif';
  context.fillText('/100', 120 + scoreWidth, 733);

  context.textAlign = 'right';
  context.fillStyle = COLORS.paper;
  context.font = '700 28px "DM Sans", sans-serif';
  context.fillText(`${result.points} / ${result.maxPoints} POINTS`, 966, 613);
  context.fillStyle = COLORS.muted;
  context.font = '500 24px "DM Sans", sans-serif';
  context.fillText(`${result.questionCount} questions. Zero excuses.`, 966, 735);
  context.textAlign = 'left';
}

function drawBreakdown(context, result, categories) {
  context.fillStyle = COLORS.paper;
  context.font = '700 34px "Barlow Condensed", Impact, sans-serif';
  context.fillText('THE BREAKDOWN', 72, 850);

  Object.entries(result.categoryScores).forEach(([categoryId, category], index) => {
    const labelY = 918 + index * 102;
    const barY = labelY + 24;

    context.fillStyle = COLORS.paper;
    context.font = '600 25px "DM Sans", sans-serif';
    context.fillText(categories[categoryId].label, 72, labelY);
    context.textAlign = 'right';
    context.fillStyle = COLORS.lime;
    context.font = '700 27px "DM Sans", sans-serif';
    context.fillText(`${category.percentage}%`, 1008, labelY);
    context.textAlign = 'left';

    roundedRect(context, 72, barY, 936, 12, 6);
    context.fillStyle = COLORS.line;
    context.fill();
    if (category.percentage > 0) {
      roundedRect(context, 72, barY, Math.max(12, (936 * category.percentage) / 100), 12, 6);
      context.fillStyle = COLORS.lime;
      context.fill();
    }
  });
}

function drawFooter(context, siteUrl) {
  const url = new URL(siteUrl);
  const displayUrl = `${url.host}${url.pathname.replace(/\/$/, '')}`;

  context.strokeStyle = COLORS.line;
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(72, 1210);
  context.lineTo(1008, 1210);
  context.stroke();

  context.fillStyle = COLORS.muted;
  context.font = '700 20px "DM Sans", sans-serif';
  context.fillText('THINK YOU CAN DO BETTER?', 72, 1260);
  context.fillStyle = COLORS.lime;
  const urlSize = fitText(context, displayUrl, 936, 40, 26, (size) => `700 ${size}px "DM Sans", sans-serif`);
  context.font = `700 ${urlSize}px "DM Sans", sans-serif`;
  context.fillText(displayUrl, 72, 1312);
}

export async function createResultCard(result, categories, siteUrl) {
  await Promise.all([
    document.fonts.load('800 140px "Barlow Condensed"'),
    document.fonts.load('700 40px "DM Sans"'),
  ]);

  const canvas = document.createElement('canvas');
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is not available in this browser.');

  context.fillStyle = COLORS.ink;
  context.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
  const glow = context.createRadialGradient(980, 40, 0, 980, 40, 650);
  glow.addColorStop(0, 'rgba(217, 255, 99, 0.13)');
  glow.addColorStop(1, 'rgba(217, 255, 99, 0)');
  context.fillStyle = glow;
  context.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
  drawBackgroundCourt(context);

  drawBall(context, 91, 84, 27);
  context.fillStyle = COLORS.paper;
  context.font = '800 49px "Barlow Condensed", Impact, sans-serif';
  context.fillText('EIMP.', 134, 102);
  context.fillStyle = COLORS.muted;
  context.font = '600 19px "DM Sans", sans-serif';
  context.fillText('PADEL, HONESTLY.', 272, 96);
  context.textAlign = 'right';
  context.font = '700 18px "DM Sans", sans-serif';
  context.fillText('EVERYONE IS AN INTERMEDIATE PLAYER', 1008, 95);
  context.textAlign = 'left';

  context.strokeStyle = COLORS.line;
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(72, 140);
  context.lineTo(1008, 140);
  context.stroke();

  context.fillStyle = COLORS.lime;
  context.font = '700 21px "DM Sans", sans-serif';
  context.fillText(`THE VERDICT IS IN  ·  LEVEL ${result.levelIndex + 1} OF 9`, 72, 202);

  const level = result.level.label.toUpperCase();
  const levelSize = fitText(context, level, 936, 146, 76, (size) => `italic 800 ${size}px "Barlow Condensed", Impact, sans-serif`);
  context.font = `italic 800 ${levelSize}px "Barlow Condensed", Impact, sans-serif`;
  context.fillStyle = COLORS.lime;
  context.fillText(level, 66, 354);

  context.fillStyle = COLORS.muted;
  context.font = '400 27px "DM Sans", sans-serif';
  wrapText(context, result.level.summary, 72, 415, 900, 39, 3);

  drawScorePanel(context, result);
  drawBreakdown(context, result, categories);
  drawFooter(context, siteUrl);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('The result image could not be created.'));
    }, 'image/png');
  });
}
