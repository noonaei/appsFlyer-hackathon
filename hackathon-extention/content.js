// ================================
// Cross-Platform Hashtag Collector
// ================================

console.log('[EXT] content script loaded:', location.href);

// TEST FUNCTION - Make globally accessible FIRST
window.testExtension = function() {
  console.log('[EXT] TEST FUNCTION CALLED');
  console.log('[EXT] Current URL:', location.href);
};

// Helper to pierce shadow DOM
function getAllTextNodes(root) {
  const texts = [];
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );
  let node;
  while (node = walker.nextNode()) {
    texts.push(node.textContent);
  }
  return texts;
}

function extractHashtags(text) {
  if (!text) return [];
  const matches = text.match(/#[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
  
  // Filter out common false positives and meaningless hashtags
  const blacklist = new Set([
    // CSS/code IDs
    '#eee', '#fff', '#000',
    '#player', '#header', '#footer', '#main', '#content', '#sidebar', '#nav', '#menu',
    '#app', '#root', '#container', '#wrapper', '#section', '#article',
    '#comments', '#description', '#title', '#video', '#channel',
    '#default', '#rs', '#m', '#a', '#b', '#c', '#d', '#e', '#f',
    '#yt', '#ytd',
    // Common meaningless TikTok/social media hashtags
    '#fyp', '#foryou', '#foryoupage', '#viral', '#trending', '#explore', '#explorepage',
    '#fy', '#fyppage', '#fypシ', '#viraltiktok', '#viralvideos', '#tiktok', '#tiktoktrend',
    '#like', '#follow', '#comment', '#share', '#subscribe', '#views',
    '#reels', '#instagram', '#youtube', '#shorts', '#instagram', '#insta',
    '#meme', '#memes', '#funny', '#lol', '#lmao',
    '#duet', '#stitch', '#trend', '#challenge', '#dance',
    '#love', '#instagood', '#photooftheday', '#picoftheday',
    '#follow4follow', '#like4like', '#likeforlike', '#f4f', '#l4l',
    '#tagsforlike', '#tagsforfollow', '#follow2follow',
    '#blessed', '#motivation', '#inspiration', '#goals',
    '#nofilter', '#nomakeup', '#selfie', '#me', '#myself',
    '#notsponsored', '#ad', '#partner', '#collab',
    '#thefeed', '#foryoupage', '#moreforyou'
  ]);
  
  return matches
    .map(tag => tag.toLowerCase())
    .filter(tag => {
      const content = tag.substring(1);
      
      // Filter out hex color codes (6-8 chars of only 0-9 and a-f)
      const isHexColor = /^[0-9a-f]{6,8}$/.test(content);
      if (isHexColor) return false;
      
      // Filter out blacklisted hashtags
      if (blacklist.has(tag)) return false;
      
      // Filter out very short hashtags (likely CSS/code, not real hashtags)
      if (content.length <= 2) return false;
      if (content.length === 3 && !(/[0-9A-Z]/.test(content))) return false;
      
      return true;
    });
}

function emitHashtags(platformName, url, hashtags) {
  if (!hashtags.length) return;

  if (!window._globalSeen) window._globalSeen = new Set();

  // Create a unique key for each hashtag
  const fresh = hashtags.filter(h => {
    const key = `${platformName}:${url}:${h}`;
    if (window._globalSeen.has(key)) return false;
    window._globalSeen.add(key);
    return true;
  });

  if (!fresh.length) return;

  chrome.runtime.sendMessage({
    type: 'hashtag_signal',
    platform: platformName,
    hashtags: fresh,
    url,
    timestamp: Date.now()
  });

  console.log(`[EXT] ${platformName} hashtags emitted:`, fresh);
}

function observeChanges(el, callback) {
  const observer = new MutationObserver(() => {
    setTimeout(callback, 300);
  });
  observer.observe(el, { childList: true, subtree: true, characterData: true });
}

// --------- INSTAGRAM ---------
function handleInstagram() {
  const isPost = location.href.includes('/p/') || location.href.includes('/reel/');
  if (!isPost) return;

  console.log('[EXT] Instagram handler started');
  let hasScanned = false;

  const scanCaption = () => {
    let captionElement = null;
    
    const allDivs = document.querySelectorAll('article div');
    
    for (let div of allDivs) {
      const text = div.innerText || '';
      const childCount = div.children.length;
      
      if (text.includes('#') && 
          text.includes('\n') && 
          childCount < 20 && 
          text.length > 50 && 
          text.length < 2000 &&
          !text.includes('Suggestions') &&
          !text.includes('Follow')) {
        
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

    let captionText = captionElement.innerText || '';
    
    console.log('[EXT] Instagram: Found caption, scanning...');
    console.log('[EXT] Instagram: Caption preview:', captionText.substring(0, 100));

    const hashtags = extractHashtags(captionText);
    
    console.log('[EXT] Instagram: Hashtags found:', hashtags);
    
    if (hashtags.length > 0 && !hasScanned) {
      emitHashtags('instagram.com', location.href, hashtags);
      hasScanned = true;
    } else if (hashtags.length === 0) {
      setTimeout(scanCaption, 500);
    }
  };

  setTimeout(scanCaption, 1000);
}

// --------- YOUTUBE ---------
function handleYouTube() {
  if (!location.href.includes('/watch')) return;

  console.log('[EXT] YouTube handler started');
  let hasExtracted = false;

  const getVideoTitle = () => {
    const title = document.querySelector('h1 yt-formatted-string') ||
                  document.querySelector('h1.title') ||
                  document.querySelector('[id="title"] yt-formatted-string') ||
                  document.querySelector('ytd-video-primary-info-renderer h1');
    
    if (title) {
      return title.innerText || title.textContent || '';
    }
    
    const docTitle = document.title;
    return docTitle.replace(' - YouTube', '').trim();
  };

  const scanForHashtags = () => {
    // Try multiple selectors for the description area
    let descriptionArea = document.querySelector('ytd-video-primary-info-renderer') ||
                         document.querySelector('[id="info-section"]') ||
                         document.querySelector('[class*="description"]') ||
                         document.querySelector('yt-formatted-string[class*="description"]');
    
    // If still not found, look for the element containing the video metadata
    if (!descriptionArea) {
      descriptionArea = document.querySelector('ytd-watch-metadata') ||
                       document.querySelector('[role="region"]');
    }

    let allText = '';
    
    if (descriptionArea) {
      const walker = document.createTreeWalker(
        descriptionArea,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );
      
      let node;
      while (node = walker.nextNode()) {
        if (node.textContent.includes('#')) {
          allText += ' ' + node.textContent;
        }
      }
    }

    // If still nothing found, try scanning just for text with # symbols more broadly
    if (!allText) {
      console.log('[EXT] YouTube: Description area not found, trying broader search...');
      const allSpans = document.querySelectorAll('yt-formatted-string, span, div');
      for (let el of allSpans) {
        const text = el.innerText || el.textContent || '';
        if (text.includes('#') && text.length < 500 && !text.includes('Recommended')) {
          allText += ' ' + text;
        }
      }
    }

    const hashtags = extractHashtags(allText);
    return [...new Set(hashtags)];
  };

  const video = document.querySelector('video');
  if (video) {
    let videoDuration = 0;
    let watchThreshold = 0.5;

    video.addEventListener('loadedmetadata', () => {
      videoDuration = video.duration || 0;
      console.log('[EXT] YouTube: Video duration:', Math.round(videoDuration) + 's');
    });

    const checkInterval = setInterval(() => {
      if (hasExtracted) {
        clearInterval(checkInterval);
        return;
      }

      videoDuration = video.duration || videoDuration;
      if (videoDuration === 0) return;

      const percentWatched = video.currentTime / videoDuration;
      
      if (percentWatched >= watchThreshold && !hasExtracted) {
        console.log('[EXT] YouTube: Watched 50%+, extracting...');
        
        const hashtags = scanForHashtags();
        const title = getVideoTitle();
        
        // Always send the title
        const toSend = [title];
        
        // Add hashtags if found
        if (hashtags.length > 0) {
          console.log('[EXT] YouTube: Hashtags found!', hashtags);
          toSend.push(...hashtags);
        }
        
        console.log('[EXT] YouTube: Sending:', toSend);
        emitHashtags('youtube.com', location.href, toSend);
        
        hasExtracted = true;
        clearInterval(checkInterval);
      }
    }, 1000);
  }
}

// --------- TIKTOK ---------
function handleTikTok() {
  if (!location.href.includes('tiktok.com')) return;

  console.log('[EXT] TikTok handler started');
  
  const trackedVideos = new Set();

  const trackVideos = () => {
    const videos = document.querySelectorAll('video');
    console.log('[EXT] TikTok: Found', videos.length, 'videos');
    
    videos.forEach((videoElement, index) => {
      const videoId = videoElement.src || (videoElement.offsetTop + '_' + videoElement.offsetLeft);
      
      console.log('[EXT] TikTok: Processing video', index, 'ID:', videoId?.substring?.(0, 50));
      
      if (trackedVideos.has(videoId)) {
        console.log('[EXT] TikTok: Video already tracked, skipping');
        return;
      }
      trackedVideos.add(videoId);
      console.log('[EXT] TikTok: Added to tracked videos');

      let watchedTime = 0;
      let videoDuration = 0;
      let watchThreshold = 0.8;
      let hasExtracted = false;

      videoElement.addEventListener('loadedmetadata', () => {
        videoDuration = videoElement.duration || 0;
        console.log('[EXT] TikTok: loadedmetadata - duration:', Math.round(videoDuration) + 's');
      });

      videoElement.addEventListener('timeupdate', () => {
        watchedTime = videoElement.currentTime;
        
        if (videoDuration > 0) {
          const percentWatched = watchedTime / videoDuration;
          if (percentWatched >= watchThreshold && !hasExtracted) {
            console.log('[EXT] TikTok: 80% watched during playback');
            extractHashtagsFromVideo(videoElement);
            hasExtracted = true;
          }
        }
      });

      const checkInterval = setInterval(() => {
        if (hasExtracted) {
          clearInterval(checkInterval);
          return;
        }
        
        videoDuration = videoElement.duration || videoDuration;
        if (videoDuration === 0) return;
        
        const percentWatched = videoElement.currentTime / videoDuration;
        console.log('[EXT] TikTok: Periodic check -', Math.round(percentWatched * 100) + '%');
        
        if (percentWatched >= watchThreshold) {
          console.log('[EXT] TikTok: 80% watched (periodic check)');
          extractHashtagsFromVideo(videoElement);
          hasExtracted = true;
          clearInterval(checkInterval);
        }
      }, 1000);

      const checkWatchTime = () => {
        if (videoDuration === 0) return;
        
        const percentWatched = videoElement.currentTime / videoDuration;
        console.log('[EXT] TikTok: Pause/end - watched', Math.round(percentWatched * 100) + '%');

        if (percentWatched >= watchThreshold && !hasExtracted) {
          console.log('[EXT] TikTok: Extracting hashtags...');
          extractHashtagsFromVideo(videoElement);
          hasExtracted = true;
        }
      };

      videoElement.addEventListener('ended', checkWatchTime);
      videoElement.addEventListener('pause', checkWatchTime);
      
      console.log('[EXT] TikTok: Listeners attached to video', index);
    });
  };

  const extractHashtagsFromVideo = (videoElement) => {
    let captionContainer = videoElement.parentElement;
    for (let i = 0; i < 3; i++) {
      captionContainer = captionContainer?.parentElement;
    }

    if (!captionContainer) {
      console.log('[EXT] TikTok: Caption container not found');
      return;
    }

    const fullText = captionContainer.innerText || captionContainer.textContent || '';
    
    console.log('[EXT] TikTok: Found caption, preview:', fullText.substring(0, 100));

    const hashtags = extractHashtags(fullText);

    if (hashtags.length > 0) {
      console.log('[EXT] TikTok: Hashtags found!', hashtags);
      emitHashtags('tiktok.com', location.href, hashtags);
    } else {
      console.log('[EXT] TikTok: No hashtags found in caption');
    }
  };

  trackVideos();

  const observer = new MutationObserver(() => {
    trackVideos();
  });
  
  observer.observe(document.body, { childList: true, subtree: true });
}

// --------- REDDIT ---------
function handleReddit() {
  if (!location.href.includes('reddit.com')) return;

  console.log('[EXT] Reddit handler started');
  let hasExtracted = false;

  const extractSubreddits = () => {
    const urlMatch = location.href.match(/\/r\/([a-zA-Z0-9_]+)/);
    if (!urlMatch) {
      console.log('[EXT] Reddit: No subreddit in URL');
      return;
    }

    const subreddit = urlMatch[1];
    console.log('[EXT] Reddit: Found subreddit:', subreddit);

    const subreddits = new Set([subreddit]);

    const postContent = document.querySelector('[data-testid="post-container"]') || 
                        document.querySelector('article') ||
                        document.querySelector('[class*="Post"]');

    if (postContent) {
      const text = postContent.innerText || '';
      const matches = text.match(/r\/[a-zA-Z0-9_]+/g) || [];
      matches.forEach(match => {
        const subName = match.substring(2);
        subreddits.add(subName);
      });
    }

    const subredditArray = Array.from(subreddits);
    console.log('[EXT] Reddit: Subreddits found:', subredditArray);

    if (subredditArray.length > 0 && !hasExtracted) {
      emitHashtags('reddit.com', location.href, subredditArray);
      hasExtracted = true;
    }
  };

  setTimeout(extractSubreddits, 500);
}

// --------- TWITCH ---------
function handleTwitch() {
  console.log('[EXT] Twitch handler started');
  const seen = new Set();

  const scanStream = () => {
    const title = document.querySelector('[data-a-target="stream-title"]');
    const category = document.querySelector('[data-test-selector="channel-header"]');

    let text = '';
    if (title) text += ' ' + getAllTextNodes(title).join(' ');
    if (category) text += ' ' + getAllTextNodes(category).join(' ');

    const hashtags = extractHashtags(text);
    if (hashtags.length > 0) {
      emitHashtags('twitch.tv', location.href, hashtags);
    }
  };

  setTimeout(scanStream, 3000);
  setInterval(scanStream, 5000);
}

// --------- INITIALIZE ---------
function initAllPlatforms() {
  console.log('[EXT] Checking platforms for:', location.href);
  
  if (location.href.includes('instagram.com')) {
    console.log('[EXT] Detected Instagram');
    handleInstagram();
  }
  else if (location.href.includes('youtube.com')) {
    console.log('[EXT] Detected YouTube');
    handleYouTube();
  }
  else if (location.href.includes('tiktok.com')) {
    console.log('[EXT] Detected TikTok');
    handleTikTok();
  }
  else if (location.href.includes('reddit.com')) {
    console.log('[EXT] Detected Reddit');
    handleReddit();
  }
  else if (location.href.includes('twitch.tv')) {
    console.log('[EXT] Detected Twitch');
    handleTwitch();
  }
  else {
    console.log('[EXT] No platform detected');
  }
}

setTimeout(initAllPlatforms, 1500);

// Handle SPA navigation
let lastUrl = location.href;
setInterval(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    setTimeout(initAllPlatforms, 800);
  }
}, 1000);

console.log('[EXT] Type "testExtension()" in console to test');