const CONTRIBUTOR_IDS = ["studentamb_2467", "studentamb_2475"];
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (iPad; CPU OS 18_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Mobile/15E148 Safari/604.1"
];
const REFERRERS = [
  "https://www.google.com/",
  "https://www.bing.com/",
  "https://www.linkedin.com/",
  "https://twitter.com/",
  "https://www.youtube.com/",
  "https://github.com/",
  ""
];
const LANGUAGES = [
  "en-US,en;q=0.9",
  "en-GB,en;q=0.9",
  "en-US,en;q=0.9,es;q=0.8",
  "en-US,en;q=0.9,fr;q=0.8"
];
const URLS = [
  "https://azure.microsoft.com",
  "https://azure.microsoft.com/free",
  "https://azure.microsoft.com/free/students",
  "https://code.visualstudio.com",
  "https://devblogs.microsoft.com",
  "https://developer.microsoft.com",
  "https://dotnet.microsoft.com",
  "https://learn.microsoft.com/developer",
  "https://microsoft.com/microsoft-cloud/blog",
  "https://microsoft.com/startups",
  "https://microsoft.com/startups/ai",
  "https://microsoft.com/startups/blog",
  "https://learn.microsoft.com/startups",
  "https://learn.microsoft.com/training/topics/startups",
  "https://imaginecup.microsoft.com",
  "https://copilot.microsoft.com",
  "https://microsoft.com/microsoft-copilot/for-individuals",
  "https://microsoft.com/microsoft-365-copilot",
  "https://microsoft.com/microsoft-365/copilot-learning-center",
  "https://learn.microsoft.com/copilot",
  "https://microsoft.com/microsoft-fabric",
  "https://community.fabric.microsoft.com",
  "https://blog.fabric.microsoft.com",
  "https://learn.microsoft.com/fabric",
  "https://microsoft.com/power-platform",
  "https://community.powerplatform.com",
  "https://powerbi.microsoft.com/blog",
  "https://learn.microsoft.com/power-platform",
  "https://learn.microsoft.com/power-automate",
  "https://learn.microsoft.com/power-bi",
  "https://learn.microsoft.com/power-apps",
  "https://learn.microsoft.com/power-pages",
  "https://events.microsoft.com",
  "https://learn.microsoft.com",
  "https://microsoft.com/insidetrack",
  "https://reactor.microsoft.com",
  "https://studentambassadors.microsoft.com",
  "https://techcommunity.microsoft.com"
];

function getRandomItems(arr, count) {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getBrowserHeaders() {
  const ua = getRandomItem(USER_AGENTS);
  const referrer = getRandomItem(REFERRERS);
  const lang = getRandomItem(LANGUAGES);
  const isMobile = ua.includes("iPhone") || ua.includes("iPad");
  const headers = {
    "User-Agent": ua,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": lang,
    "Accept-Encoding": "gzip, deflate, br",
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": referrer ? "cross-site" : "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1"
  };
  if (referrer) {
    headers.Referer = referrer;
  }
  if (ua.includes("Chrome") && !isMobile) {
    headers["Sec-CH-UA"] = '"Chromium";v="131", "Not_A Brand";v="24"';
    headers["Sec-CH-UA-Mobile"] = "?0";
    headers["Sec-CH-UA-Platform"] = ua.includes("Windows")
      ? '"Windows"'
      : ua.includes("Mac")
        ? '"macOS"'
        : '"Linux"';
  }
  return headers;
}

function stripLearnLocale(parsed) {
  if (parsed.hostname.toLowerCase() !== "learn.microsoft.com") {
    return;
  }

  const hasTrailingSlash = parsed.pathname.endsWith("/") && parsed.pathname !== "/";
  const segments = parsed.pathname.split("/").filter(Boolean);
  if (segments.length === 0) {
    return;
  }

  const first = segments[0];
  const localeSegment = /^[a-z]{2,3}-(?:[a-z]{2}|\d{3}|[a-z]{4})(?:-(?:[a-z]{2}|\d{3}))?$/i;
  if (!localeSegment.test(first)) {
    return;
  }

  segments.shift();
  parsed.pathname = `/${segments.join("/")}`;
  if (hasTrailingSlash && parsed.pathname !== "/") {
    parsed.pathname += "/";
  }
}

function buildTaggedUrl(url, contributorId) {
  const parsed = new URL(url);
  stripLearnLocale(parsed);
  parsed.searchParams.set("wt.mc_id", contributorId);
  return parsed.toString();
}

async function visitUrl(url, contributorId) {
  const taggedUrl = buildTaggedUrl(url, contributorId);
  try {
    const response = await fetch(taggedUrl, { headers: getBrowserHeaders() });
    console.log(`Visited: ${taggedUrl} - Status: ${response.status}`);
    return { url: taggedUrl, status: response.status };
  } catch (error) {
    console.log(`Error visiting ${taggedUrl}: ${error.message}`);
    return { url: taggedUrl, error: error.message };
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  const runProbability = Number.parseFloat(process.env.RUN_PROBABILITY ?? "0.6");
  if (Number.isFinite(runProbability) && Math.random() > runProbability) {
    console.log("Skipping this run (probabilistic)");
    return;
  }

  const jitterMaxMinutes = Number.parseInt(process.env.JITTER_MAX_MINUTES ?? "10", 10);
  if (Number.isFinite(jitterMaxMinutes) && jitterMaxMinutes > 0) {
    const jitterMs = Math.floor(Math.random() * jitterMaxMinutes * 60 * 1000);
    if (jitterMs > 0) {
      console.log(`Jitter: waiting ${jitterMs}ms`);
      await sleep(jitterMs);
    }
  }

  for (const contributorId of CONTRIBUTOR_IDS) {
    const randomUrl = getRandomItems(URLS, 1)[0];
    await visitUrl(randomUrl, contributorId);

    const delayMaxMs = Number.parseInt(process.env.PER_VISIT_DELAY_MAX_MS ?? "29000", 10);
    const delayMinMs = Number.parseInt(process.env.PER_VISIT_DELAY_MIN_MS ?? "1000", 10);
    if (Number.isFinite(delayMaxMs) && Number.isFinite(delayMinMs)) {
      const delayMs = Math.floor(Math.random() * delayMaxMs) + delayMinMs;
      await sleep(delayMs);
    }
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
