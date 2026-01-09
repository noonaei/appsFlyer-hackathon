// ================================
// Cross-Platform Signal Collector
// ================================

console.log('[EXT] CONTENT SCRIPT LOADED');
document.body.style.border = '5px solid red';

const KIND_MAP = {
  video_titles: 'search_term',
  VideoTitles: 'search_term',
  creators: 'creators',
  Creators: 'creators',
  hashtag: 'hashtag',
  Hashtag: 'hashtag',
  Hashtags: 'hashtag',  // plural form
  SubReddits: 'channel',  // subreddits map to creators kind (will be converted to 'channel' in background)
  subreddits: 'channel'   // lowercase (if normalized)
};


const signalBatches = {
  youtube: {},
  instagram: {},
  tiktok: {},
  reddit: {},
  twitch: {}
};

/*now every platform looks like this:
      signalBatches.youtube = {
      hashtag: Set(),
      video_titles: Set(),
      creators: Set()
};*/ 

// Send batched signals to background every 5 seconds
setInterval(() => {
  const timestamp = new Date().toISOString();

  for (const [platform, kinds] of Object.entries(signalBatches)) {
    for (const [kind, labelSet] of Object.entries(kinds)) {
      if (!labelSet || labelSet.size === 0) continue;

      chrome.runtime.sendMessage({
        type: 'signal_batch',
        payload: {
          platform,
          kind,
          labels: Array.from(labelSet),
          timestamp
        }
      });

      // IMPORTANT: clear only AFTER sending
      labelSet.clear();
    }
  }
}, 5000);


function addSignal(platform, kind, labels) {
  const normalizedKind = KIND_MAP[kind] || kind.toLowerCase();

  if (!signalBatches[platform]) {
    signalBatches[platform] = {};
  }

  if (!signalBatches[platform][normalizedKind]) {
    signalBatches[platform][normalizedKind] = new Set();
  }

  const arr = Array.isArray(labels) ? labels : [labels];
  arr.forEach(l => l && signalBatches[platform][normalizedKind].add(l));
}

function splitTitleAndHashtags(text) {
  if (!text) return { title: null, hashtags: [] };

  const hashtags = extractHashtags(text);
  const title = text.replace(/#[a-zA-Z0-9_]+/g, '').trim();

  return {
    title: title.length ? title : null,
    hashtags
  };
}


function extractHashtags(text) {
  if (!text) return [];
  const matches = text.match(/#[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
  
  const blacklist = new Set([
    '#eee', '#fff', '#000', '#player', '#header', '#footer', '#main', '#content', '#sidebar',
    '#nav', '#menu', '#app', '#root', '#container', '#wrapper', '#section', '#article',
    '#comments', '#description', '#title', '#video', '#channel', '#default', '#rs', '#m',
    '#a', '#b', '#c', '#d', '#e', '#f', '#yt', '#ytd', '#fyp', '#foryou', '#foryoupage',
    '#viral', '#trending', '#explore', '#explorepage', '#fy', '#fyppage', '#fypシ',
    '#viraltiktok', '#viralvideos', '#tiktok', '#tiktoktrend', '#like', '#follow', '#comment',
    '#share', '#subscribe', '#views', '#reels', '#instagram', '#youtube', '#shorts', '#insta',
    '#meme', '#memes', '#funny', '#lol', '#lmao', '#duet', '#stitch', '#trend', '#challenge',
    '#dance', '#love', '#instagood', '#photooftheday', '#picoftheday', '#follow4follow',
    '#like4like', '#likeforlike', '#f4f', '#l4l', '#tagsforlike', '#tagsforfollow',
    '#follow2follow', '#blessed', '#motivation', '#inspiration', '#goals', '#nofilter',
    '#nomakeup', '#selfie', '#me', '#myself', '#notsponsored', '#ad', '#partner', '#collab',
    '#thefeed', '#moreforyou'
  ]);
  
  return matches
    .map(tag => tag.toLowerCase())
    .filter(tag => {
      const content = tag.substring(1);
      if (/^[0-9a-f]{6,8}$/.test(content)) return false;
      if (blacklist.has(tag)) return false;
      if (content.length <= 2) return false;
      if (content.length === 3 && !(/[0-9A-Z]/.test(content))) return false;
      return true;
    });
}

function getAllTextNodes(root) {
  const texts = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
  let node;
  while (node = walker.nextNode()) {
    texts.push(node.textContent);
  }
  return texts;
}

  

// --------- YOUTUBE ---------
function handleYouTube() {
  if (!location.href.includes('/watch') && !location.href.includes('/shorts')) return;
  console.log('[EXT] YouTube handler started');
  let hasExtracted = false;

  const getVideoTitle = () => {
    const title = document.querySelector('h1 yt-formatted-string') ||
                  document.querySelector('h1.title') ||
                  document.querySelector('[id="title"] yt-formatted-string');
    if (title) return title.innerText || title.textContent || '';
    return document.title.replace(' - YouTube', '').trim();
  };

  const getCreatorName = () => {
    // Mobile YouTube - look for the channel name in the bylines
    const channelName = document.querySelector('.slim-owner-channel-name');
    if (channelName) {
      const text = channelName.innerText?.trim() || 
                   channelName.textContent?.trim() ||
                   channelName.querySelector('span')?.innerText?.trim();
      if (text && text.length > 0) return text;
    }

    // Desktop YouTube - try multiple selectors
    const desktopChannel = document.querySelector('ytd-channel-name');
    if (desktopChannel) {
      const text = desktopChannel.innerText?.trim() || desktopChannel.textContent?.trim();
      if (text && text.length > 0) return text;
    }

    // Fallback: look for channel link
    const channelLink = document.querySelector('a[href*="/@"]') || 
                        document.querySelector('a[href*="/channel/"]');
    if (channelLink) {
      const text = channelLink.innerText?.trim() || channelLink.textContent?.trim();
      if (text && text.length > 0 && text.length < 100) return text;
    }

    return null;
  };

  const scanForHashtags = () => {
    let descriptionArea = document.querySelector('ytd-video-primary-info-renderer') ||
                         document.querySelector('ytd-watch-metadata');
    
    let allText = '';
    if (descriptionArea) {
      const walker = document.createTreeWalker(descriptionArea, NodeFilter.SHOW_TEXT, null, false);
      let node;
      while (node = walker.nextNode()) {
        if (node.textContent.includes('#')) {
          allText += ' ' + node.textContent;
        }
      }
    }

    const hashtags = extractHashtags(allText);
    return [...new Set(hashtags)];
  };

  const waitForVideo = setInterval(() => {
    const video = document.querySelector('video');
    if (!video) return;
    
    clearInterval(waitForVideo);
    console.log('[EXT] YouTube: Video found');
    let videoDuration = 0;

    video.addEventListener('loadedmetadata', () => {
      videoDuration = video.duration || 0;
      console.log('[EXT] YouTube: Duration:', Math.round(videoDuration) + 's');
    });

    const checkInterval = setInterval(() => {
      if (hasExtracted) {
        clearInterval(checkInterval);
        return;
      }

      videoDuration = video.duration || videoDuration;
      if (videoDuration === 0) return;

      const percentWatched = video.currentTime / videoDuration;
      
      if (percentWatched >= 0.5 && !hasExtracted) {
        console.log('[EXT] YouTube: 50%+ watched');
        
        const rawTitle = getVideoTitle();
        const { title, hashtags: titleHashtags } = splitTitleAndHashtags(rawTitle);
        const descriptionHashtags = scanForHashtags();
        const allHashtags = [...new Set([...titleHashtags, ...descriptionHashtags])];
        const creator = getCreatorName();
      
        
        if (creator && creator.length < 100) {
          addSignal('youtube', 'Creators', creator);
        }

        if (title) {
        addSignal('youtube', 'video_titles', title);
        }

        if (allHashtags.length > 0) {
        addSignal('youtube', 'hashtag', allHashtags);
        }
        
        hasExtracted = true;
        clearInterval(checkInterval);
      }
    }, 1000);
  }, 500);
}


// --------- INSTAGRAM ---------
function handleInstagram() {
  const isPost = location.href.includes('/p/') || location.href.includes('/reel/');
  if (!isPost) return;

  console.log('[EXT] Instagram handler started');
  let hasScanned = false;
  let scanAttempts = 0;

  const scanCaption = () => {
    scanAttempts++;
    if (scanAttempts > 10) {
      console.log('[EXT] Instagram: Max retries reached');
      return;
    }

    let captionElement = null;
    const allDivs = document.querySelectorAll('article div');
    
    for (let div of allDivs) {
      const text = div.innerText || '';
      if (text.includes('#') && text.includes('\n') && 
          div.children.length < 20 && text.length > 50 && text.length < 2000 &&
          !text.includes('Suggestions') && !text.includes('Follow')) {
        const rect = div.getBoundingClientRect();
        if (rect.width < 600) {
          captionElement = div;
          break;
        }
      }
    }

    if (!captionElement) {
      console.log('[EXT] Instagram: Caption not found, retrying...');
      setTimeout(scanCaption, 500);
      return;
    }

    if (hasScanned) {
      console.log('[EXT] Instagram: Already scanned');
      return;
    }

    let captionText = captionElement.innerText || '';
    const hashtags = extractHashtags(captionText);
    
    if (hashtags.length > 0) {
      console.log('[EXT] Instagram: Found hashtags:', hashtags);
      hashtags.forEach(tag => {
        addSignal('instagram', 'Hashtags', tag);
      });
      hasScanned = true;
    } else {
      console.log('[EXT] Instagram: No hashtags found, retrying...');
      setTimeout(scanCaption, 500);
    }
  };

  setTimeout(scanCaption, 1000);
}

// --------- TIKTOK ---------
function handleTikTok() {
  if (!location.href.includes('tiktok.com')) return;
  console.log('[EXT] TikTok handler started');
  
  const trackedVideos = new Set();

  const trackVideos = () => {
    const videos = document.querySelectorAll('video');
    
    videos.forEach((videoElement) => {
      const videoId = videoElement.src || (videoElement.offsetTop + '_' + videoElement.offsetLeft);
      if (trackedVideos.has(videoId)) return;
      
      trackedVideos.add(videoId);
      let hasExtracted = false;

      const checkInterval = setInterval(() => {
        if (hasExtracted) {
          clearInterval(checkInterval);
          return;
        }
        
        const videoDuration = videoElement.duration || 0;
        if (videoDuration === 0) return;
        
        const percentWatched = videoElement.currentTime / videoDuration;
        
        if (percentWatched >= 0.8) {
          let captionContainer = videoElement.parentElement;
          for (let i = 0; i < 3; i++) {
            captionContainer = captionContainer?.parentElement;
          }

          if (captionContainer) {
            const fullText = captionContainer.innerText || '';
            const hashtags = extractHashtags(fullText);

            if (hashtags.length > 0) {
              console.log('[EXT] TikTok: Found hashtags:', hashtags);
              hashtags.forEach(tag => {
                addSignal('tiktok', 'Hashtags', tag);
              });
            }
          }

          hasExtracted = true;
          clearInterval(checkInterval);
        }
      }, 1000);
    });
  };

  trackVideos();
  const observer = new MutationObserver(() => trackVideos());
  observer.observe(document.body, { childList: true, subtree: true });
}

// --------- REDDIT ---------
function handleReddit() {
  if (!location.href.includes('reddit.com')) return;
  console.log('[EXT] Reddit handler started');
  let hasExtracted = false;

  const extractSubreddits = () => {
    const urlMatch = location.href.match(/\/r\/([a-zA-Z0-9_]+)/);
    if (!urlMatch) return;

    const subreddits = new Set([urlMatch[1]]);
    const postContent = document.querySelector('[data-testid="post-container"]') || document.querySelector('article');

    if (postContent) {
      const matches = (postContent.innerText || '').match(/r\/[a-zA-Z0-9_]+/g) || [];
      matches.forEach(match => subreddits.add(match.substring(2)));
    }

    if (subreddits.size > 0 && !hasExtracted) {
      console.log('[EXT] Reddit: Found subreddits:', Array.from(subreddits));
      subreddits.forEach(sub => {
        addSignal('reddit', 'SubReddits', sub);
      });
      hasExtracted = true;
    }
  };

  setTimeout(extractSubreddits, 500);
}

// --------- TWITCH ---------
function handleTwitch() {
  console.log('[EXT] Twitch handler started');

  const scanStream = () => {
    const title = document.querySelector('[data-a-target="stream-title"]');
    const category = document.querySelector('[data-test-selector="channel-header"]');

    let text = '';
    if (title) text += ' ' + getAllTextNodes(title).join(' ');
    if (category) text += ' ' + getAllTextNodes(category).join(' ');

    const hashtags = extractHashtags(text);
    if (hashtags.length > 0) {
      hashtags.forEach(tag => {
        addSignal('twitch', 'Hashtags', tag);
      });
    }
  };

  setTimeout(scanStream, 3000);
  setInterval(scanStream, 5000);
}

// --------- INITIALIZE ---------
function initAllPlatforms() {
  console.log('[EXT] Checking platforms for:', location.href);
  
  if (location.href.includes('instagram.com')) {
    handleInstagram();
  }
  else if (location.href.includes('youtube.com')) {
    handleYouTube();
  }
  else if (location.href.includes('tiktok.com')) {
    handleTikTok();
  }
  else if (location.href.includes('reddit.com')) {
    handleReddit();
  }
  else if (location.href.includes('twitch.tv')) {
    handleTwitch();
  }
}

setTimeout(initAllPlatforms, 1500);

// Handle SPA navigation
let currentUrl = location.href;
setInterval(() => {
  if (location.href !== currentUrl) {
    currentUrl = location.href;
    console.log('[EXT] URL changed, reinitializing');
    setTimeout(initAllPlatforms, 800);
  }
}, 1000);