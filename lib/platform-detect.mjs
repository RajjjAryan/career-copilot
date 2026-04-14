// lib/platform-detect.mjs — URL → ATS platform identification
//
// detectPlatform(url) returns { name, autoApply, boardToken?, jobId?, company?, postingId?, applyUrl, manualReason? }

const PLATFORM_PATTERNS = [
  {
    name: 'greenhouse',
    patterns: [
      /(?:boards|job-boards)(?:\.eu)?\.greenhouse\.io\/(\w[\w-]*)\/jobs\/(\d+)/,
      /boards-api\.greenhouse\.io\/v1\/boards\/(\w[\w-]*)\/jobs\/(\d+)/,
    ],
    autoApply: true,
    extract(match) {
      return { boardToken: match[1], jobId: match[2] };
    },
  },
  {
    name: 'lever',
    patterns: [
      /jobs\.lever\.co\/([^/]+)\/([0-9a-f-]{36})/,
    ],
    autoApply: true,
    extract(match) {
      return { company: match[1], postingId: match[2] };
    },
  },
  {
    name: 'ashby',
    patterns: [/jobs\.ashbyhq\.com\/([^/]+)/],
    autoApply: false,
    manualReason: 'Ashby requires account login to submit applications',
  },
  {
    name: 'workday',
    patterns: [/(\w+)\.myworkdayjobs\.com/],
    autoApply: false,
    manualReason: 'Workday has aggressive bot detection — apply manually',
  },
  {
    name: 'workable',
    patterns: [/apply\.workable\.com\/([^/]+)/],
    autoApply: false,
    manualReason: 'Workable form automation planned for future release',
  },
  {
    name: 'smartrecruiters',
    patterns: [/jobs\.smartrecruiters\.com\/([^/]+)/],
    autoApply: false,
    manualReason: 'SmartRecruiters automation planned for future release',
  },
  {
    name: 'recruitee',
    patterns: [/(\w+)\.recruitee\.com/],
    autoApply: false,
    manualReason: 'Recruitee requires email verification',
  },
  {
    name: 'bamboohr',
    patterns: [/(\w+)\.bamboohr\.com\/careers/],
    autoApply: false,
    manualReason: 'BambooHR requires account creation',
  },
];

export function detectPlatform(url) {
  if (!url) return { name: 'unknown', autoApply: false, manualReason: 'No URL provided' };

  for (const platform of PLATFORM_PATTERNS) {
    for (const pattern of platform.patterns) {
      const match = url.match(pattern);
      if (match) {
        const result = {
          name: platform.name,
          autoApply: platform.autoApply,
          applyUrl: url,
          manualReason: platform.manualReason || null,
        };
        if (platform.extract) Object.assign(result, platform.extract(match));
        return result;
      }
    }
  }

  return { name: 'unknown', autoApply: false, applyUrl: url, manualReason: 'Unknown platform — apply manually' };
}
