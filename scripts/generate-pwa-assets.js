import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function generateAssets() {
  const sourceImage = 'ChatGPT Image Aug 2, 2026, 12_43_40 PM.png';
  const fallbackImage = 'src/assets/images/app_logo_1786186492856.jpg';
  const baseImg = fs.existsSync(sourceImage) ? sourceImage : fallbackImage;
  const publicDir = path.resolve('public');

  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  console.log('Using base image:', baseImg);

  // 1. PWA 192x192
  await sharp(baseImg)
    .resize(192, 192, { fit: 'cover' })
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(path.join(publicDir, 'pwa-192x192.png'));
  console.log('✓ Created pwa-192x192.png (192x192)');

  // 2. PWA 512x512
  await sharp(baseImg)
    .resize(512, 512, { fit: 'cover' })
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(path.join(publicDir, 'pwa-512x512.png'));
  console.log('✓ Created pwa-512x512.png (512x512)');

  // 3. Apple Touch Icon 180x180
  await sharp(baseImg)
    .resize(180, 180, { fit: 'cover' })
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('✓ Created apple-touch-icon.png (180x180)');

  // 4. Maskable Icon 512x512 (with 20% safe zone padding for adaptive icons)
  const innerSize = Math.round(512 * 0.76); // ~390px
  const innerBuffer = await sharp(baseImg)
    .resize(innerSize, innerSize, { fit: 'contain' })
    .toBuffer();

  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 9, g: 9, b: 11, alpha: 1 }
    }
  })
    .composite([{ input: innerBuffer, gravity: 'center' }])
    .png({ quality: 100 })
    .toFile(path.join(publicDir, 'maskable-icon-512x512.png'));
  console.log('✓ Created maskable-icon-512x512.png (512x512 maskable)');

  // 5. app_logo.png and jpg files
  await sharp(baseImg)
    .resize(512, 512, { fit: 'cover' })
    .png({ quality: 100 })
    .toFile(path.join(publicDir, 'app_logo.png'));

  await sharp(baseImg)
    .resize(512, 512, { fit: 'cover' })
    .jpeg({ quality: 95 })
    .toFile(path.join(publicDir, 'app_logo.jpg'));

  await sharp(baseImg)
    .resize(512, 512, { fit: 'cover' })
    .jpeg({ quality: 95 })
    .toFile(path.join(publicDir, 'logo.jpg'));

  // 6. Shortcut specific icons (192x192)
  const shortcutIcons = [
    { name: 'shortcut-focus.png', label: 'FOCUS', color: '#6366f1' },
    { name: 'shortcut-quiz.png', label: 'QUIZ', color: '#a855f7' },
    { name: 'shortcut-research.png', label: 'RESEARCH', color: '#3b82f6' },
    { name: 'shortcut-puzzles.png', label: 'PUZZLE', color: '#ec4899' }
  ];

  for (const item of shortcutIcons) {
    const svgOverlay = `
      <svg width="192" height="192" viewBox="0 0 192 192" xmlns="http://www.w3.org/2000/svg">
        <rect width="192" height="192" rx="36" fill="#09090b"/>
        <circle cx="96" cy="76" r="44" fill="${item.color}" fill-opacity="0.2" stroke="${item.color}" stroke-width="3"/>
        <text x="96" y="86" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="bold" text-anchor="middle">★</text>
        <text x="96" y="152" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="bold" letter-spacing="1" text-anchor="middle">${item.label}</text>
      </svg>
    `;
    await sharp(Buffer.from(svgOverlay))
      .png()
      .toFile(path.join(publicDir, item.name));
    console.log(`✓ Created ${item.name}`);
  }

  // 7. Desktop Screenshot (1280x720)
  const desktopSvg = `
    <svg width="1280" height="720" viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#09090b"/>
          <stop offset="50%" stop-color="#18181b"/>
          <stop offset="100%" stop-color="#09090b"/>
        </linearGradient>
        <linearGradient id="cardGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#27272a"/>
          <stop offset="100%" stop-color="#18181b"/>
        </linearGradient>
        <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#6366f1"/>
          <stop offset="100%" stop-color="#a855f7"/>
        </linearGradient>
      </defs>

      <!-- Main Background -->
      <rect width="1280" height="720" fill="url(#bgGrad)"/>

      <!-- App Header -->
      <rect x="0" y="0" width="1280" height="64" fill="#18181b" stroke="#27272a" stroke-width="1"/>
      <circle cx="48" cy="32" r="16" fill="#6366f1"/>
      <text x="76" y="38" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="bold">Academix Aletheon</text>
      <rect x="280" y="16" width="320" height="32" rx="16" fill="#27272a"/>
      <text x="300" y="37" fill="#a1a1aa" font-family="system-ui, -apple-system, sans-serif" font-size="13">Search challenges, quizzes, research...</text>

      <!-- Sidebar -->
      <rect x="0" y="64" width="240" height="656" fill="#0f0f12" stroke="#27272a" stroke-width="1"/>
      
      <!-- Nav items -->
      <rect x="16" y="88" width="208" height="40" rx="8" fill="#6366f1" fill-opacity="0.15"/>
      <text x="36" y="113" fill="#818cf8" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="bold">⚡ Daily Challenges</text>
      <text x="36" y="160" fill="#d4d4d8" font-family="system-ui, -apple-system, sans-serif" font-size="14">⏱ Focus Timer</text>
      <text x="36" y="200" fill="#d4d4d8" font-family="system-ui, -apple-system, sans-serif" font-size="14">🎓 Quiz Master</text>
      <text x="36" y="240" fill="#d4d4d8" font-family="system-ui, -apple-system, sans-serif" font-size="14">🔬 Keen Researchers</text>
      <text x="36" y="280" fill="#d4d4d8" font-family="system-ui, -apple-system, sans-serif" font-size="14">🧩 Puzzles &amp; Riddles</text>
      <text x="36" y="320" fill="#d4d4d8" font-family="system-ui, -apple-system, sans-serif" font-size="14">📅 Study Planner</text>

      <!-- Main Content Grid -->
      <!-- Hero Banner -->
      <rect x="264" y="88" width="984" height="160" rx="16" fill="url(#cardGrad)" stroke="#3f3f46" stroke-width="1"/>
      <rect x="288" y="112" width="100" height="26" rx="13" fill="url(#accentGrad)"/>
      <text x="338" y="129" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="bold" text-anchor="middle">PRO SUITE</text>
      <text x="288" y="174" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="26" font-weight="bold">Master Knowledge &amp; Calculations with AI</text>
      <text x="288" y="204" fill="#a1a1aa" font-family="system-ui, -apple-system, sans-serif" font-size="14">Interactive STEM problem solver, neural flashcards, focus synthesizer, and deep query engine.</text>

      <!-- 3 Feature Cards -->
      <!-- Card 1 -->
      <rect x="264" y="272" width="312" height="416" rx="16" fill="#18181b" stroke="#27272a" stroke-width="1"/>
      <circle cx="304" cy="312" r="20" fill="#6366f1" fill-opacity="0.2"/>
      <text x="304" y="318" fill="#818cf8" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="bold" text-anchor="middle">⏱</text>
      <text x="336" y="318" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="bold">Focus Timer</text>
      <text x="288" y="352" fill="#a1a1aa" font-family="system-ui, -apple-system, sans-serif" font-size="13">Pomodoro &amp; deep flow sessions with ambient binaural beats.</text>
      <rect x="288" y="380" width="264" height="200" rx="12" fill="#09090b" stroke="#27272a" stroke-width="1"/>
      <circle cx="420" cy="470" r="50" fill="none" stroke="#6366f1" stroke-width="6" stroke-dasharray="240 70"/>
      <text x="420" y="478" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="bold" text-anchor="middle">25:00</text>
      <rect x="288" y="600" width="264" height="40" rx="8" fill="#6366f1"/>
      <text x="420" y="625" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="bold" text-anchor="middle">Start Session</text>

      <!-- Card 2 -->
      <rect x="600" y="272" width="312" height="416" rx="16" fill="#18181b" stroke="#27272a" stroke-width="1"/>
      <circle cx="640" cy="312" r="20" fill="#a855f7" fill-opacity="0.2"/>
      <text x="640" y="318" fill="#c084fc" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="bold" text-anchor="middle">🎓</text>
      <text x="672" y="318" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="bold">Quiz Master</text>
      <text x="624" y="352" fill="#a1a1aa" font-family="system-ui, -apple-system, sans-serif" font-size="13">Dynamic AI quizzes generated from notes or textbooks.</text>
      <rect x="624" y="380" width="264" height="60" rx="8" fill="#27272a"/>
      <text x="640" y="408" fill="#e4e4e7" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="bold">Quantum Electrodynamics</text>
      <text x="640" y="426" fill="#a1a1aa" font-family="system-ui, -apple-system, sans-serif" font-size="11">15 Questions • 85% Mastery</text>
      <rect x="624" y="452" width="264" height="60" rx="8" fill="#27272a"/>
      <text x="640" y="480" fill="#e4e4e7" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="bold">Linear Algebra Matrix Transforms</text>
      <text x="640" y="498" fill="#a1a1aa" font-family="system-ui, -apple-system, sans-serif" font-size="11">20 Questions • 92% Mastery</text>
      <rect x="624" y="600" width="264" height="40" rx="8" fill="#a855f7"/>
      <text x="756" y="625" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="bold" text-anchor="middle">Take Quiz</text>

      <!-- Card 3 -->
      <rect x="936" y="272" width="312" height="416" rx="16" fill="#18181b" stroke="#27272a" stroke-width="1"/>
      <circle cx="976" cy="312" r="20" fill="#3b82f6" fill-opacity="0.2"/>
      <text x="976" y="318" fill="#60a5fa" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="bold" text-anchor="middle">📊</text>
      <text x="1008" y="318" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="bold">Analytics &amp; Streaks</text>
      <text x="960" y="352" fill="#a1a1aa" font-family="system-ui, -apple-system, sans-serif" font-size="13">Continuous progress logging &amp; mastery insights.</text>
      <rect x="960" y="380" width="264" height="120" rx="12" fill="#09090b" stroke="#27272a" stroke-width="1"/>
      <text x="980" y="415" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="bold">14 Days</text>
      <text x="980" y="438" fill="#22c55e" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="bold">🔥 Study Streak Active</text>
      <text x="980" y="475" fill="#a1a1aa" font-family="system-ui, -apple-system, sans-serif" font-size="12">Total Study Time: 34.5 hrs this week</text>
      <rect x="960" y="600" width="264" height="40" rx="8" fill="#3b82f6"/>
      <text x="1092" y="625" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="bold" text-anchor="middle">View Full Analytics</text>
    </svg>
  `;

  await sharp(Buffer.from(desktopSvg))
    .png({ quality: 100 })
    .toFile(path.join(publicDir, 'screenshot-desktop.png'));
  console.log('✓ Created screenshot-desktop.png (1280x720)');

  // 8. Mobile Screenshot (750x1334)
  const mobileSvg = `
    <svg width="750" height="1334" viewBox="0 0 750 1334" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="mBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#09090b"/>
          <stop offset="100%" stop-color="#18181b"/>
        </linearGradient>
        <linearGradient id="mAccentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#6366f1"/>
          <stop offset="100%" stop-color="#a855f7"/>
        </linearGradient>
      </defs>

      <!-- Background -->
      <rect width="750" height="1334" fill="url(#mBgGrad)"/>

      <!-- Status Bar -->
      <text x="40" y="44" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="bold">9:41</text>
      <rect x="670" y="28" width="36" height="18" rx="4" fill="none" stroke="#ffffff" stroke-width="2"/>
      <rect x="674" y="32" width="24" height="10" rx="2" fill="#ffffff"/>

      <!-- Header -->
      <rect x="32" y="80" width="686" height="70" rx="20" fill="#18181b" stroke="#27272a" stroke-width="1"/>
      <circle cx="72" cy="115" r="22" fill="#6366f1"/>
      <text x="110" y="122" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="bold">Academix Aletheon</text>
      <circle cx="670" cy="115" r="18" fill="#27272a"/>
      <text x="670" y="122" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="16" text-anchor="middle">⚙</text>

      <!-- Daily Streak Banner -->
      <rect x="32" y="174" width="686" height="140" rx="20" fill="url(#mAccentGrad)"/>
      <text x="64" y="224" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="bold">🔥 14-Day Study Streak!</text>
      <text x="64" y="264" fill="#ffffff" fill-opacity="0.85" font-family="system-ui, -apple-system, sans-serif" font-size="16">You are in the top 5% of productive researchers today.</text>

      <!-- Focus Timer Card -->
      <rect x="32" y="338" width="686" height="340" rx="20" fill="#18181b" stroke="#27272a" stroke-width="1"/>
      <text x="64" y="384" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="bold">⏱ Deep Focus Session</text>
      <text x="64" y="414" fill="#a1a1aa" font-family="system-ui, -apple-system, sans-serif" font-size="15">Adaptive Pomodoro + Ambient Soundscape</text>
      
      <circle cx="375" cy="510" r="70" fill="none" stroke="#6366f1" stroke-width="8" stroke-dasharray="320 100"/>
      <text x="375" y="522" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="34" font-weight="bold" text-anchor="middle">25:00</text>
      
      <rect x="64" y="600" width="622" height="54" rx="14" fill="#6366f1"/>
      <text x="375" y="634" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="bold" text-anchor="middle">Start Focus Flow</text>

      <!-- Quick Action Modules -->
      <text x="36" y="720" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="bold">Modules &amp; Tools</text>

      <!-- 2x2 grid -->
      <rect x="32" y="744" width="330" height="180" rx="18" fill="#18181b" stroke="#27272a" stroke-width="1"/>
      <circle cx="74" cy="786" r="22" fill="#a855f7" fill-opacity="0.2"/>
      <text x="74" y="793" fill="#c084fc" font-family="system-ui, -apple-system, sans-serif" font-size="20" text-anchor="middle">🎓</text>
      <text x="64" y="844" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="bold">Quiz Master</text>
      <text x="64" y="874" fill="#a1a1aa" font-family="system-ui, -apple-system, sans-serif" font-size="13">AI generated questions</text>

      <rect x="388" y="744" width="330" height="180" rx="18" fill="#18181b" stroke="#27272a" stroke-width="1"/>
      <circle cx="430" cy="786" r="22" fill="#3b82f6" fill-opacity="0.2"/>
      <text x="430" y="793" fill="#60a5fa" font-family="system-ui, -apple-system, sans-serif" font-size="20" text-anchor="middle">🔬</text>
      <text x="420" y="844" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="bold">Researchers</text>
      <text x="420" y="874" fill="#a1a1aa" font-family="system-ui, -apple-system, sans-serif" font-size="13">Deep STEM citations</text>

      <rect x="32" y="944" width="330" height="180" rx="18" fill="#18181b" stroke="#27272a" stroke-width="1"/>
      <circle cx="74" cy="986" r="22" fill="#ec4899" fill-opacity="0.2"/>
      <text x="74" y="993" fill="#f472b6" font-family="system-ui, -apple-system, sans-serif" font-size="20" text-anchor="middle">🧩</text>
      <text x="64" y="1044" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="bold">Puzzles</text>
      <text x="64" y="1074" fill="#a1a1aa" font-family="system-ui, -apple-system, sans-serif" font-size="13">Brain teaser challenges</text>

      <rect x="388" y="944" width="330" height="180" rx="18" fill="#18181b" stroke="#27272a" stroke-width="1"/>
      <circle cx="430" cy="986" r="22" fill="#22c55e" fill-opacity="0.2"/>
      <text x="430" y="993" fill="#4ade80" font-family="system-ui, -apple-system, sans-serif" font-size="20" text-anchor="middle">📅</text>
      <text x="420" y="1044" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="bold">Study Plan</text>
      <text x="420" y="1074" fill="#a1a1aa" font-family="system-ui, -apple-system, sans-serif" font-size="13">Smart task scheduler</text>

      <!-- Bottom Nav Bar -->
      <rect x="0" y="1234" width="750" height="100" fill="#09090b" stroke="#27272a" stroke-width="1"/>
      <text x="125" y="1285" fill="#6366f1" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="bold" text-anchor="middle">Home</text>
      <text x="290" y="1285" fill="#71717a" font-family="system-ui, -apple-system, sans-serif" font-size="14" text-anchor="middle">Focus</text>
      <text x="460" y="1285" fill="#71717a" font-family="system-ui, -apple-system, sans-serif" font-size="14" text-anchor="middle">Quizzes</text>
      <text x="625" y="1285" fill="#71717a" font-family="system-ui, -apple-system, sans-serif" font-size="14" text-anchor="middle">Profile</text>
    </svg>
  `;

  await sharp(Buffer.from(mobileSvg))
    .png({ quality: 100 })
    .toFile(path.join(publicDir, 'screenshot-mobile.png'));
  console.log('✓ Created screenshot-mobile.png (750x1334)');

  console.log('All PWA assets generated successfully!');
}

generateAssets().catch(console.error);
